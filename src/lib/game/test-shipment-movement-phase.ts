#!/usr/bin/env npx tsx

/**
 * Test Shipment & Movement Phase with 6 Factions
 *
 * Runs the game until the Shipment/Movement phase and captures all logs to a file.
 * Usage: npx tsx src/lib/game/test-shipment-movement-phase.ts
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
    Faction.FREMEN,
    Faction.SPACING_GUILD,
    Faction.BENE_GESSERIT,
    Faction.EMPEROR,
  ];

  console.log('🧪 Testing Shipment & Movement Phase');
  console.log(`Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}\n`);

  const logCapture = new LogCapture();

  try {
    await runDuneGame({
      factions,
      maxTurns: 1,
      stopAfter: Phase.SHIPMENT_MOVEMENT,
      agentConfig: { verbose: true },
    });

    logCapture.restore();

    // Write logs to file
    const timestamp = Date.now();
    const outputFile = join(process.cwd(), `shipment-movement-phase-test-${timestamp}.txt`);
    writeFileSync(outputFile, logCapture.getLogText(), 'utf-8');

    console.log(`\n✅ Test complete!`);
    console.log(`📄 Logs written to: ${outputFile}\n`);

    // Analyze logs
    const logText = logCapture.getLogText();
    
    console.log('📋 Verification Checklist:');
    console.log(`  ✅ Storm order processing: ${logText.includes('Storm Order:') ? '✅' : '❌'}`);
    console.log(`  ✅ Shipment sub-phase: ${logText.includes('SHIPMENT:') ? '✅' : '❌'}`);
    console.log(`  ✅ Movement sub-phase: ${logText.includes('MOVEMENT:') ? '✅' : '❌'}`);
    console.log(`  ✅ One shipment per turn: ${logText.includes('already shipped') ? '✅' : '⚠️  (check manually)'}`);
    console.log(`  ✅ One movement per turn: ${logText.includes('already moved') ? '✅' : '⚠️  (check manually)'}`);
    console.log(`  ✅ Alliance constraint: ${logText.includes('alliance constraint') ? '✅' : '⚠️  (no alliances formed)'}`);
    console.log(`  ✅ Ornithopter movement: ${logText.includes('Ornithopters') ? '✅' : '⚠️  (check manually)'}`);
    console.log(`  ✅ Storm restrictions: ${logText.includes('Storm Sector:') ? '✅' : '❌'}`);
    
    // Spacing Guild specific checks
    const hasGuild = factions.includes(Faction.SPACING_GUILD);
    if (hasGuild) {
      console.log(`\n🎯 Spacing Guild Timing Ability Checks:`);
      console.log(`  ✅ Guild timing decision asked: ${logText.includes('SPACING GUILD TIMING DECISION') || logText.includes('GUILD TIMING DECISION') ? '✅' : '❌'}`);
      console.log(`  ✅ Guild can act out of order: ${logText.includes('Acting out of order') || logText.includes('SHIP AS IT PLEASES YOU') ? '✅' : '⚠️  (check manually)'}`);
      console.log(`  ✅ Guild does both shipment and movement: ${logText.includes('Guild will do BOTH') || logText.includes('both shipment and movement') ? '✅' : '⚠️  (check manually)'}`);
      console.log(`  ✅ Guild tools available: ${logText.includes('guild_act_now') || logText.includes('guild_wait') ? '✅' : '⚠️  (check logs)'}`);
    }
    
  } catch (error) {
    logCapture.restore();
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
main().catch(console.error);

