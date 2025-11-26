#!/usr/bin/env npx tsx

/**
 * CLI for running Dune AI games
 *
 * Usage:
 *   npx tsx src/lib/game/run-game.ts              # Quick 2-player game
 *   npx tsx src/lib/game/run-game.ts --factions atreides,harkonnen,emperor
 *   npx tsx src/lib/game/run-game.ts --turns 10
 *   npx tsx src/lib/game/run-game.ts --verbose
 */

// Load environment variables from .env file
import 'dotenv/config';

import { Faction, Phase, FACTION_NAMES } from './types';
import { runDuneGame, runQuickGame, runFromState, type GameRunnerConfig } from './agent';
import {
  saveStateToFile,
  loadStateFromFile,
  listSnapshots as listSnapshotFiles,
  generateSnapshotName,
} from './state/serialize';

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

interface CLIArgs {
  factions: Faction[];
  maxTurns: number;
  verbose: boolean;
  help: boolean;
  /** Run only specific phase(s) */
  onlyPhases: Phase[] | null;
  /** Stop after this phase */
  stopAfter: Phase | null;
  /** Skip setup phase (use defaults) */
  skipSetup: boolean;
  /** Save state to file after run */
  saveState: string | null;
  /** Load state from file instead of creating new game */
  loadState: string | null;
  /** List available snapshots */
  listSnapshots: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    maxTurns: 5,
    verbose: true,
    help: false,
    onlyPhases: null,
    stopAfter: null,
    skipSetup: false,
    saveState: null,
    loadState: null,
    listSnapshots: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--factions' || arg === '-f') {
      const factionsStr = args[++i];
      if (factionsStr) {
        result.factions = parseFactions(factionsStr);
      }
    } else if (arg === '--turns' || arg === '-t') {
      const turns = parseInt(args[++i], 10);
      if (!isNaN(turns) && turns > 0) {
        result.maxTurns = turns;
      }
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (arg === '--quiet' || arg === '-q') {
      result.verbose = false;
    } else if (arg === '--only' || arg === '--phase') {
      const phasesStr = args[++i];
      if (phasesStr) {
        result.onlyPhases = parsePhases(phasesStr);
      }
    } else if (arg === '--stop-after') {
      const phaseStr = args[++i];
      if (phaseStr) {
        const phases = parsePhases(phaseStr);
        result.stopAfter = phases.length > 0 ? phases[0] : null;
      }
    } else if (arg === '--skip-setup') {
      result.skipSetup = true;
    } else if (arg === '--save-state' || arg === '--save') {
      result.saveState = args[++i] || 'auto';
    } else if (arg === '--load-state' || arg === '--load') {
      result.loadState = args[++i];
    } else if (arg === '--list-snapshots' || arg === '--snapshots') {
      result.listSnapshots = true;
    }
  }

  return result;
}

function parseFactions(str: string): Faction[] {
  const factionMap: Record<string, Faction> = {
    atreides: Faction.ATREIDES,
    harkonnen: Faction.HARKONNEN,
    emperor: Faction.EMPEROR,
    fremen: Faction.FREMEN,
    guild: Faction.SPACING_GUILD,
    spacing_guild: Faction.SPACING_GUILD,
    bg: Faction.BENE_GESSERIT,
    bene_gesserit: Faction.BENE_GESSERIT,
  };

  return str
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s in factionMap)
    .map((s) => factionMap[s]);
}

function parsePhases(str: string): Phase[] {
  const phaseMap: Record<string, Phase> = {
    setup: Phase.SETUP,
    storm: Phase.STORM,
    spice: Phase.SPICE_BLOW,
    spice_blow: Phase.SPICE_BLOW,
    charity: Phase.CHOAM_CHARITY,
    choam: Phase.CHOAM_CHARITY,
    choam_charity: Phase.CHOAM_CHARITY,
    bidding: Phase.BIDDING,
    bid: Phase.BIDDING,
    revival: Phase.REVIVAL,
    revive: Phase.REVIVAL,
    ship: Phase.SHIPMENT_MOVEMENT,
    shipment: Phase.SHIPMENT_MOVEMENT,
    movement: Phase.SHIPMENT_MOVEMENT,
    shipment_movement: Phase.SHIPMENT_MOVEMENT,
    battle: Phase.BATTLE,
    collect: Phase.SPICE_COLLECTION,
    collection: Phase.SPICE_COLLECTION,
    spice_collection: Phase.SPICE_COLLECTION,
    mentat: Phase.MENTAT_PAUSE,
    mentat_pause: Phase.MENTAT_PAUSE,
  };

  return str
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s in phaseMap)
    .map((s) => phaseMap[s]);
}

function printHelp(): void {
  console.log(`
🏜️  DUNE AI Simulation

Usage: npx tsx src/lib/game/run-game.ts [options]

Options:
  --factions, -f <list>  Comma-separated list of factions
                         (atreides, harkonnen, emperor, fremen, guild, bg)
                         Default: atreides,harkonnen

  --turns, -t <number>   Maximum turns before game ends
                         Default: 5

  --verbose, -v          Show detailed agent output (default: true)

  --quiet, -q            Hide detailed agent output

  --help, -h             Show this help message

Debug/Phase Control:
  --only <phases>        Run only specific phase(s), comma-separated
                         (setup, storm, spice, charity, bidding, revival,
                          ship, battle, collect, mentat)

  --stop-after <phase>   Stop after completing this phase

  --skip-setup           Skip setup phase, use default values
                         (auto-select traitors, default BG prediction)

Examples:
  npx tsx src/lib/game/run-game.ts
  npx tsx src/lib/game/run-game.ts --factions atreides,harkonnen,emperor
  npx tsx src/lib/game/run-game.ts --turns 10 --quiet

  # Debug specific phases:
  npx tsx src/lib/game/run-game.ts --only setup
  npx tsx src/lib/game/run-game.ts --stop-after bidding
  npx tsx src/lib/game/run-game.ts --skip-setup --only storm,spice

Environment:
  ANTHROPIC_API_KEY      Required. Your Anthropic API key.
`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // List snapshots
  if (args.listSnapshots) {
    const snapshots = listSnapshotFiles();
    if (snapshots.length === 0) {
      console.log('No snapshots found. Use --save-state to create one.');
    } else {
      console.log('Available snapshots:');
      for (const name of snapshots) {
        console.log(`  ${name}`);
      }
    }
    process.exit(0);
  }

  // Check for API key (not needed for list-snapshots)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('Set it with: export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  // Load state from snapshot if specified
  if (args.loadState) {
    console.log(`📂 Loading state from snapshot: ${args.loadState}`);
    try {
      const loadedState = loadStateFromFile(args.loadState);
      const factions = Array.from(loadedState.factions.keys());
      console.log(`   Turn ${loadedState.turn}, Phase: ${loadedState.phase}`);
      console.log(`   Factions: ${factions.map((f) => FACTION_NAMES[f]).join(', ')}`);
      console.log('');

      const result = await runFromState(loadedState, {
        agentConfig: { verbose: args.verbose },
        onlyPhases: args.onlyPhases ?? undefined,
        stopAfter: args.stopAfter ?? undefined,
      });

      // Save state if requested
      if (args.saveState) {
        const filename = args.saveState === 'auto'
          ? generateSnapshotName(result.finalState)
          : args.saveState;
        const filepath = saveStateToFile(result.finalState, filename);
        console.log(`\n💾 State saved to: ${filepath}`);
      }

      process.exit(result.winner ? 0 : 1);
    } catch (error) {
      console.error('Error loading snapshot:', error);
      process.exit(1);
    }
  }

  // Validate factions for new game
  if (args.factions.length < 2) {
    console.error('Error: At least 2 factions are required.');
    console.error('Use --factions atreides,harkonnen,emperor (comma-separated)');
    process.exit(1);
  }

  console.log('🏜️  DUNE: AI Simulation\n');
  console.log('Configuration:');
  console.log(`  Factions: ${args.factions.map((f) => FACTION_NAMES[f]).join(', ')}`);
  console.log(`  Max turns: ${args.maxTurns}`);
  console.log(`  Verbose: ${args.verbose}`);
  if (args.onlyPhases) {
    console.log(`  Only phases: ${args.onlyPhases.join(', ')}`);
  }
  if (args.stopAfter) {
    console.log(`  Stop after: ${args.stopAfter}`);
  }
  if (args.skipSetup) {
    console.log(`  Skip setup: true`);
  }
  if (args.saveState) {
    console.log(`  Save state: ${args.saveState}`);
  }
  console.log('');

  try {
    const config: GameRunnerConfig = {
      factions: args.factions,
      maxTurns: args.maxTurns,
      agentConfig: {
        verbose: args.verbose,
      },
      onlyPhases: args.onlyPhases ?? undefined,
      stopAfter: args.stopAfter ?? undefined,
      skipSetup: args.skipSetup,
    };

    const result = await runDuneGame(config);

    // Save state if requested
    if (args.saveState) {
      const filename = args.saveState === 'auto'
        ? generateSnapshotName(result.finalState)
        : args.saveState;
      const filepath = saveStateToFile(result.finalState, filename);
      console.log(`\n💾 State saved to: ${filepath}`);
    }

    // Exit with success
    process.exit(result.winner ? 0 : 1);
  } catch (error) {
    console.error('Game error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
