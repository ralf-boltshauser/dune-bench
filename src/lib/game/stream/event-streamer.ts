/**
 * Event Streamer - Central hub for game event broadcasting
 *
 * Responsibilities:
 * - Broadcast events to subscribers (global and game-specific)
 * - Persist events for reconnection support
 * - Handle replay with proper buffering to prevent race conditions
 * - Manage subscriber lifecycle and cleanup
 *
 * Key improvements over previous version:
 * - UUID-based event IDs (no collision on restart)
 * - Buffered replay (prevents race conditions)
 * - Automatic cleanup of stale game entries
 * - Awaitable persistence option
 */

import type { StreamEvent, StreamEventType, EventSubscriber, Subscription } from './types';
import { generateEventId } from './utils/id-generator';
import { eventBufferManager } from './utils/event-buffer';
import { fileStore } from './persistence';
import type { IGameStore } from './persistence';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface EventStreamerConfig {
  /** Storage backend */
  store: IGameStore;
  /** Whether to await persistence before broadcast (safer but slower) */
  awaitPersistence: boolean;
  /** Time in ms after which inactive game entries are cleaned up */
  gameEntryTTL: number;
}

const DEFAULT_CONFIG: EventStreamerConfig = {
  store: fileStore,
  awaitPersistence: false,
  gameEntryTTL: 60 * 60 * 1000, // 1 hour
};

// =============================================================================
// TYPES
// =============================================================================

interface GameEntry {
  /** Subscribers for this game */
  subscribers: Map<string, EventSubscriber>;
  /** Next sequence number */
  nextSeq: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Whether sequence was initialized from persistence */
  seqInitialized: boolean;
}

// =============================================================================
// EVENT STREAMER
// =============================================================================

export class EventStreamer {
  private static instance: EventStreamer;

  private readonly config: EventStreamerConfig;
  private readonly globalSubscribers: Map<string, EventSubscriber> = new Map();
  private readonly gameEntries: Map<string, GameEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private subscriberCounter = 0;

  private constructor(config: Partial<EventStreamerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<EventStreamerConfig>): EventStreamer {
    if (!EventStreamer.instance) {
      EventStreamer.instance = new EventStreamer(config);
    }
    return EventStreamer.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    if (EventStreamer.instance) {
      EventStreamer.instance.destroy();
      EventStreamer.instance = null as unknown as EventStreamer;
    }
  }

  // ---------------------------------------------------------------------------
  // Event Emission
  // ---------------------------------------------------------------------------

  /**
   * Emit an event to all subscribers and persist it
   *
   * @param type - Event type
   * @param gameId - Game this event belongs to
   * @param data - Event payload
   * @returns The created event
   */
  async emit<T = unknown>(
    type: StreamEventType,
    gameId: string,
    data: T
  ): Promise<StreamEvent<T>> {
    // Get or create game entry
    const entry = await this.getOrCreateGameEntry(gameId);

    // Create event with unique ID and sequence
    const event: StreamEvent<T> = {
      id: generateEventId(),
      type,
      gameId,
      timestamp: Date.now(),
      data,
      seq: entry.nextSeq++,
    };

    // Update last activity
    entry.lastActivity = Date.now();

    // Persist event
    if (this.config.awaitPersistence) {
      await this.persistEvent(gameId, event);
    } else {
      // Fire and forget, but log errors
      this.persistEvent(gameId, event).catch((error) => {
        console.error(`[EventStreamer] Failed to persist event ${event.id}:`, error);
      });
    }

    // Broadcast to subscribers
    this.broadcast(event, entry);

    return event;
  }

  /**
   * Persist event to storage
   */
  private async persistEvent(gameId: string, event: StreamEvent): Promise<void> {
    await this.config.store.appendEvent(gameId, event);
  }

  /**
   * Broadcast event to all relevant subscribers
   */
  private broadcast(event: StreamEvent, gameEntry: GameEntry): void {
    // Global subscribers
    for (const [id, callback] of this.globalSubscribers) {
      this.safeCallback(callback, event, `global:${id}`);
    }

    // Game-specific subscribers
    for (const [id, callback] of gameEntry.subscribers) {
      this.safeCallback(callback, event, `game:${event.gameId}:${id}`);
    }
  }

  /**
   * Safely invoke a subscriber callback
   */
  private safeCallback(
    callback: EventSubscriber,
    event: StreamEvent,
    subscriberId: string
  ): void {
    try {
      callback(event);
    } catch (error) {
      console.error(`[EventStreamer] Error in subscriber ${subscriberId}:`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Game Entry Management
  // ---------------------------------------------------------------------------

  /**
   * Get or create a game entry, initializing sequence from persistence
   */
  private async getOrCreateGameEntry(gameId: string): Promise<GameEntry> {
    let entry = this.gameEntries.get(gameId);

    if (!entry) {
      entry = {
        subscribers: new Map(),
        nextSeq: 1,
        lastActivity: Date.now(),
        seqInitialized: false,
      };
      this.gameEntries.set(gameId, entry);
    }

    // Initialize sequence from persistence if not done yet
    if (!entry.seqInitialized) {
      try {
        const lastSeq = await this.config.store.getLastSequence(gameId);
        entry.nextSeq = lastSeq + 1;
        entry.seqInitialized = true;
      } catch (error) {
        console.error(
          `[EventStreamer] Failed to initialize sequence for ${gameId}:`,
          error
        );
        // Continue with default sequence
        entry.seqInitialized = true;
      }
    }

    return entry;
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to all events (global subscription)
   *
   * @param callback - Event handler
   * @returns Subscription handle with unsubscribe method
   */
  subscribe(callback: EventSubscriber): Subscription {
    const id = `global_${++this.subscriberCounter}`;
    this.globalSubscribers.set(id, callback);

    return {
      unsubscribe: () => {
        this.globalSubscribers.delete(id);
      },
    };
  }

  /**
   * Subscribe to events for a specific game with replay support
   *
   * This method handles the race condition where live events may arrive
   * while replaying missed events from persistence. Events are buffered
   * during replay and delivered in correct order.
   *
   * @param gameId - Game to subscribe to
   * @param callback - Event handler
   * @param afterEventId - Optional: replay events after this ID
   * @returns Subscription handle with unsubscribe method
   */
  async subscribeToGame(
    gameId: string,
    callback: EventSubscriber,
    afterEventId?: string
  ): Promise<Subscription> {
    const entry = await this.getOrCreateGameEntry(gameId);
    const subscriberId = `sub_${++this.subscriberCounter}`;

    // Create buffered subscriber if we need replay
    if (afterEventId) {
      const startSeq = await this.getSeqForEventId(gameId, afterEventId);

      const buffered = eventBufferManager.createBufferedSubscriber(
        subscriberId,
        callback,
        startSeq
      );

      // Register the buffered handler
      entry.subscribers.set(subscriberId, buffered.handler);

      // Start replay
      buffered.startReplay();

      try {
        // Get missed events from persistence
        const missedEvents = await this.config.store.getEventsSince(
          gameId,
          afterEventId
        );

        // Deliver missed events
        for (const event of missedEvents) {
          this.safeCallback(callback, event, subscriberId);
        }
      } catch (error) {
        console.error(
          `[EventStreamer] Failed to replay events for ${subscriberId}:`,
          error
        );
      } finally {
        // End replay - flush any buffered live events
        buffered.endReplay();
      }

      return {
        unsubscribe: () => {
          entry.subscribers.delete(subscriberId);
          buffered.cleanup();
          this.cleanupGameEntryIfEmpty(gameId);
        },
      };
    }

    // No replay needed - direct subscription
    entry.subscribers.set(subscriberId, callback);

    return {
      unsubscribe: () => {
        entry.subscribers.delete(subscriberId);
        this.cleanupGameEntryIfEmpty(gameId);
      },
    };
  }

  /**
   * Get sequence number for an event ID
   */
  private async getSeqForEventId(
    gameId: string,
    eventId: string
  ): Promise<number> {
    try {
      const events = await this.config.store.getAllEvents(gameId);
      const event = events.find((e) => e.id === eventId);
      return event?.seq ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up game entry if it has no subscribers
   */
  private cleanupGameEntryIfEmpty(gameId: string): void {
    const entry = this.gameEntries.get(gameId);
    if (entry && entry.subscribers.size === 0) {
      // Don't delete immediately - keep for a while in case of reconnection
      // The cleanup interval will handle it if it stays empty
    }
  }

  // ---------------------------------------------------------------------------
  // Event Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Get events since a specific event ID
   */
  async getEventsSince(gameId: string, lastEventId: string): Promise<StreamEvent[]> {
    return this.config.store.getEventsSince(gameId, lastEventId);
  }

  /**
   * Get the last event ID for a game
   */
  async getLastEventId(gameId: string): Promise<string | null> {
    return this.config.store.getLastEventId(gameId);
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get global subscriber count
   */
  getSubscriberCount(): number {
    return this.globalSubscribers.size;
  }

  /**
   * Get subscriber count for a specific game
   */
  getGameSubscriberCount(gameId: string): number {
    return this.gameEntries.get(gameId)?.subscribers.size ?? 0;
  }

  /**
   * Get statistics about the streamer
   */
  getStats(): {
    globalSubscribers: number;
    activeGames: number;
    totalGameSubscribers: number;
    bufferStats: { activeBuffers: number; totalBufferedEvents: number };
  } {
    let totalGameSubscribers = 0;
    for (const entry of this.gameEntries.values()) {
      totalGameSubscribers += entry.subscribers.size;
    }

    return {
      globalSubscribers: this.globalSubscribers.size,
      activeGames: this.gameEntries.size,
      totalGameSubscribers,
      bufferStats: eventBufferManager.getStats(),
    };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Start periodic cleanup of stale game entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up stale game entries (no subscribers, past TTL)
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();

    for (const [gameId, entry] of this.gameEntries) {
      const isStale =
        entry.subscribers.size === 0 &&
        now - entry.lastActivity > this.config.gameEntryTTL;

      if (isStale) {
        this.gameEntries.delete(gameId);
      }
    }
  }

  /**
   * Destroy the streamer (cleanup resources)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.globalSubscribers.clear();
    this.gameEntries.clear();
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const eventStreamer = EventStreamer.getInstance();

// Re-export types for convenience
export type { StreamEvent, StreamEventType, EventSubscriber, Subscription };
