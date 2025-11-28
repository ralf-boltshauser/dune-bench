/**
 * Event Buffer - Handles event buffering for reconnection scenarios
 *
 * Solves the race condition where live events arrive while replaying
 * missed events from persistence. Buffers live events and delivers
 * them in correct order after replay completes.
 */

import type { StreamEvent, EventSubscriber } from '../types';

/**
 * Buffer state for a single subscriber
 */
interface BufferState {
  /** Whether replay is in progress */
  isReplaying: boolean;
  /** Events received during replay */
  bufferedEvents: StreamEvent[];
  /** Last delivered sequence number */
  lastDeliveredSeq: number;
  /** The actual subscriber callback */
  callback: EventSubscriber;
}

/**
 * Manages event buffering during replay for multiple subscribers
 */
export class EventBufferManager {
  private buffers: Map<string, BufferState> = new Map();

  /**
   * Create a buffered subscriber that handles replay correctly
   *
   * @param subscriberId - Unique ID for this subscriber
   * @param callback - The actual event handler
   * @param startSeq - Starting sequence number (events <= this are skipped)
   * @returns Wrapped callback and control functions
   */
  createBufferedSubscriber(
    subscriberId: string,
    callback: EventSubscriber,
    startSeq: number = 0
  ): {
    handler: EventSubscriber;
    startReplay: () => void;
    endReplay: () => void;
    cleanup: () => void;
  } {
    const state: BufferState = {
      isReplaying: false,
      bufferedEvents: [],
      lastDeliveredSeq: startSeq,
      callback,
    };

    this.buffers.set(subscriberId, state);

    return {
      /**
       * Handler to use for live events
       */
      handler: (event: StreamEvent) => {
        this.handleEvent(subscriberId, event);
      },

      /**
       * Call before starting replay
       */
      startReplay: () => {
        state.isReplaying = true;
        state.bufferedEvents = [];
      },

      /**
       * Call after replay is complete to flush buffered events
       */
      endReplay: () => {
        state.isReplaying = false;
        this.flushBuffer(subscriberId);
      },

      /**
       * Clean up when subscriber disconnects
       */
      cleanup: () => {
        this.buffers.delete(subscriberId);
      },
    };
  }

  /**
   * Handle an incoming event for a subscriber
   */
  private handleEvent(subscriberId: string, event: StreamEvent): void {
    const state = this.buffers.get(subscriberId);
    if (!state) return;

    // Skip events we've already seen
    if (event.seq <= state.lastDeliveredSeq) {
      return;
    }

    if (state.isReplaying) {
      // Buffer events during replay
      state.bufferedEvents.push(event);
    } else {
      // Deliver immediately
      this.deliverEvent(state, event);
    }
  }

  /**
   * Deliver a single event to subscriber
   */
  private deliverEvent(state: BufferState, event: StreamEvent): void {
    try {
      state.callback(event);
      state.lastDeliveredSeq = event.seq;
    } catch (error) {
      console.error('[EventBuffer] Error in subscriber callback:', error);
    }
  }

  /**
   * Flush buffered events after replay completes
   */
  private flushBuffer(subscriberId: string): void {
    const state = this.buffers.get(subscriberId);
    if (!state) return;

    // Sort by sequence number to ensure order
    const events = state.bufferedEvents.sort((a, b) => a.seq - b.seq);

    // Deliver buffered events, skipping any already delivered during replay
    for (const event of events) {
      if (event.seq > state.lastDeliveredSeq) {
        this.deliverEvent(state, event);
      }
    }

    // Clear buffer
    state.bufferedEvents = [];
  }

  /**
   * Get buffer statistics for monitoring
   */
  getStats(): {
    activeBuffers: number;
    totalBufferedEvents: number;
  } {
    let totalBufferedEvents = 0;
    for (const state of this.buffers.values()) {
      totalBufferedEvents += state.bufferedEvents.length;
    }

    return {
      activeBuffers: this.buffers.size,
      totalBufferedEvents,
    };
  }
}

/**
 * Singleton instance for global buffer management
 */
export const eventBufferManager = new EventBufferManager();
