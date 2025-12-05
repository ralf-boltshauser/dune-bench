/**
 * Game Runner
 *
 * High-level orchestrator that sets up and runs complete Dune games
 * with Azure OpenAI agents playing each faction.
 */

// Ensure environment variables are loaded
import './env-loader';

import { createAllPhaseHandlers } from "../phases/handlers";
import {
  PhaseManager,
  type GameResult,
  type GameRunOptions,
  type PhaseEventListener,
} from "../phases/phase-manager";
import type { PhaseEvent } from "../phases/types";
import { createGameState, type CreateGameOptions } from "../state";
import { Faction, Phase, type GameState, type WinResult } from "../types";
import {
  createAgentProvider,
  type AgentConfig,
} from "./azure-provider";
import { GameLogger, createLogger } from "./logger";
import { MetricsCollector } from "../metrics/metrics-collector";
import { metricsStore } from "../metrics/storage";
import type { GameMetrics } from "../metrics/types";

// =============================================================================
// TYPES
// =============================================================================

export interface GameRunnerConfig {
  /** Factions to include in the game */
  factions: Faction[];
  /** Maximum turns before game ends */
  maxTurns?: number;
  /** Whether to use advanced rules (deprecated: always true, ignored if set) */
  advancedRules?: boolean;
  /** Agent configuration */
  agentConfig?: AgentConfig;
  /** Event listener for game events */
  onEvent?: PhaseEventListener;
  /** Called when game state updates */
  onStateUpdate?: (state: GameState) => void;
  /** Run only specific phases (for debugging) */
  onlyPhases?: Phase[];
  /** Stop after this phase completes (for debugging) */
  stopAfter?: Phase;
  /** Skip setup phase, use default values */
  skipSetup?: boolean;
  /** Game ID to use (overrides auto-generated ID) */
  gameId?: string;
  /** Enable metrics collection (default: false) */
  enableMetrics?: boolean;
  /** Model name for metrics (required if enableMetrics is true) */
  modelName?: string;
  /** Save metrics to storage after game (default: false) */
  saveMetrics?: boolean;
}

export interface GameSummary {
  winner: WinResult | null;
  totalTurns: number;
  factions: Faction[];
  finalScores: Record<Faction, number>;
  events: PhaseEvent[];
}

// =============================================================================
// GAME RUNNER
// =============================================================================

/**
 * High-level game runner that orchestrates complete Dune games.
 */
export class GameRunner {
  private config: Required<
    Omit<
      GameRunnerConfig,
      | "onEvent"
      | "onStateUpdate"
      | "onlyPhases"
      | "stopAfter"
      | "skipSetup"
      | "gameId"
      | "enableMetrics"
      | "modelName"
      | "saveMetrics"
    >
  > &
    Pick<GameRunnerConfig, "gameId" | "enableMetrics" | "modelName" | "saveMetrics">;
  private onEvent?: PhaseEventListener;
  private onStateUpdate?: (state: GameState) => void;
  private events: PhaseEvent[] = [];
  private logger: GameLogger;
  /** Phase control for debugging */
  private onlyPhases?: Phase[];
  private stopAfter?: Phase;
  private skipSetup: boolean;
  private currentState: GameState | null = null;
  private phaseManager: PhaseManager | null = null;
  /** Metrics collector (optional) */
  private metricsCollector: MetricsCollector | null = null;
  /** Whether to save metrics to storage */
  private shouldSaveMetrics: boolean = false;

  constructor(config: GameRunnerConfig) {
    if (config.factions.length < 2) {
      throw new Error("At least 2 factions are required");
    }

    this.config = {
      factions: config.factions,
      maxTurns: config.maxTurns ?? 10,
      advancedRules: true, // Always use advanced rules
      agentConfig: config.agentConfig ?? {},
      enableMetrics: config.enableMetrics,
      modelName: config.modelName,
      saveMetrics: config.saveMetrics,
    };
    this.onEvent = config.onEvent;
    this.onStateUpdate = config.onStateUpdate;
    this.logger = createLogger(this.config.agentConfig.verbose ?? true);

    // Phase control options
    this.onlyPhases = config.onlyPhases;
    this.stopAfter = config.stopAfter;
    this.skipSetup = config.skipSetup ?? false;

    // Store saveMetrics flag (collector will be created in runGame when we have gameId)
    this.shouldSaveMetrics = config.saveMetrics ?? false;

    // Warn if enableMetrics is true but modelName is missing
    if (config.enableMetrics && !config.modelName) {
      console.warn(
        "[GameRunner] enableMetrics is true but modelName is not provided. Metrics collection will be disabled."
      );
    }
  }

  /**
   * Run a complete game and return the result.
   */
  async runGame(): Promise<GameResult> {
    // Create initial game state
    const gameOptions: CreateGameOptions = {
      factions: this.config.factions,
      maxTurns: this.config.maxTurns,
      advancedRules: this.config.advancedRules,
    };
    const initialState = createGameState(gameOptions);

    // Override gameId if provided (for session management)
    if (this.config.gameId) {
      initialState.gameId = this.config.gameId;
    }

    return this.runGameFromState(initialState);
  }

  /**
   * Run a game from an existing state (for resuming games).
   */
  async runGameFromState(initialState: GameState): Promise<GameResult> {
    // Ensure gameId matches if provided
    if (this.config.gameId) {
      initialState.gameId = this.config.gameId;
    }

    // Initialize metrics collector if enabled
    if (this.config.enableMetrics && this.config.modelName) {
      try {
        this.metricsCollector = new MetricsCollector(
          initialState.gameId,
          this.config.modelName
        );
        // startGame is now async - await it to ensure subscription is ready
        // This ensures metrics collection starts before the game begins
        await this.metricsCollector.startGame(initialState.config);
      } catch (error) {
        console.warn(
          `[GameRunner] Failed to start metrics collection:`,
          error
        );
        // Continue without metrics collection
        this.metricsCollector = null;
      }
    }

    // Log game start with colored output
    // Check if resuming from an existing state
    const isResuming = initialState.setupComplete && initialState.turn > 0;
    if (isResuming) {
      this.logger.gameStart(Array.from(initialState.factions.keys()));
      console.log(
        `  📂 Resuming from Turn ${initialState.turn}, Phase: ${initialState.phase}\n`
      );
    } else {
      this.logger.gameStart(this.config.factions);
    }

    // Create agent provider
    const agentProvider = createAgentProvider(initialState, {
      ...this.config.agentConfig,
      verbose: this.config.agentConfig.verbose ?? true,
    });

    // Create phase manager and store it so getState() can access it
    this.phaseManager = new PhaseManager(agentProvider);

    // Register all phase handlers
    this.phaseManager.registerHandlers(createAllPhaseHandlers());

    // Add event listener
    this.phaseManager.addEventListener((event) => {
      this.events.push(event);
      this.logEvent(event);
      if (this.onEvent) {
        this.onEvent(event);
      }
    });

    // Build phase run options
    // Skip setup if resuming from an existing state
    const runOptions: GameRunOptions = {
      onlyPhases: this.onlyPhases,
      stopAfter: this.stopAfter,
      skipSetup: this.skipSetup || (initialState.setupComplete && initialState.turn > 0),
    };

    // Run the game
    const result = await this.phaseManager.runGame(initialState, runOptions);

    // Store final state
    this.currentState = result.finalState;

    // Record game end and save metrics if collector is active
    if (this.metricsCollector) {
      try {
        this.metricsCollector.recordGameEnd(result);
        const metrics = this.metricsCollector.getMetrics();

        if (this.shouldSaveMetrics) {
          try {
            await metricsStore.saveGameMetrics(metrics);
          } catch (error) {
            console.warn(
              `[GameRunner] Failed to save metrics to storage:`,
              error
            );
            // Continue - metrics are still available via getMetrics()
          }
        }
      } catch (error) {
        console.warn(
          `[GameRunner] Error recording game end metrics:`,
          error
        );
      }
    }

    // Log summary
    this.logSummary(result);

    return result;
  }

  /**
   * Get the current game state
   * 
   * CRITICAL: This method is used by the frontend to get the latest state.
   * We prioritize the agent provider's state (which is synced from PhaseManager),
   * but fall back to currentState if the phase manager isn't available.
   * 
   * Note: During game execution, the agent provider's state is kept in sync
   * with the authoritative state from PhaseManager via SynchronizedStateManager.
   */
  getState(): GameState | null {
    // Try to get from agent provider first (most up-to-date during game execution)
    // The agent provider's state is synced from PhaseManager's authoritative state
    if (this.phaseManager) {
      // Access agentProvider through the phase manager's private property
      // This is a workaround since agentProvider is private
      // In a more ideal architecture, PhaseManager would expose getState()
      const phaseManagerInternal = this.phaseManager as unknown as {
        agentProvider?: { getState?: () => GameState };
      };
      if (phaseManagerInternal.agentProvider?.getState) {
        const agentState = phaseManagerInternal.agentProvider.getState();
        if (agentState) {
          return agentState;
        }
      }
    }
    // Fall back to stored state (set at game end)
    return this.currentState;
  }

  /**
   * Run a single turn (for testing/debugging).
   */
  async runSingleTurn(state: GameState): Promise<GameState> {
    const agentProvider = createAgentProvider(
      state,
      this.config.agentConfig
    );
    const phaseManager = new PhaseManager(agentProvider);

    phaseManager.registerHandlers(createAllPhaseHandlers());

    phaseManager.addEventListener((event) => {
      this.logEvent(event);
      if (this.onEvent) {
        this.onEvent(event);
      }
    });

    const result = await phaseManager.runTurn(state);
    return result.state;
  }

  /**
   * Log a game event to console using the colorful logger.
   */
  private logEvent(event: PhaseEvent): void {
    const type = event.type;

    // Handle turn events
    if (type === "TURN_STARTED") {
      // Extract turn number from event data or message
      const turnMatch = event.message.match(/Turn (\d+)/i);
      const turn = turnMatch ? parseInt(turnMatch[1], 10) : 1;
      this.logger.turnStart(turn, this.config.maxTurns);
      return;
    }

    // Handle phase events (exact match to avoid matching SETUP_STEP etc)
    if (type === "PHASE_STARTED") {
      // Extract phase name: "setup phase started" -> "setup"
      const phase = event.message
        .replace(/ phase started$/i, "")
        .replace(/ phase$/i, "")
        .toUpperCase();
      this.logger.phaseStart(phase);
      return;
    }

    if (type === "PHASE_ENDED") {
      // Extract phase name: "setup phase ended" -> "setup"
      const phase = event.message
        .replace(/ phase ended$/i, "")
        .replace(/ phase$/i, "");
      this.logger.phaseEnd(phase);
      return;
    }

    // Skip GAME_ENDED as we handle it in logSummary
    if (type === "GAME_ENDED") {
      return;
    }

    // Handle other events with appropriate emojis
    const emoji = this.getEventEmoji(type);
    this.logger.event(event.message, emoji);
  }

  /**
   * Get an emoji for event types.
   */
  private getEventEmoji(type: string): string {
    if (type.includes("STORM")) return "🌪️";
    if (type.includes("SPICE")) return "🟡";
    if (type.includes("BATTLE")) return "⚔️";
    if (type.includes("ALLIANCE")) return "🤝";
    if (
      type.includes("VICTORY") ||
      type.includes("WIN") ||
      type.includes("ENDED")
    )
      return "🏆";
    if (type.includes("SHIP")) return "🚀";
    if (type.includes("MOVE")) return "👣";
    if (type.includes("BID") || type.includes("AUCTION")) return "💰";
    if (type.includes("REVIV")) return "💫";
    if (type.includes("TRAITOR")) return "🗡️";
    if (type.includes("PREDICT")) return "🔮";
    return "📌";
  }

  /**
   * Log game summary using the colorful logger.
   */
  private logSummary(result: GameResult): void {
    const winners = result.winner?.winners ?? null;
    this.logger.gameEnd(winners, result.totalTurns);
  }

  /**
   * Get a summary of the game.
   */
  getSummary(result: GameResult): GameSummary {
    const finalScores: Record<Faction, number> = {} as Record<Faction, number>;
    for (const [faction, state] of result.finalState.factions) {
      finalScores[faction] = state.spice;
    }

    return {
      winner: result.winner,
      totalTurns: result.totalTurns,
      factions: this.config.factions,
      finalScores,
      events: this.events,
    };
  }

  /**
   * Get collected metrics (available after game completes).
   * Returns null if metrics collection was not enabled.
   */
  getMetrics(): GameMetrics | null {
    return this.metricsCollector?.getMetrics() ?? null;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create and run a game with the given configuration.
 */
export async function runDuneGame(
  config: GameRunnerConfig
): Promise<GameResult> {
  const runner = new GameRunner(config);
  return runner.runGame();
}

/**
 * Quick start a 2-player game with Atreides vs Harkonnen.
 */
export async function runQuickGame(
  config?: Partial<AgentConfig>
): Promise<GameResult> {
  return runDuneGame({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    maxTurns: 5,
    agentConfig: config,
  });
}

/**
 * Options for running from a loaded state.
 */
export interface RunFromStateOptions {
  agentConfig?: AgentConfig;
  onEvent?: PhaseEventListener;
  onlyPhases?: Phase[];
  stopAfter?: Phase;
}

/**
 * Run a game from a pre-existing state (loaded from snapshot).
 * This allows resuming games or jumping to specific phases for testing.
 */
export async function runFromState(
  initialState: GameState,
  options: RunFromStateOptions = {}
): Promise<GameResult> {
  const factions = Array.from(initialState.factions.keys());
  const logger = createLogger(options.agentConfig?.verbose ?? true);

  // Log start
  logger.gameStart(factions);
  console.log(
    `  📂 Resuming from Turn ${initialState.turn}, Phase: ${initialState.phase}\n`
  );

  // Create agent provider with loaded state
  const agentProvider = createAgentProvider(initialState, {
    ...options.agentConfig,
    verbose: options.agentConfig?.verbose ?? true,
  });

  // Create phase manager
  const phaseManager = new PhaseManager(agentProvider);

  // Register all phase handlers
  phaseManager.registerHandlers(createAllPhaseHandlers());

  // Add event listener
  if (options.onEvent) {
    phaseManager.addEventListener(options.onEvent);
  }

  // Add default event logging
  phaseManager.addEventListener((event) => {
    const type = event.type;
    if (type === "TURN_STARTED") {
      const turnMatch = event.message.match(/Turn (\d+)/i);
      const turn = turnMatch ? parseInt(turnMatch[1], 10) : 1;
      logger.turnStart(turn, initialState.config.maxTurns);
    } else if (type === "PHASE_STARTED") {
      const phase = event.message.replace(/ phase started$/i, "").toUpperCase();
      logger.phaseStart(phase);
    } else if (type === "PHASE_ENDED") {
      const phase = event.message.replace(/ phase ended$/i, "");
      logger.phaseEnd(phase);
    } else if (type !== "GAME_ENDED") {
      logger.event(event.message, "📌");
    }
  });

  // Build run options
  const runOptions: GameRunOptions = {
    onlyPhases: options.onlyPhases,
    stopAfter: options.stopAfter,
    skipSetup: initialState.setupComplete, // Skip setup if already done
  };

  // Run the game from loaded state
  const result = await phaseManager.runGame(initialState, runOptions);

  // Log summary
  const winners = result.winner?.winners ?? null;
  logger.gameEnd(winners, result.totalTurns);

  return result;
}
