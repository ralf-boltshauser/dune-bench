/**
 * Metrics Types & Interfaces
 *
 * Type definitions for the metrics collection system.
 * These types are used by MetricsCollector to track game performance.
 */

import type { Faction, Phase, WinResult } from "../types";

// =============================================================================
// TOOL CALL METRIC
// =============================================================================

/**
 * Tracks individual tool calls made by agents during the game.
 */
export interface ToolCallMetric {
  /** Name of the tool called */
  toolName: string;

  /** Whether the tool call succeeded */
  success: boolean;

  /** Error information if the call failed */
  error?: {
    code: string;
    message: string;
  };

  /** Which faction made the call */
  faction: Faction;

  /** Which phase it occurred in */
  phase: Phase;

  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Game identifier */
  gameId: string;
}

// =============================================================================
// GAME METRICS
// =============================================================================

/**
 * Complete metrics for a single game execution.
 */
export interface GameMetrics {
  /** Unique game identifier */
  gameId: string;

  /** LLM model used (e.g., "gpt-4", "claude-3.5-sonnet") */
  model: string;

  /** Which factions played */
  factions: Faction[];

  /** Game winner (null if no winner) */
  winner: WinResult | null;

  /** Number of turns completed */
  turns: number;

  /** Game execution time in milliseconds */
  duration: number;

  /** API usage statistics (optional) */
  apiCost?: {
    tokens: number;
    cost: number;
  };

  /** All tool calls made during the game */
  toolCalls: ToolCallMetric[];

  /** Game start timestamp */
  startTime: number;

  /** Game end timestamp */
  endTime: number;
}

// =============================================================================
// FACTION METRICS
// =============================================================================

/**
 * Metrics aggregated per faction.
 */
export interface FactionMetrics {
  /** The faction */
  faction: Faction;

  /** Final spice count at game end */
  finalSpice: number;

  /** Number of strongholds controlled at game end */
  strongholdsControlled: number;

  /** Total number of tool calls made */
  toolCallCount: number;

  /** Number of failed tool calls */
  toolFailureCount: number;

  /** Number of invalid actions attempted */
  invalidActionCount: number;

  /** Number of wins (for aggregated stats across multiple games) */
  wins: number;
}

// =============================================================================
// BENCHMARK CONFIGURATION
// =============================================================================

/**
 * Configuration for running benchmarks.
 */
export interface BenchmarkConfig {
  /** LLM model to test */
  model: string;

  /** How many games to run */
  numGames: number;

  /** Which factions to include */
  factions: Faction[];

  /** Maximum turns per game (optional) */
  maxTurns?: number;

  /** Where to save results (optional) */
  outputDir?: string;

  /** Run games in parallel (future feature) */
  parallel?: boolean;
}

// =============================================================================
// AGGREGATED METRICS
// =============================================================================

/**
 * Aggregated statistics across multiple games.
 */
export interface AggregatedMetrics {
  /** Total number of games */
  totalGames: number;

  /** Win rate per faction (0-1) */
  winRates: Record<Faction, number>;

  /** Average number of turns */
  averageTurns: number;

  /** Average game duration in milliseconds */
  averageDuration: number;

  /** Tool call statistics */
  toolCallStats: {
    total: number;
    failures: number;
    failureRate: number;
    byTool: Record<string, { total: number; failures: number }>;
  };

  /** Error counts by error code */
  errorBreakdown: Record<string, number>;

  /** Per-faction metrics */
  factionMetrics: Record<Faction, FactionMetrics>;
}

// =============================================================================
// BENCHMARK RESULTS
// =============================================================================

/**
 * Results from a benchmark run.
 */
export interface BenchmarkResults {
  /** Unique benchmark identifier */
  benchmarkId: string;

  /** Configuration used */
  config: BenchmarkConfig;

  /** Individual game results */
  games: GameMetrics[];

  /** Aggregated statistics */
  aggregated: AggregatedMetrics;

  /** Benchmark start timestamp */
  startTime: number;

  /** Benchmark end timestamp */
  endTime: number;

  /** Total benchmark duration in milliseconds */
  duration: number;
}
