/**
 * Aggregation & Reporting
 * 
 * Functions to aggregate multiple game metrics and generate readable reports.
 * Handles win rates, tool call statistics, error breakdowns, and faction metrics.
 */

import type {
  GameMetrics,
  AggregatedMetrics,
  BenchmarkConfig,
  BenchmarkResults,
  FactionMetrics,
} from '../metrics/types';
import type { Faction } from '../types';
import { FACTION_NAMES } from '../types';
import { formatDuration, formatPercent } from './utils';

// =============================================================================
// MAIN AGGREGATION FUNCTION
// =============================================================================

/**
 * Aggregate metrics from multiple games into summary statistics.
 * 
 * @param games - Array of game metrics to aggregate
 * @param config - Benchmark configuration (used for context)
 * @returns Aggregated metrics with win rates, tool stats, errors, and faction metrics
 * 
 * @example
 * ```typescript
 * const aggregated = aggregateResults(gameMetrics, benchmarkConfig);
 * console.log(`Win rate: ${aggregated.winRates[Faction.ATREIDES] * 100}%`);
 * ```
 */
export function aggregateResults(
  games: GameMetrics[],
  config: BenchmarkConfig
): AggregatedMetrics {
  // Handle empty games array
  if (games.length === 0) {
    return createEmptyAggregatedMetrics(config.factions);
  }

  // Initialize aggregation structures
  const winCounts: Record<Faction, number> = {} as Record<Faction, number>;
  const factionData: Map<Faction, {
    spice: number[];
    strongholds: number[];
    toolCalls: number;
    failures: number;
  }> = new Map();
  
  const toolStats: Map<string, { total: number; failures: number }> = new Map();
  const errorCounts: Record<string, number> = {};
  
  let totalTurns = 0;
  let totalDuration = 0;
  let totalToolCalls = 0;
  let totalFailures = 0;

  // Initialize faction data structures
  for (const faction of config.factions) {
    winCounts[faction] = 0;
    factionData.set(faction, {
      spice: [],
      strongholds: [],
      toolCalls: 0,
      failures: 0,
    });
  }

  // Process each game
  for (const game of games) {
    // Aggregate turns and duration
    totalTurns += game.turns;
    totalDuration += game.duration;

    // Process winner (handle ties and null)
    if (game.winner) {
      // Handle ties: multiple winners each get a win
      for (const winner of game.winner.winners) {
        if (winner in winCounts) {
          winCounts[winner]++;
        }
      }
    }

    // Process tool calls
    for (const toolCall of game.toolCalls) {
      totalToolCalls++;
      
      // Track tool call stats
      const toolName = toolCall.toolName;
      if (!toolStats.has(toolName)) {
        toolStats.set(toolName, { total: 0, failures: 0 });
      }
      const stats = toolStats.get(toolName)!;
      stats.total++;
      
      // Track failures
      if (!toolCall.success) {
        totalFailures++;
        stats.failures++;
        
        // Track faction failures
        const factionInfo = factionData.get(toolCall.faction);
        if (factionInfo) {
          factionInfo.failures++;
        }
        
        // Track errors by code
        if (toolCall.error?.code) {
          errorCounts[toolCall.error.code] = (errorCounts[toolCall.error.code] || 0) + 1;
        }
      }
      
      // Track faction tool calls
      const factionInfo = factionData.get(toolCall.faction);
      if (factionInfo) {
        factionInfo.toolCalls++;
      }
    }

    // Note: Faction-specific final state (spice, strongholds) is not available
    // in the current GameMetrics interface. This data would need to be collected
    // by the metrics collector (Task 2) and included in GameMetrics for the
    // aggregator to calculate averages. For now, these will remain at 0.
  }

  // Calculate win rates
  const winRates: Record<Faction, number> = {} as Record<Faction, number>;
  const totalGames = games.length;
  
  for (const faction of config.factions) {
    winRates[faction] = totalGames > 0 ? winCounts[faction] / totalGames : 0;
  }

  // Calculate averages
  const averageTurns = totalGames > 0 ? totalTurns / totalGames : 0;
  const averageDuration = totalGames > 0 ? totalDuration / totalGames : 0;

  // Calculate tool call failure rate
  const failureRate = totalToolCalls > 0 ? totalFailures / totalToolCalls : 0;

  // Build tool stats by tool name
  const byTool: Record<string, { total: number; failures: number }> = {};
  for (const [toolName, stats] of toolStats.entries()) {
    byTool[toolName] = { total: stats.total, failures: stats.failures };
  }

  // Build faction metrics
  const factionMetrics: Record<Faction, FactionMetrics> = {} as Record<Faction, FactionMetrics>;
  
  for (const faction of config.factions) {
    const data = factionData.get(faction)!;
    const avgSpice = data.spice.length > 0 
      ? data.spice.reduce((a, b) => a + b, 0) / data.spice.length 
      : 0;
    const avgStrongholds = data.strongholds.length > 0
      ? data.strongholds.reduce((a, b) => a + b, 0) / data.strongholds.length
      : 0;
    
    factionMetrics[faction] = {
      faction,
      finalSpice: avgSpice,
      strongholdsControlled: avgStrongholds,
      toolCallCount: data.toolCalls,
      toolFailureCount: data.failures,
      invalidActionCount: data.failures, // Assuming failures are invalid actions
      wins: winCounts[faction],
    };
  }

  return {
    totalGames,
    winRates,
    averageTurns,
    averageDuration,
    toolCallStats: {
      total: totalToolCalls,
      failures: totalFailures,
      failureRate,
      byTool,
    },
    errorBreakdown: errorCounts,
    factionMetrics,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create empty aggregated metrics structure for edge cases.
 */
function createEmptyAggregatedMetrics(factions: Faction[]): AggregatedMetrics {
  const winRates: Record<Faction, number> = {} as Record<Faction, number>;
  const factionMetrics: Record<Faction, FactionMetrics> = {} as Record<Faction, FactionMetrics>;
  
  for (const faction of factions) {
    winRates[faction] = 0;
    factionMetrics[faction] = {
      faction,
      finalSpice: 0,
      strongholdsControlled: 0,
      toolCallCount: 0,
      toolFailureCount: 0,
      invalidActionCount: 0,
      wins: 0,
    };
  }
  
  return {
    totalGames: 0,
    winRates,
    averageTurns: 0,
    averageDuration: 0,
    toolCallStats: {
      total: 0,
      failures: 0,
      failureRate: 0,
      byTool: {},
    },
    errorBreakdown: {},
    factionMetrics,
  };
}

// Note: formatDuration and formatPercent are imported from ./utils

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Generate a human-readable text report from benchmark results.
 * 
 * @param results - Complete benchmark results including aggregated metrics
 * @returns Formatted text report
 * 
 * @example
 * ```typescript
 * const report = generateReport(benchmarkResults);
 * console.log(report);
 * // Output:
 * // Benchmark Results
 * // =================
 * // Model: gpt-4
 * // Games: 100
 * // ...
 * ```
 */
export function generateReport(results: BenchmarkResults): string {
  const { config, aggregated, startTime, endTime, duration } = results;
  const { winRates, toolCallStats, errorBreakdown, factionMetrics } = aggregated;
  
  const lines: string[] = [];
  
  // Header
  lines.push('Benchmark Results');
  lines.push('='.repeat(50));
  lines.push('');
  
  // Summary
  lines.push(`Model: ${config.model}`);
  lines.push(`Games: ${aggregated.totalGames}`);
  lines.push(`Duration: ${formatDuration(duration)}`);
  lines.push(`Start: ${new Date(startTime).toISOString()}`);
  lines.push(`End: ${new Date(endTime).toISOString()}`);
  lines.push('');
  
  // Win Rates
  lines.push('Win Rates:');
  const sortedFactions = Object.entries(winRates)
    .sort(([, a], [, b]) => b - a)
    .filter(([, rate]) => rate > 0);
  
  if (sortedFactions.length === 0) {
    lines.push('  No winners recorded');
  } else {
    for (const [faction, rate] of sortedFactions) {
      const factionName = FACTION_NAMES[faction as Faction] || faction;
      lines.push(`  ${factionName}: ${formatPercent(rate)}`);
    }
  }
  lines.push('');
  
  // Tool Call Statistics
  lines.push('Tool Call Statistics:');
  lines.push(`  Total: ${toolCallStats.total.toLocaleString()}`);
  lines.push(`  Failures: ${toolCallStats.failures.toLocaleString()} (${formatPercent(toolCallStats.failureRate)})`);
  lines.push('');
  
  if (Object.keys(toolCallStats.byTool).length > 0) {
    lines.push('  By Tool:');
    const sortedTools = Object.entries(toolCallStats.byTool)
      .sort(([, a], [, b]) => b.total - a.total);
    
    for (const [toolName, stats] of sortedTools) {
      const toolFailureRate = stats.total > 0 ? stats.failures / stats.total : 0;
      lines.push(`    ${toolName}: ${stats.total.toLocaleString()} calls, ${stats.failures.toLocaleString()} failures (${formatPercent(toolFailureRate)})`);
    }
    lines.push('');
  }
  
  // Error Breakdown
  if (Object.keys(errorBreakdown).length > 0) {
    lines.push('Error Breakdown:');
    const sortedErrors = Object.entries(errorBreakdown)
      .sort(([, a], [, b]) => b - a);
    
    for (const [errorCode, count] of sortedErrors) {
      lines.push(`  ${errorCode}: ${count.toLocaleString()}`);
    }
    lines.push('');
  }
  
  // Per-Faction Metrics
  lines.push('Per-Faction Metrics:');
  for (const [faction, metrics] of Object.entries(factionMetrics)) {
    const factionName = FACTION_NAMES[faction as Faction] || faction;
    lines.push(`  ${factionName}:`);
    lines.push(`    Wins: ${metrics.wins}`);
    lines.push(`    Average Final Spice: ${metrics.finalSpice.toFixed(1)}`);
    lines.push(`    Average Strongholds: ${metrics.strongholdsControlled.toFixed(1)}`);
    lines.push(`    Tool Calls: ${metrics.toolCallCount.toLocaleString()}`);
    lines.push(`    Tool Failures: ${metrics.toolFailureCount.toLocaleString()}`);
    if (metrics.toolCallCount > 0) {
      const factionFailureRate = metrics.toolFailureCount / metrics.toolCallCount;
      lines.push(`    Failure Rate: ${formatPercent(factionFailureRate)}`);
    }
  }
  lines.push('');
  
  // Game Averages
  lines.push('Game Averages:');
  lines.push(`  Average Turns: ${aggregated.averageTurns.toFixed(1)}`);
  lines.push(`  Average Duration: ${formatDuration(aggregated.averageDuration)}`);
  lines.push('');
  
  return lines.join('\n');
}

