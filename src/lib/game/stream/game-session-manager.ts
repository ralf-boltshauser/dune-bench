/**
 * Game Session Manager - Manages active game sessions
 *
 * Responsibilities:
 * - Create and track game sessions
 * - Emit lifecycle events (created, started, completed, error)
 * - Periodic state persistence
 * - Automatic cleanup of completed/stale sessions
 *
 * Key improvements:
 * - UUID-based game IDs
 * - Automatic cleanup of completed sessions
 * - TTL-based cleanup for stale sessions
 * - Cleaner metadata initialization
 */

import { GameRunner, type GameRunnerConfig } from '../agent/game-runner';
import type { GameState } from '../types';
import { Phase } from '../types';
import { eventStreamer } from './event-streamer';
import { GameLifecycleEvent, WrapperEvent, type GameMetadata, type GameSessionState } from './types';
import { gameStore } from './game-store';
import { generateGameId } from './utils/id-generator';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface SessionManagerConfig {
  /** Interval for periodic state saves (ms) */
  stateSaveInterval: number;
  /** Time to keep completed sessions before cleanup (ms) */
  completedSessionTTL: number;
  /** Time to keep stale sessions (no activity) before cleanup (ms) */
  staleSessionTTL: number;
  /** Interval for cleanup checks (ms) */
  cleanupInterval: number;
}

const DEFAULT_CONFIG: SessionManagerConfig = {
  stateSaveInterval: 5000, // 5 seconds
  completedSessionTTL: 5 * 60 * 1000, // 5 minutes
  staleSessionTTL: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 60 * 1000, // 1 minute
};

// =============================================================================
// TYPES
// =============================================================================

export interface GameSession {
  gameId: string;
  gameRunner: GameRunner;
  status: 'created' | 'running' | 'paused' | 'completed' | 'error';
  createdAt: number;
  lastActivity: number;
  lastStateSave: number;
  error?: string;
}

// =============================================================================
// SESSION MANAGER
// =============================================================================

export class GameSessionManager {
  private static instance: GameSessionManager;

  private readonly config: SessionManagerConfig;
  private readonly sessions: Map<string, GameSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SessionManagerConfig>): GameSessionManager {
    if (!GameSessionManager.instance) {
      GameSessionManager.instance = new GameSessionManager(config);
    }
    return GameSessionManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    if (GameSessionManager.instance) {
      GameSessionManager.instance.destroy();
      GameSessionManager.instance = null as unknown as GameSessionManager;
    }
  }

  // ---------------------------------------------------------------------------
  // Session Creation
  // ---------------------------------------------------------------------------

  /**
   * Create a new game session and start the game
   *
   * @param config - Game runner configuration (without callbacks)
   * @returns The new game ID
   */
  createSession(
    config: Omit<GameRunnerConfig, 'onEvent' | 'onStateUpdate' | 'gameId'>
  ): string {
    const gameId = generateGameId();
    const now = Date.now();

    // Create game runner with event streaming callbacks
    const gameRunner = new GameRunner({
      ...config,
      gameId,
      onEvent: (event) => {
        this.handlePhaseEvent(gameId, event);
      },
      onStateUpdate: (state) => {
        this.handleStateUpdate(gameId, state);
      },
    });

    // Create session
    const session: GameSession = {
      gameId,
      gameRunner,
      status: 'created',
      createdAt: now,
      lastActivity: now,
      lastStateSave: 0,
    };

    this.sessions.set(gameId, session);

    // Emit GAME_CREATED event
    void eventStreamer.emit(GameLifecycleEvent.GAME_CREATED, gameId, {
      gameId,
      factions: config.factions,
      maxTurns: config.maxTurns ?? 10,
      message: 'Game session created',
    });

    // Save initial metadata
    this.saveInitialMetadata(gameId, config).catch((error) => {
      console.error(`[SessionManager] Failed to save initial metadata for ${gameId}:`, error);
    });

    // Start the game in background
    console.log(`[SessionManager] Starting game ${gameId}...`);
    this.runGame(session).catch((error) => {
      console.error(`[SessionManager] Game ${gameId} failed:`, error);
    });

    return gameId;
  }

  /**
   * Save initial metadata for a new game
   */
  private async saveInitialMetadata(
    gameId: string,
    config: Omit<GameRunnerConfig, 'onEvent' | 'onStateUpdate' | 'gameId'>
  ): Promise<void> {
    const metadata: GameMetadata = {
      gameId,
      factions: config.factions,
      status: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      turn: 0,
      phase: Phase.SETUP,
      winner: null,
    };

    await gameStore.saveGameMetadata(gameId, metadata);
  }

  // ---------------------------------------------------------------------------
  // Game Execution
  // ---------------------------------------------------------------------------

  /**
   * Run the game in background
   */
  private async runGame(session: GameSession): Promise<void> {
    try {
      // Small delay to allow SSE connections to establish
      await new Promise((resolve) => setTimeout(resolve, 200));

      session.status = 'running';
      session.lastActivity = Date.now();

      // Emit game started
      await eventStreamer.emit(GameLifecycleEvent.GAME_STARTED, session.gameId, {
        gameId: session.gameId,
        message: 'Game started',
      });

      // Run the game
      const result = await session.gameRunner.runGame();

      // Mark completed
      session.status = 'completed';
      session.lastActivity = Date.now();

      // Save final state
      const finalState = session.gameRunner.getState();
      if (finalState) {
        await this.saveState(session.gameId, finalState);
      }

      // Emit completed event
      await eventStreamer.emit(GameLifecycleEvent.GAME_COMPLETED, session.gameId, {
        gameId: session.gameId,
        result: {
          winner: result.winner,
          totalTurns: result.totalTurns,
        },
      });

      console.log(`[SessionManager] Game ${session.gameId} completed successfully`);
    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.lastActivity = Date.now();

      // Emit error event
      await eventStreamer.emit(GameLifecycleEvent.GAME_ERROR, session.gameId, {
        gameId: session.gameId,
        error: session.error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      console.error(`[SessionManager] Game ${session.gameId} error:`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle phase events from game runner
   */
  private handlePhaseEvent(gameId: string, event: unknown): void {
    const session = this.sessions.get(gameId);
    if (session) {
      session.lastActivity = Date.now();
    }

    // Wrap in PHASE_EVENT and emit
    void eventStreamer.emit(WrapperEvent.PHASE_EVENT, gameId, {
      gameId,
      event,
    });
  }

  /**
   * Handle state updates from game runner
   */
  private handleStateUpdate(gameId: string, state: GameState): void {
    const session = this.sessions.get(gameId);
    if (!session) return;

    session.lastActivity = Date.now();

    // Emit state update event (lightweight, just key info)
    void eventStreamer.emit(WrapperEvent.GAME_STATE_UPDATE, gameId, {
      gameId,
      state: {
        turn: state.turn,
        phase: state.phase,
      },
    });

    // Save state periodically
    const now = Date.now();
    if (now - session.lastStateSave > this.config.stateSaveInterval) {
      this.saveState(gameId, state).catch((error) => {
        console.error(`[SessionManager] Failed to save state for ${gameId}:`, error);
      });
      session.lastStateSave = now;
    }
  }

  /**
   * Save game state and update metadata
   */
  private async saveState(gameId: string, state: GameState): Promise<void> {
    await Promise.all([
      gameStore.saveState(gameId, state),
      gameStore.updateMetadataFromState(gameId, state),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Session Access
  // ---------------------------------------------------------------------------

  /**
   * Get a session by ID
   */
  getSession(gameId: string): GameSession | undefined {
    return this.sessions.get(gameId);
  }

  /**
   * Get all active sessions
   */
  getSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session state (lightweight)
   */
  getSessionState(gameId: string): GameSessionState | undefined {
    const session = this.sessions.get(gameId);
    if (!session) return undefined;

    return {
      gameId: session.gameId,
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      lastStateSave: session.lastStateSave,
    };
  }

  /**
   * Check if a session exists
   */
  hasSession(gameId: string): boolean {
    return this.sessions.has(gameId);
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  /**
   * Remove a session (manual cleanup)
   */
  removeSession(gameId: string): boolean {
    return this.sessions.delete(gameId);
  }

  /**
   * Pause a game (if supported)
   */
  async pauseSession(gameId: string): Promise<boolean> {
    const session = this.sessions.get(gameId);
    if (!session || session.status !== 'running') {
      return false;
    }

    // TODO: Implement pause logic in GameRunner
    session.status = 'paused';
    session.lastActivity = Date.now();

    await eventStreamer.emit(GameLifecycleEvent.GAME_PAUSED, gameId, {
      gameId,
      message: 'Game paused',
    });

    return true;
  }

  /**
   * Resume a paused game
   */
  async resumeSession(gameId: string): Promise<boolean> {
    const session = this.sessions.get(gameId);
    if (!session || session.status !== 'paused') {
      return false;
    }

    // TODO: Implement resume logic in GameRunner
    session.status = 'running';
    session.lastActivity = Date.now();

    await eventStreamer.emit(GameLifecycleEvent.GAME_RESUMED, gameId, {
      gameId,
      message: 'Game resumed',
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupSessions();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up completed and stale sessions
   */
  private cleanupSessions(): void {
    const now = Date.now();

    for (const [gameId, session] of this.sessions) {
      // Clean up completed sessions after TTL
      if (
        (session.status === 'completed' || session.status === 'error') &&
        now - session.lastActivity > this.config.completedSessionTTL
      ) {
        console.log(`[SessionManager] Cleaning up completed session ${gameId}`);
        this.sessions.delete(gameId);
        continue;
      }

      // Clean up stale sessions (no activity for too long)
      if (now - session.lastActivity > this.config.staleSessionTTL) {
        console.log(`[SessionManager] Cleaning up stale session ${gameId}`);
        this.sessions.delete(gameId);
      }
    }
  }

  /**
   * Get statistics about sessions
   */
  getStats(): {
    total: number;
    byStatus: Record<GameSession['status'], number>;
  } {
    const byStatus: Record<GameSession['status'], number> = {
      created: 0,
      running: 0,
      paused: 0,
      completed: 0,
      error: 0,
    };

    for (const session of this.sessions.values()) {
      byStatus[session.status]++;
    }

    return {
      total: this.sessions.size,
      byStatus,
    };
  }

  /**
   * Destroy the manager (cleanup resources)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.sessions.clear();
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const gameSessionManager = GameSessionManager.getInstance();
