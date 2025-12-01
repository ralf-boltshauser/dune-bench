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

import { GameRunner, type GameRunnerConfig } from "../agent/game-runner";
import { serializeGameState } from "../state/serialize";
import type { GameState } from "../types";
import { Faction, Phase } from "../types";
import { eventStreamer } from "./event-streamer";
import { gameStore } from "./game-store";
import {
  GameLifecycleEvent,
  WrapperEvent,
  type GameMetadata,
  type GameSessionState,
} from "./types";
import { generateGameId } from "./utils/id-generator";

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
  status: "created" | "running" | "paused" | "completed" | "error";
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
  static getInstance(
    config?: Partial<SessionManagerConfig>
  ): GameSessionManager {
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
    config: Omit<GameRunnerConfig, "onEvent" | "onStateUpdate" | "gameId">
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
      status: "created",
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
      message: "Game session created",
    });

    // Save initial metadata
    this.saveInitialMetadata(gameId, config).catch((error) => {
      console.error(
        `[SessionManager] Failed to save initial metadata for ${gameId}:`,
        error
      );
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
    config: Omit<GameRunnerConfig, "onEvent" | "onStateUpdate" | "gameId">
  ): Promise<void> {
    const metadata: GameMetadata = {
      gameId,
      factions: config.factions,
      status: "created",
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
      // Delay to allow SSE connections to establish before game starts
      // This ensures UI can connect and receive events from the start
      await new Promise((resolve) => setTimeout(resolve, 500));

      session.status = "running";
      session.lastActivity = Date.now();

      // Emit game started
      await eventStreamer.emit(
        GameLifecycleEvent.GAME_STARTED,
        session.gameId,
        {
          gameId: session.gameId,
          message: "Game started",
        }
      );

      // Run the game
      // Note: State will be emitted via onStateUpdate callback and with every phase event
      const result = await session.gameRunner.runGame();

      // Mark completed
      session.status = "completed";
      session.lastActivity = Date.now();

      // Save final state
      const finalState = session.gameRunner.getState();
      if (finalState) {
        await this.saveState(session.gameId, finalState);
      }

      // Emit completed event
      await eventStreamer.emit(
        GameLifecycleEvent.GAME_COMPLETED,
        session.gameId,
        {
          gameId: session.gameId,
          result: {
            winner: result.winner,
            totalTurns: result.totalTurns,
          },
        }
      );

      console.log(
        `[SessionManager] Game ${session.gameId} completed successfully`
      );
    } catch (error) {
      session.status = "error";
      session.error = error instanceof Error ? error.message : "Unknown error";
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
   * Also emits full game state with each event for immediate frontend updates
   */
  private handlePhaseEvent(gameId: string, event: unknown): void {
    const session = this.sessions.get(gameId);
    if (session) {
      session.lastActivity = Date.now();
    }

    // Wrap in PHASE_EVENT and emit
    void eventStreamer
      .emit(WrapperEvent.PHASE_EVENT, gameId, {
        gameId,
        event,
      })
      .then(() => {
        const subscriberCount = eventStreamer.getGameSubscriberCount(gameId);
        if (subscriberCount > 0) {
          console.log(
            `[SessionManager] Emitted PHASE_EVENT for ${gameId}, ${subscriberCount} subscriber(s)`
          );
        } else {
          console.warn(
            `[SessionManager] Emitted PHASE_EVENT for ${gameId} but NO SUBSCRIBERS!`
          );
        }
      })
      .catch((error) => {
        console.error(
          `[SessionManager] Failed to emit PHASE_EVENT for ${gameId}:`,
          error
        );
      });

    // Also emit full game state with every phase event for immediate frontend updates
    // This ensures the frontend always has the latest state for visualization
    if (session?.gameRunner) {
      const currentState = session.gameRunner.getState();
      if (currentState) {
        // Serialize state to JSON-compatible object (Maps become {__type: 'Map', entries: [...]})
        const serialized = serializeGameState(currentState);
        const stateObject = JSON.parse(serialized) as GameState;

        // Emit full state update event so frontend can update immediately
        void eventStreamer
          .emit(WrapperEvent.GAME_STATE_UPDATE, gameId, {
            gameId,
            state: stateObject,
          })
          .then(() => {
            const subscriberCount =
              eventStreamer.getGameSubscriberCount(gameId);
            if (subscriberCount > 0) {
              console.log(
                `[SessionManager] Emitted GAME_STATE_UPDATE for ${gameId}, ${subscriberCount} subscriber(s)`
              );
            } else {
              console.warn(
                `[SessionManager] Emitted GAME_STATE_UPDATE for ${gameId} but NO SUBSCRIBERS!`
              );
            }
          })
          .catch((error) => {
            console.error(
              `[SessionManager] Failed to emit GAME_STATE_UPDATE for ${gameId}:`,
              error
            );
          });
      } else {
        console.warn(
          `[SessionManager] No state available from gameRunner for ${gameId}`
        );
      }
    } else {
      console.warn(
        `[SessionManager] No session or gameRunner for ${gameId} when handling phase event`
      );
    }
  }

  /**
   * Handle state updates from game runner
   */
  private handleStateUpdate(gameId: string, state: GameState): void {
    const session = this.sessions.get(gameId);
    if (!session) return;

    session.lastActivity = Date.now();

    // Serialize state to JSON-compatible object (Maps become {__type: 'Map', entries: [...]})
    // This allows the frontend to deserialize it back to GameState with Maps restored
    const serialized = serializeGameState(state);
    const stateObject = JSON.parse(serialized) as GameState;

    // Emit full state update event so frontend can display forces immediately
    void eventStreamer.emit(WrapperEvent.GAME_STATE_UPDATE, gameId, {
      gameId,
      state: stateObject,
    });

    // Save state periodically
    const now = Date.now();
    if (now - session.lastStateSave > this.config.stateSaveInterval) {
      this.saveState(gameId, state).catch((error) => {
        console.error(
          `[SessionManager] Failed to save state for ${gameId}:`,
          error
        );
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
    if (!session || session.status !== "running") {
      return false;
    }

    // TODO(#pause-resume): Implement pause logic in GameRunner
    // Currently only updates session status and emits event, but doesn't pause actual game execution
    session.status = "paused";
    session.lastActivity = Date.now();

    await eventStreamer.emit(GameLifecycleEvent.GAME_PAUSED, gameId, {
      gameId,
      message: "Game paused",
    });

    return true;
  }

  /**
   * Resume a paused game
   */
  async resumeSession(gameId: string): Promise<boolean> {
    const session = this.sessions.get(gameId);
    if (!session || session.status !== "paused") {
      return false;
    }

    // TODO(#pause-resume): Implement resume logic in GameRunner
    // Currently only updates session status and emits event, but doesn't resume actual game execution
    session.status = "running";
    session.lastActivity = Date.now();

    await eventStreamer.emit(GameLifecycleEvent.GAME_RESUMED, gameId, {
      gameId,
      message: "Game resumed",
    });

    return true;
  }

  /**
   * Resume a game from persisted state (for games that stopped/crashed).
   * Loads the game state from storage and continues execution.
   */
  async resumeGameFromState(gameId: string): Promise<boolean> {
    // Check if session already exists
    if (this.sessions.has(gameId)) {
      console.log(
        `[SessionManager] Game ${gameId} already has an active session`
      );
      return false;
    }

    // Load state from storage
    const state = await gameStore.loadState(gameId);
    if (!state) {
      console.log(`[SessionManager] No saved state found for game ${gameId}`);
      return false;
    }

    // Load metadata to get config
    const metadata = await gameStore.getGameMetadata(gameId);
    if (!metadata) {
      console.log(`[SessionManager] No metadata found for game ${gameId}`);
      return false;
    }

    // Check if game is already completed
    if (state.winner) {
      console.log(`[SessionManager] Game ${gameId} is already completed`);
      return false;
    }

    const now = Date.now();

    // Create game runner with loaded state
    const gameRunner = new GameRunner({
      factions: metadata.factions as Faction[],
      maxTurns: state.config.maxTurns,
      advancedRules: state.config.advancedRules,
      gameId,
      agentConfig: {
        verbose: false, // Reduce console noise
      },
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
      status: "created",
      createdAt: metadata.createdAt,
      lastActivity: now,
      lastStateSave: now,
    };

    this.sessions.set(gameId, session);

    // Emit GAME_RESUMED event
    await eventStreamer.emit(GameLifecycleEvent.GAME_RESUMED, gameId, {
      gameId,
      message: "Game resumed from saved state",
      turn: state.turn,
      phase: state.phase,
    });

    // Start the game from loaded state in background
    console.log(
      `[SessionManager] Resuming game ${gameId} from Turn ${state.turn}, Phase ${state.phase}...`
    );
    this.runGameFromState(session, state).catch((error) => {
      console.error(`[SessionManager] Resumed game ${gameId} failed:`, error);
    });

    return true;
  }

  /**
   * Run the game from a loaded state
   */
  private async runGameFromState(
    session: GameSession,
    initialState: GameState
  ): Promise<void> {
    try {
      // Delay to allow SSE connections to establish before game starts
      await new Promise((resolve) => setTimeout(resolve, 500));

      session.status = "running";
      session.lastActivity = Date.now();

      // Emit game started
      await eventStreamer.emit(
        GameLifecycleEvent.GAME_STARTED,
        session.gameId,
        {
          gameId: session.gameId,
          message: "Game resumed and started",
        }
      );

      // Emit initial state update so frontend knows the game has resumed
      const serialized = serializeGameState(initialState);
      const stateObject = JSON.parse(serialized) as GameState;
      await eventStreamer.emit(WrapperEvent.GAME_STATE_UPDATE, session.gameId, {
        gameId: session.gameId,
        state: stateObject,
      });

      // Run the game from loaded state
      const result = await session.gameRunner.runGameFromState(initialState);

      // Mark completed
      session.status = "completed";
      session.lastActivity = Date.now();

      // Save final state
      const finalState = session.gameRunner.getState();
      if (finalState) {
        await this.saveState(session.gameId, finalState);
      }

      // Emit completed event
      await eventStreamer.emit(
        GameLifecycleEvent.GAME_COMPLETED,
        session.gameId,
        {
          gameId: session.gameId,
          result: {
            winner: result.winner,
            totalTurns: result.totalTurns,
          },
        }
      );

      console.log(
        `[SessionManager] Resumed game ${session.gameId} completed successfully`
      );
    } catch (error) {
      session.status = "error";
      session.error = error instanceof Error ? error.message : "Unknown error";
      session.lastActivity = Date.now();

      // Emit error event
      await eventStreamer.emit(GameLifecycleEvent.GAME_ERROR, session.gameId, {
        gameId: session.gameId,
        error: session.error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      console.error(
        `[SessionManager] Resumed game ${session.gameId} error:`,
        error
      );
    }
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
        (session.status === "completed" || session.status === "error") &&
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
    byStatus: Record<GameSession["status"], number>;
  } {
    const byStatus: Record<GameSession["status"], number> = {
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
