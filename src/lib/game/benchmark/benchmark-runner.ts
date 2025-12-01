/**
 * Benchmark Runner
 *
 * System to run multiple games sequentially and collect metrics for benchmarking.
 * Handles progress tracking, error handling, and metrics aggregation.
 */

import { randomUUID } from 'crypto';
import { metricsStore } from '../metrics/storage';
import { aggregateResults } from './aggregator';
import { GameRunner, type GameRunnerConfig } from '../agent/game-runner';
import type { Faction } from '../types';
import type {
  BenchmarkConfig,
  BenchmarkResults,
  GameMetrics,
} from '../metrics/types';
import { generateGameId } from '../stream/utils/id-generator';
import { formatDuration } from './utils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for BenchmarkRunner instance.
 */
export interface BenchmarkRunnerConfig {
  /** Whether to save individual game metrics */
  saveGameMetrics?: boolean;
  /** Progress callback */
  onProgress?: (current: number, total: number, gameId: string) => void;
  /** Error callback */
  onError?: (gameId: string, error: Error) => void;
}

/**
 * Configuration for running a single game.
 */
export interface SingleGameConfig {
  /** Unique game identifier */
  gameId: string;
  /** LLM model to use */
  model: string;
  /** Which factions to include */
  factions: Faction[];
  /** Maximum turns per game */
  maxTurns?: number;
}

// =============================================================================
// BENCHMARK RUNNER
// =============================================================================

/**
 * Runs multiple games sequentially and collects metrics for benchmarking.
 */
export class BenchmarkRunner {
  private readonly saveGameMetrics: boolean;
  private readonly onProgress?: (current: number, total: number, gameId: string) => void;
  private readonly onError?: (gameId: string, error: Error) => void;

  constructor(config: BenchmarkRunnerConfig = {}) {
    this.saveGameMetrics = config.saveGameMetrics ?? true;
    this.onProgress = config.onProgress;
    this.onError = config.onError;
  }

  /**
   * Run a benchmark with multiple games.
   *
   * @param config - Benchmark configuration
   * @returns Aggregated benchmark results
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResults> {
    // Validate configuration
    this.validateConfig(config);

    // Generate unique benchmark ID
    const benchmarkId = this.generateBenchmarkId();
    const startTime = Date.now();

    // Track all game metrics
    const gameMetrics: GameMetrics[] = [];
    const failedGames: Array<{ gameId: string; error: Error }> = [];

    // Run each game sequentially
    for (let i = 0; i < config.numGames; i++) {
      const gameId = generateGameId();

      try {
        // Run single game
        const metrics = await this.runSingleGame({
          gameId,
          model: config.model,
          factions: config.factions,
          maxTurns: config.maxTurns,
        });

        // Add to results
        gameMetrics.push(metrics);

        // Save metrics if configured
        if (this.saveGameMetrics) {
          try {
            await metricsStore.saveGameMetrics(metrics);
          } catch (error) {
            console.warn(
              `[BenchmarkRunner] Failed to save metrics for game ${gameId}:`,
              error
            );
            // Continue - metrics are still in memory
          }
        }

        // Report progress
        const current = i + 1;
        const total = config.numGames;
        this.reportProgress(current, total, gameId, startTime);

        // Call progress callback
        if (this.onProgress) {
          this.onProgress(current, total, gameId);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Track failed game
        failedGames.push({ gameId, error: err });

        // Log error
        console.error(`[BenchmarkRunner] Game ${gameId} failed:`, err);

        // Call error callback
        if (this.onError) {
          this.onError(gameId, err);
        }

        // Continue to next game
      }
    }

    // Aggregate results
    const aggregated = aggregateResults(gameMetrics, config);

    // Build benchmark results
    const endTime = Date.now();
    const results: BenchmarkResults = {
      benchmarkId,
      config,
      games: gameMetrics,
      aggregated,
      startTime,
      endTime,
      duration: endTime - startTime,
    };

    // Save benchmark results
    try {
      await metricsStore.saveBenchmarkResults(benchmarkId, results);
    } catch (error) {
      console.warn(
        `[BenchmarkRunner] Failed to save benchmark results for ${benchmarkId}:`,
        error
      );
      // Continue - results are still returned
    }

    // Log summary
    this.logSummary(results, failedGames.length);

    return results;
  }

  /**
   * Run a single game with metrics collection.
   *
   * @param gameConfig - Game-specific configuration
   * @returns Game metrics
   */
  async runSingleGame(gameConfig: SingleGameConfig): Promise<GameMetrics> {
    // Create GameRunner config with metrics enabled
    // GameRunner will create its own MetricsCollector internally
    const runnerConfig: GameRunnerConfig = {
      factions: gameConfig.factions,
      maxTurns: gameConfig.maxTurns,
      agentConfig: {
        model: gameConfig.model,
        verbose: false, // Disable verbose logging for batch runs
      },
      gameId: gameConfig.gameId,
      enableMetrics: true, // Enable metrics collection in GameRunner
      modelName: gameConfig.model, // Required for metrics collection
      saveMetrics: false, // We'll save manually after collecting
    };

    // Create and run game
    const runner = new GameRunner(runnerConfig);
    
    try {
      await runner.runGame();

      // Get metrics from GameRunner's collector
      const metrics = runner.getMetrics();
      
      if (!metrics) {
        throw new Error(
          `Failed to collect metrics for game ${gameConfig.gameId}. ` +
          `Metrics collection may not have been initialized properly.`
        );
      }

      return metrics;
    } catch (error) {
      // Re-throw with context
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(
        `Failed to run game ${gameConfig.gameId}: ${err.message}`,
        { cause: err }
      );
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Validate benchmark configuration.
   */
  private validateConfig(config: BenchmarkConfig): void {
    if (!config.model || config.model.trim() === '') {
      throw new Error('Model name is required');
    }

    if (config.numGames < 1) {
      throw new Error('numGames must be at least 1');
    }

    if (!config.factions || config.factions.length < 2) {
      throw new Error('At least 2 factions are required');
    }

    if (config.maxTurns !== undefined && config.maxTurns < 1) {
      throw new Error('maxTurns must be at least 1');
    }
  }

  /**
   * Generate a unique benchmark ID.
   */
  private generateBenchmarkId(): string {
    const timestamp = Date.now().toString(36);
    const uuid = randomUUID().split('-')[0];
    return `benchmark_${timestamp}_${uuid}`;
  }

  /**
   * Report progress to console.
   */
  private reportProgress(
    current: number,
    total: number,
    gameId: string,
    startTime: number
  ): void {
    const elapsed = Date.now() - startTime;
    const avgTimePerGame = elapsed / current;
    const remaining = total - current;
    const estimatedTimeRemaining = avgTimePerGame * remaining;

    const percent = ((current / total) * 100).toFixed(1);
    const elapsedStr = formatDuration(elapsed);
    const remainingStr = formatDuration(estimatedTimeRemaining);

    console.log(
      `[BenchmarkRunner] Game ${current}/${total} complete (${percent}%) - ` +
        `Elapsed: ${elapsedStr}, ETA: ${remainingStr} - ${gameId}`
    );
  }

  // formatDuration is imported from utils, no need for private method

  /**
   * Log benchmark summary.
   */
  private logSummary(results: BenchmarkResults, failedCount: number): void {
    const { aggregated, duration } = results;
    const durationStr = formatDuration(duration);

    console.log('\n[BenchmarkRunner] Benchmark Complete');
    console.log('='.repeat(50));
    console.log(`Benchmark ID: ${results.benchmarkId}`);
    console.log(`Total Games: ${aggregated.totalGames}`);
    console.log(`Failed Games: ${failedCount}`);
    console.log(`Duration: ${durationStr}`);
    console.log(`Average Game Duration: ${formatDuration(aggregated.averageDuration)}`);
    console.log(`Average Turns: ${aggregated.averageTurns.toFixed(1)}`);
    console.log(`Tool Call Failure Rate: ${(aggregated.toolCallStats.failureRate * 100).toFixed(2)}%`);
    console.log('='.repeat(50));
  }
}

