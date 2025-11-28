#!/usr/bin/env npx tsx

/**
 * Test Setup Phase with 6 Factions
 *
 * Runs only the setup phase and captures all logs to a file.
 * Usage: npx tsx src/lib/game/test-setup-phase.ts
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
    // Store original console methods
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleInfo = console.info;

    // Override console methods
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
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_FOUNDRY_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY or ANTHROPIC_FOUNDRY_API_KEY environment variable is required.');
    process.exit(1);
  }

  // Setup 6 factions (all available factions)
  const factions: Faction[] = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.SPACING_GUILD,
    Faction.BENE_GESSERIT,
  ];

  console.log('🧪 Testing Setup Phase with 6 Factions\n');
  console.log(`Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}\n`);

  // Start log capture
  const logCapture = new LogCapture();
  const startTime = Date.now();

  try {
    // Capture all phase events
    const allEvents: PhaseEvent[] = [];

    const config: GameRunnerConfig = {
      factions,
      maxTurns: 10,
      agentConfig: { verbose: true }, // Enable verbose agent logging
      onlyPhases: [Phase.SETUP], // Only run setup phase
      onEvent: (event) => {
        allEvents.push(event);
      },
    };

    // Run the game (only setup phase)
    const result = await runDuneGame(config);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Stop log capture
    logCapture.restore();

    // Build comprehensive log output
    const logOutput = [
      '='.repeat(80),
      'SETUP PHASE TEST - 6 FACTIONS',
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
      `Setup Complete: ${result.finalState.setupComplete}`,
      '',
      'Faction States:',
      ...Array.from(result.finalState.factions.entries()).flatMap(([faction, state]) => {
        const lines = [
          `  ${FACTION_NAMES[faction]}:`,
          `    Spice: ${state.spice}`,
          `    Traitors: ${state.traitors.length}`,
          `    Leaders: ${state.leaders.length}`,
          `    Forces in Reserves: ${state.forces.reserves.regular + state.forces.reserves.elite}`,
          `    Forces on Board: ${state.forces.onBoard.length} stacks`,
        ];
        if (state.beneGesseritPrediction) {
          lines.push(`    BG Prediction: Turn ${state.beneGesseritPrediction.turn}, Faction ${state.beneGesseritPrediction.faction}`);
        }
        return lines;
      }),
      '',
      '='.repeat(80),
      'VALIDATION',
      '='.repeat(80),
      '',
      `✅ Setup phase completed: ${result.finalState.setupComplete}`,
      `✅ All factions have traitors: ${factions.every(f => {
        const state = result.finalState.factions.get(f);
        return state && state.traitors.length > 0;
      })}`,
      `✅ Harkonnen has 4 traitors: ${(() => {
        const harkonnen = result.finalState.factions.get(Faction.HARKONNEN);
        return harkonnen?.traitors.length === 4;
      })()}`,
      `✅ Other factions have 1 traitor: ${factions.filter(f => f !== Faction.HARKONNEN).every(f => {
        const state = result.finalState.factions.get(f);
        return state && state.traitors.length === 1;
      })}`,
      `✅ BG prediction made: ${(() => {
        const bg = result.finalState.factions.get(Faction.BENE_GESSERIT);
        return bg?.beneGesseritPrediction !== undefined;
      })()}`,
      `✅ Fremen forces distributed: ${(() => {
        const fremen = result.finalState.factions.get(Faction.FREMEN);
        if (!fremen) return true; // Not in game
        const totalOnBoard = fremen.forces.onBoard.reduce(
          (sum, stack) => sum + stack.forces.regular + stack.forces.elite,
          0
        );
        return totalOnBoard === 10; // Should have 10 forces distributed
      })()}`,
      '',
      '='.repeat(80),
      'END OF TEST',
      '='.repeat(80),
    ].join('\n');

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `setup-phase-test-${timestamp}.txt`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, logOutput, 'utf-8');

    console.log('\n✅ Test completed successfully!');
    console.log(`📄 Full logs written to: ${filepath}`);
    console.log(`\nSummary:`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Events: ${allEvents.length}`);
    console.log(`  - Setup Complete: ${result.finalState.setupComplete}`);

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
    const filename = `setup-phase-test-error-${timestamp}.txt`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, errorLog, 'utf-8');

    console.error('\n❌ Test failed!');
    console.error(`📄 Error logs written to: ${filepath}`);
    console.error(error);
    
    process.exit(1);
  }
}

main().catch(console.error);

