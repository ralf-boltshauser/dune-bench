/**
 * Game Runner
 *
 * High-level orchestrator that sets up and runs complete Dune games
 * with Claude agents playing each faction.
 */

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
  createClaudeAgentProvider,
  type ClaudeAgentConfig,
} from "./claude-provider";
import { GameLogger, createLogger } from "./logger";

// =============================================================================
// TYPES
// =============================================================================

export interface GameRunnerConfig {
  /** Factions to include in the game */
  factions: Faction[];
  /** Maximum turns before game ends */
  maxTurns?: number;
  /** Whether to use advanced rules */
  advancedRules?: boolean;
  /** Agent configuration */
  agentConfig?: ClaudeAgentConfig;
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
    >
  > &
    Pick<GameRunnerConfig, "gameId">;
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

  constructor(config: GameRunnerConfig) {
    if (config.factions.length < 2) {
      throw new Error("At least 2 factions are required");
    }

    this.config = {
      factions: config.factions,
      maxTurns: config.maxTurns ?? 10,
      advancedRules: config.advancedRules ?? true,
      agentConfig: config.agentConfig ?? {},
    };
    this.onEvent = config.onEvent;
    this.onStateUpdate = config.onStateUpdate;
    this.logger = createLogger(this.config.agentConfig.verbose ?? true);

    // Phase control options
    this.onlyPhases = config.onlyPhases;
    this.stopAfter = config.stopAfter;
    this.skipSetup = config.skipSetup ?? false;
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

    // Log game start with colored output
    this.logger.gameStart(this.config.factions);

    // Create agent provider
    const agentProvider = createClaudeAgentProvider(initialState, {
      ...this.config.agentConfig,
      verbose: this.config.agentConfig.verbose ?? true,
    });

    // Create phase manager
    const phaseManager = new PhaseManager(agentProvider);

    // Register all phase handlers
    phaseManager.registerHandlers(createAllPhaseHandlers());

    // Add event listener
    phaseManager.addEventListener((event) => {
      this.events.push(event);
      this.logEvent(event);
      if (this.onEvent) {
        this.onEvent(event);
      }
    });

    // Build phase run options
    const runOptions: GameRunOptions = {
      onlyPhases: this.onlyPhases,
      stopAfter: this.stopAfter,
      skipSetup: this.skipSetup,
    };

    // Run the game
    const result = await phaseManager.runGame(initialState, runOptions);

    // Store final state
    this.currentState = result.finalState;

    // Log summary
    this.logSummary(result);

    return result;
  }

  /**
   * Get the current game state
   */
  getState(): GameState | null {
    // Try to get from agent provider first (most up-to-date)
    if (this.phaseManager) {
      // Access agentProvider through the phase manager's private property
      // This is a workaround since agentProvider is private
      // In a more ideal architecture, PhaseManager would expose getState()
      const phaseManagerInternal = this.phaseManager as unknown as {
        agentProvider?: { getState?: () => GameState };
      };
      if (phaseManagerInternal.agentProvider?.getState) {
        return phaseManagerInternal.agentProvider.getState();
      }
    }
    return this.currentState;
  }

  /**
   * Run a single turn (for testing/debugging).
   */
  async runSingleTurn(state: GameState): Promise<GameState> {
    const agentProvider = createClaudeAgentProvider(
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
  config?: Partial<ClaudeAgentConfig>
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
  agentConfig?: ClaudeAgentConfig;
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
  const agentProvider = createClaudeAgentProvider(initialState, {
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
