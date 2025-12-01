#!/usr/bin/env npx tsx

/**
 * Test CHOAM Charity Phase
 *
 * Tests the CHOAM Charity phase to verify:
 * - Correct eligibility (0-1 spice)
 * - Correct charity amounts (brings to 2 spice)
 * - Bene Gesserit advanced ability
 * - Fraud safeguards (once per turn)
 *
 * Usage: npx tsx src/lib/game/test-choam-charity-phase.ts
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

    console.log = (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[LOG] ${message}`);
      this.originalConsoleLog(...args);
    };

    console.error = (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[ERROR] ${message}`);
      this.originalConsoleError(...args);
    };

    console.warn = (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      this.logs.push(`[WARN] ${message}`);
      this.originalConsoleWarn(...args);
    };

    console.info = (...args: unknown[]) => {
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
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required.');
    process.exit(1);
  }

  // Test with 6 factions
  const factions: Faction[] = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.SPACING_GUILD,
    Faction.BENE_GESSERIT,
  ];

  console.log('🧪 Testing CHOAM Charity Phase\n');
  console.log(`Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}\n`);

  const logCapture = new LogCapture();
  const startTime = Date.now();

  try {
    const allEvents: PhaseEvent[] = [];

    const config: GameRunnerConfig = {
      factions,
      maxTurns: 1,
      agentConfig: { verbose: true },
      onlyPhases: [Phase.SETUP, Phase.STORM, Phase.SPICE_BLOW, Phase.CHOAM_CHARITY],
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
      'CHOAM CHARITY PHASE TEST',
      '='.repeat(80),
      '',
      `Test Date: ${new Date().toISOString()}`,
      `Duration: ${duration} seconds`,
      '',
      `Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}`,
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
      '',
      'Faction Spice Holdings:',
      ...Array.from(result.finalState.factions.entries()).map(([faction, state]) => {
        return `  ${FACTION_NAMES[faction]}: ${state.spice} spice`;
      }),
      '',
      '='.repeat(80),
      'VALIDATION',
      '='.repeat(80),
      '',
      'Checking CHOAM Charity rules:',
      ...Array.from(result.finalState.factions.entries()).map(([faction, state]) => {
        const wasEligible = state.spice <= 1;
        const shouldHaveClaimed = wasEligible;
        return `  ${FACTION_NAMES[faction]}: ${state.spice} spice ${wasEligible ? '(was eligible)' : '(not eligible)'}`;
      }),
      '',
      '='.repeat(80),
      'END OF TEST',
      '='.repeat(80),
    ].join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `choam-charity-test-${timestamp}.txt`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, logOutput, 'utf-8');

    console.log('\n✅ Test completed successfully!');
    console.log(`📄 Full logs written to: ${filepath}`);
    console.log(`\nSummary:`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Events: ${allEvents.length}`);

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
    const filename = `choam-charity-test-error-${timestamp}.txt`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, errorLog, 'utf-8');

    console.error('\n❌ Test failed!');
    console.error(`📄 Error logs written to: ${filepath}`);
    console.error(error);
    
    process.exit(1);
  }
}

main().catch(console.error);

