/**
 * CLI Interface for Benchmarking
 *
 * Command-line interface for running LLM benchmarks on the Dune game.
 * Provides easy-to-use commands for batch execution and metrics collection.
 *
 * Usage:
 *   tsx src/lib/game/benchmark/cli.ts --model gpt-4 --games 100
 *   pnpm benchmark --model gpt-4 --games 50 --factions atreides,harkonnen,emperor
 */

import { join } from 'path';
import { BenchmarkRunner } from './benchmark-runner';
import { generateReport } from './aggregator';
import type { BenchmarkConfig } from '../metrics/types';
import { Faction, FACTION_NAMES } from '../types';
import { formatDuration } from './utils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Parsed command-line arguments.
 */
interface CLIArgs {
  /** LLM model to test (required) */
  model?: string;
  /** Number of games to run (default: 10) */
  games: number;
  /** Factions to include (default: [ATREIDES, HARKONNEN]) */
  factions: Faction[];
  /** Output directory (default: "data/benchmarks") */
  output: string;
  /** Maximum turns per game (default: 10) */
  maxTurns: number;
  /** Save individual game metrics */
  saveIndividual: boolean;
  /** Reduce output verbosity */
  quiet: boolean;
  /** Show help message */
  help: boolean;
}

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

/**
 * Parse command-line arguments into structured CLIArgs object.
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    model: undefined,
    games: 10,
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    output: 'data/benchmarks',
    maxTurns: 10,
    saveIndividual: false,
    quiet: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--model' || arg === '-m') {
      result.model = args[++i];
    } else if (arg === '--games' || arg === '-g') {
      result.games = parseInt(args[++i], 10) || 10;
    } else if (arg === '--factions' || arg === '-f') {
      const factionsStr = args[++i];
      result.factions = parseFactions(factionsStr);
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--max-turns' || arg === '-t') {
      result.maxTurns = parseInt(args[++i], 10) || 10;
    } else if (arg === '--save-individual') {
      result.saveIndividual = true;
    } else if (arg === '--quiet' || arg === '-q') {
      result.quiet = true;
    }
  }

  return result;
}

/**
 * Parse comma-separated faction string into Faction array.
 * Validates faction names and throws on invalid input.
 */
function parseFactions(factionsStr: string): Faction[] {
  const parts = factionsStr.split(',').map((s) => s.trim().toLowerCase());
  const factions: Faction[] = [];

  // Map string names to Faction enum values
  const factionMap: Record<string, Faction> = {
    atreides: Faction.ATREIDES,
    'bene_gesserit': Faction.BENE_GESSERIT,
    'bene-gesserit': Faction.BENE_GESSERIT,
    emperor: Faction.EMPEROR,
    fremen: Faction.FREMEN,
    harkonnen: Faction.HARKONNEN,
    'spacing_guild': Faction.SPACING_GUILD,
    'spacing-guild': Faction.SPACING_GUILD,
    guild: Faction.SPACING_GUILD,
  };

  for (const part of parts) {
    const faction = factionMap[part];
    if (!faction) {
      throw new Error(
        `Invalid faction: "${part}". Valid factions: ${Object.keys(factionMap).join(', ')}`
      );
    }
    if (!factions.includes(faction)) {
      factions.push(faction);
    }
  }

  if (factions.length < 2) {
    throw new Error('At least 2 factions are required');
  }

  return factions;
}

// =============================================================================
// HELP MESSAGE
// =============================================================================

/**
 * Print help message to console.
 */
function printHelp(): void {
  console.log(`
Benchmark CLI - Run LLM benchmarks for Dune game

Usage:
  tsx src/lib/game/benchmark/cli.ts [options]

Options:
  --model, -m <model>        LLM model to test (required)
  --games, -g <number>       Number of games to run (default: 10)
  --factions, -f <list>      Comma-separated factions (default: atreides,harkonnen)
  --output, -o <dir>         Output directory (default: data/benchmarks)
  --max-turns, -t <number>   Max turns per game (default: 10)
  --save-individual          Save individual game metrics
  --quiet, -q                Reduce output verbosity
  --help, -h                 Show this help message

Examples:
  tsx src/lib/game/benchmark/cli.ts --model gpt-4 --games 100
  tsx src/lib/game/benchmark/cli.ts --model claude-3.5-sonnet --games 50 --factions atreides,harkonnen,emperor
  tsx src/lib/game/benchmark/cli.ts --model gpt-4 --games 10 --save-individual --quiet
`);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
// Note: formatDuration is imported from ./utils

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // Show help and exit
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate arguments
  if (!args.model) {
    console.error('Error: --model is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  if (args.games < 1) {
    console.error('Error: --games must be at least 1');
    process.exit(1);
  }

  if (args.maxTurns < 1) {
    console.error('Error: --max-turns must be at least 1');
    process.exit(1);
  }

  // Create benchmark runner
  const runner = new BenchmarkRunner({
    saveGameMetrics: args.saveIndividual,
    onProgress: (current, total, gameId) => {
      if (!args.quiet) {
        console.log(`[${current}/${total}] Game ${gameId} complete`);
      }
    },
    onError: (gameId, error) => {
      console.error(`Error in game ${gameId}:`, error.message);
    },
  });

  // Display start information
  console.log(`Starting benchmark: ${args.games} games with ${args.model}`);
  console.log(
    `Factions: ${args.factions.map((f) => FACTION_NAMES[f]).join(', ')}`
  );
  console.log('');

  // Run benchmark
  const startTime = Date.now();
  let results;
  try {
    const benchmarkConfig: BenchmarkConfig = {
      model: args.model,
      numGames: args.games,
      factions: args.factions,
      maxTurns: args.maxTurns,
      outputDir: args.output,
    };

    results = await runner.runBenchmark(benchmarkConfig);
  } catch (error) {
    console.error('Fatal error during benchmark:', error);
    process.exit(1);
  }

  const duration = Date.now() - startTime;

  // Display results summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Benchmark Complete');
  console.log('='.repeat(60));
  console.log(`Duration: ${formatDuration(duration)}`);
  console.log(`Games: ${results.games.length}`);
  console.log('');

  // Generate and display report
  const report = generateReport(results);
  console.log(report);

  // Display results path (results already saved by runner)
  // Use the actual metricsStore baseDir for accurate path
  // Note: outputDir from config is accepted but metricsStore uses its default baseDir
  const resultsPath = join(
    process.cwd(),
    'data',
    'benchmarks',
    results.benchmarkId,
    'results.json'
  );
  console.log('');
  console.log(`Results saved to: ${resultsPath}`);

  // Exit successfully
  process.exit(0);
}

// =============================================================================
// EXECUTION
// =============================================================================

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

