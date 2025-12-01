/**
 * Metrics Storage - File-based storage system for game metrics
 *
 * Stores metrics in the local file system using:
 * - JSON format for individual game metrics
 * - JSON format for aggregated benchmark results
 * - CSV export for analysis
 *
 * Directory structure:
 *   data/benchmarks/
 *     {gameId}/
 *       metrics.json  - Individual game metrics
 *     {benchmarkId}/
 *       results.json  - Aggregated benchmark results
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { GameMetrics, BenchmarkResults } from './types';

// =============================================================================
// FILE PATHS
// =============================================================================

const METRICS_FILE = 'metrics.json';
const RESULTS_FILE = 'results.json';

// =============================================================================
// METRICS STORE IMPLEMENTATION
// =============================================================================

export interface MetricsStoreConfig {
  baseDir?: string;
  autoCreate?: boolean;
}

export class MetricsStore {
  private readonly baseDir: string;
  private readonly autoCreate: boolean;

  constructor(config: MetricsStoreConfig = {}) {
    this.baseDir = config.baseDir ?? join(process.cwd(), 'data', 'benchmarks');
    this.autoCreate = config.autoCreate ?? true;
  }

  // ---------------------------------------------------------------------------
  // Path Helpers
  // ---------------------------------------------------------------------------

  private getGameDir(gameId: string): string {
    return join(this.baseDir, gameId);
  }

  private getMetricsPath(gameId: string): string {
    return join(this.getGameDir(gameId), METRICS_FILE);
  }

  private getBenchmarkDir(benchmarkId: string): string {
    return join(this.baseDir, benchmarkId);
  }

  private getResultsPath(benchmarkId: string): string {
    return join(this.getBenchmarkDir(benchmarkId), RESULTS_FILE);
  }

  // ---------------------------------------------------------------------------
  // Directory Management
  // ---------------------------------------------------------------------------

  private async ensureBaseDir(): Promise<void> {
    if (!this.autoCreate) return;

    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async ensureGameDir(gameId: string): Promise<void> {
    await this.ensureBaseDir();

    try {
      await fs.mkdir(this.getGameDir(gameId), { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async ensureBenchmarkDir(benchmarkId: string): Promise<void> {
    await this.ensureBaseDir();

    try {
      await fs.mkdir(this.getBenchmarkDir(benchmarkId), { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game Metrics Storage
  // ---------------------------------------------------------------------------

  /**
   * Save individual game metrics to JSON file
   * Creates directory if it doesn't exist
   */
  async saveGameMetrics(metrics: GameMetrics): Promise<void> {
    try {
      await this.ensureGameDir(metrics.gameId);

      const json = this.exportToJSON(metrics);
      await fs.writeFile(this.getMetricsPath(metrics.gameId), json, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      // Handle specific error cases
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot write to ${this.getMetricsPath(metrics.gameId)}`);
      }
      if (err.code === 'ENOSPC') {
        throw new Error(`No space left on device: Cannot save metrics for game ${metrics.gameId}`);
      }
      
      // Log and rethrow other errors
      console.error(`[MetricsStore] Failed to save metrics for game ${metrics.gameId}:`, error);
      throw error;
    }
  }

  /**
   * Load metrics from JSON file
   * Returns null if file doesn't exist
   */
  async loadGameMetrics(gameId: string): Promise<GameMetrics | null> {
    try {
      const content = await fs.readFile(this.getMetricsPath(gameId), 'utf-8');
      return JSON.parse(content) as GameMetrics;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      if (err.code === 'ENOENT') {
        return null;
      }
      
      // Handle parse errors
      if (err instanceof SyntaxError) {
        console.error(`[MetricsStore] Failed to parse metrics for game ${gameId}:`, error);
        return null;
      }
      
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Export Functions
  // ---------------------------------------------------------------------------

  /**
   * Convert metrics to JSON string with pretty printing
   * Handles both single metrics and arrays
   */
  exportToJSON(metrics: GameMetrics | GameMetrics[]): string {
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Convert array of GameMetrics to CSV format
   * Flattens nested data and escapes special characters
   */
  exportToCSV(metrics: GameMetrics[]): string {
    if (metrics.length === 0) {
      return '';
    }

    // Define CSV headers
    const headers = [
      'gameId',
      'model',
      'factions',
      'winner',
      'winCondition',
      'turns',
      'duration',
      'apiCostTokens',
      'apiCost',
      'toolCallCount',
      'toolFailureCount',
      'startTime',
      'endTime',
    ];

    // Escape CSV values
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      
      const str = String(value);
      
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      
      return str;
    };

    // Build CSV rows
    const rows = metrics.map((metric) => {
      const winnerFactions = metric.winner?.winners.join(';') ?? '';
      const winCondition = metric.winner?.condition ?? '';
      const factions = metric.factions.join(';');
      const toolCallCount = metric.toolCalls.length;
      const toolFailureCount = metric.toolCalls.filter((tc) => !tc.success).length;

      return [
        escapeCSV(metric.gameId),
        escapeCSV(metric.model),
        escapeCSV(factions),
        escapeCSV(winnerFactions),
        escapeCSV(winCondition),
        escapeCSV(metric.turns),
        escapeCSV(metric.duration),
        escapeCSV(metric.apiCost?.tokens ?? ''),
        escapeCSV(metric.apiCost?.cost ?? ''),
        escapeCSV(toolCallCount),
        escapeCSV(toolFailureCount),
        escapeCSV(metric.startTime),
        escapeCSV(metric.endTime),
      ].join(',');
    });

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Directory Listing
  // ---------------------------------------------------------------------------

  /**
   * List all game IDs in benchmarks directory
   * Returns empty array if directory doesn't exist
   */
  async listGameIds(): Promise<string[]> {
    try {
      await this.ensureBaseDir();

      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const gameIds: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Check if directory contains a metrics.json file
          const metricsPath = join(this.baseDir, entry.name, METRICS_FILE);
          try {
            await fs.access(metricsPath);
            gameIds.push(entry.name);
          } catch {
            // Directory exists but no metrics.json, skip it
          }
        }
      }

      return gameIds.sort();
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      if (err.code === 'ENOENT') {
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Save aggregated benchmark results
   * Creates directory if it doesn't exist
   */
  async saveBenchmarkResults(benchmarkId: string, results: BenchmarkResults): Promise<void> {
    try {
      await this.ensureBenchmarkDir(benchmarkId);

      const json = JSON.stringify(results, null, 2);
      await fs.writeFile(this.getResultsPath(benchmarkId), json, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      if (err.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot write to ${this.getResultsPath(benchmarkId)}`);
      }
      if (err.code === 'ENOSPC') {
        throw new Error(`No space left on device: Cannot save results for benchmark ${benchmarkId}`);
      }
      
      console.error(`[MetricsStore] Failed to save results for benchmark ${benchmarkId}:`, error);
      throw error;
    }
  }

  /**
   * Load aggregated benchmark results
   * Returns null if file doesn't exist
   */
  async loadBenchmarkResults(benchmarkId: string): Promise<BenchmarkResults | null> {
    try {
      const content = await fs.readFile(this.getResultsPath(benchmarkId), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      if (err.code === 'ENOENT') {
        return null;
      }
      
      if (err instanceof SyntaxError) {
        console.error(`[MetricsStore] Failed to parse results for benchmark ${benchmarkId}:`, error);
        return null;
      }
      
      throw error;
    }
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default metrics store instance using 'data/benchmarks' directory
 */
export const metricsStore = new MetricsStore({
  baseDir: join(process.cwd(), 'data', 'benchmarks'),
  autoCreate: true,
});

