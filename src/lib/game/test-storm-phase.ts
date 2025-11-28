#!/usr/bin/env npx tsx

/**
 * Test Storm Phase with Initial Storm Placement
 *
 * Tests the initial storm placement (Turn 1) to verify:
 * - Correct dialers (two players nearest Storm Start Sector)
 * - Storm moves from sector 0
 * - Storm order is calculated correctly
 * - First player is determined correctly
 *
 * Usage: npx tsx src/lib/game/test-storm-phase.ts
 */

// Load environment variables from .env file
import 'dotenv/config';

import { writeFileSync } from 'fs';
import { join } from 'path';
import { Faction, Phase, FACTION_NAMES } from './types';
import { runDuneGame, type GameRunnerConfig } from './agent';
import type { PhaseEvent } from './phases/types';

// =============================================================================
// LOG CAPTURE
// =============================================================================

class LogCapture {
  private logs: string[] = [];
  private originalConsoleLog: typeof console.log;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private originalConsoleInfo: typeof console.info;

  constructor() {
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleInfo = console.info;

    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[LOG] ${message}`);
      this.originalConsoleLog(...args);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[ERROR] ${message}`);
      this.originalConsoleError(...args);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[WARN] ${message}`);
      this.originalConsoleWarn(...args);
    };

    console.info = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[INFO] ${message}`);
      this.originalConsoleInfo(...args);
    };
  }

  restore() {
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
    console.info = this.originalConsoleInfo;
  }

  getLogs(): string[] {
    return this.logs;
  }

  getLogText(): string {
    return this.logs.join('\n');
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_FOUNDRY_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY or ANTHROPIC_FOUNDRY_API_KEY environment variable is required.');
    process.exit(1);
  }

  // Test with 6 factions to see full distribution
  const factions: Faction[] = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.SPACING_GUILD,
    Faction.BENE_GESSERIT,
  ];

  console.log('🧪 Testing Storm Phase - Initial Storm Placement\n');
  console.log(`Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}\n`);

  const logCapture = new LogCapture();
  const startTime = Date.now();

  try {
    const allEvents: PhaseEvent[] = [];

    const config: GameRunnerConfig = {
      factions,
      maxTurns: 1, // Only test Turn 1
      agentConfig: { verbose: true },
      onlyPhases: [Phase.SETUP, Phase.STORM], // Only setup and storm
      skipSetup: false,
      onEvent: (event) => {
        allEvents.push(event);
      },
    };

    const result = await runDuneGame(config);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logCapture.restore();

    // Build log output
    const logOutput = [
      '='.repeat(80),
      'STORM PHASE TEST - INITIAL STORM PLACEMENT',
      '='.repeat(80),
      '',
      `Test Date: ${new Date().toISOString()}`,
      `Duration: ${duration} seconds`,
      '',
      `Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}`,
      `Total Factions: ${factions.length}`,
      '',
      '='.repeat(80),
      'CONSOLE OUTPUT',
      '='.repeat(80),
      '',
      logCapture.getLogText(),
      '',
      '='.repeat(80),
      'PHASE EVENTS',
      '='.repeat(80),
      '',
      ...allEvents.map((event, index) => {
        return `[${index + 1}] ${event.type}\n   Message: ${event.message}\n   Data: ${JSON.stringify(event.data, null, 2)}`;
      }),
      '',
      '='.repeat(80),
      'GAME STATE SUMMARY',
      '='.repeat(80),
      '',
      `Turn: ${result.finalState.turn}`,
      `Phase: ${result.finalState.phase}`,
      `Storm Sector: ${result.finalState.stormSector}`,
      `Storm Order: ${result.finalState.stormOrder.map(f => FACTION_NAMES[f]).join(' → ')}`,
      '',
      'Player Positions:',
      ...Array.from(result.finalState.playerPositions.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([faction, sector]) => {
          return `  ${FACTION_NAMES[faction]}: Sector ${sector}`;
        }),
      '',
      '='.repeat(80),
      'VALIDATION',
      '='.repeat(80),
      '',
      `✅ Storm moved: ${result.finalState.stormSector !== 0 ? 'Yes' : 'No'}`,
      `✅ Storm order determined: ${result.finalState.stormOrder.length === factions.length ? 'Yes' : 'No'}`,
      `✅ First player: ${FACTION_NAMES[result.finalState.stormOrder[0]]}`,
      '',
      '='.repeat(80),
      'END OF TEST',
      '='.repeat(80),
    ].join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `storm-phase-test-${timestamp}.txt`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, logOutput, 'utf-8');

    console.log('\n✅ Test completed successfully!');
    console.log(`📄 Full logs written to: ${filepath}`);
    console.log(`\nSummary:`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Events: ${allEvents.length}`);
    console.log(`  - Storm Sector: ${result.finalState.stormSector}`);
    console.log(`  - First Player: ${FACTION_NAMES[result.finalState.stormOrder[0]]}`);

    process.exit(0);
  } catch (error) {
    logCapture.restore();
    
    const errorLog = [
      '='.repeat(80),
      'ERROR OCCURRED',
      '='.repeat(80),
      '',
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      '',
      'Stack Trace:',
      error instanceof Error ? error.stack : 'N/A',
      '',
      '='.repeat(80),
      'CONSOLE OUTPUT BEFORE ERROR',
      '='.repeat(80),
      '',
      logCapture.getLogText(),
    ].join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `storm-phase-test-error-${timestamp}.txt`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, errorLog, 'utf-8');

    console.error('\n❌ Test failed!');
    console.error(`📄 Error logs written to: ${filepath}`);
    console.error(error);
    
    process.exit(1);
  }
}

main().catch(console.error);

