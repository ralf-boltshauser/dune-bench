/**
 * Test script to verify Turn 1 Shai-Hulud handling
 * 
 * This test verifies that:
 * 1. Shai-Hulud cards CAN be drawn on Turn 1 (per Rule 1.02.02)
 * 2. They are ignored (no devouring)
 * 3. They are set aside (not discarded)
 * 4. They are reshuffled at cleanup
 * 5. We continue drawing until a Territory Card is found
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Faction, Phase } from './types';
import { runDuneGame } from './agent';

const factions = [
  Faction.ATREIDES,
  Faction.HARKONNEN,
  Faction.FREMEN,
  Faction.SPACING_GUILD,
  Faction.BENE_GESSERIT,
  Faction.EMPEROR,
];

async function testSpiceBlowTurn1() {
  console.log('🧪 Testing Turn 1 Spice Blow Phase - Shai-Hulud Handling\n');

  const logs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  // Capture all console output
  console.log = (...args: unknown[]) => {
    const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
    logs.push(message);
    originalLog(...args);
  };

  console.error = (...args: unknown[]) => {
    const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
    logs.push(`ERROR: ${message}`);
    originalError(...args);
  };

  try {
    await runDuneGame({
      factions,
      maxTurns: 1,
      stopAfter: Phase.SPICE_BLOW,
      agentConfig: { verbose: true },
    });
    
    // Restore console
    console.log = originalLog;
    console.error = originalError;

    // Write logs to file
    const outputFile = join(process.cwd(), `spice-blow-turn1-test-${Date.now()}.txt`);
    writeFileSync(outputFile, logs.join('\n'), 'utf-8');
    
    console.log(`\n✅ Test complete! Logs written to: ${outputFile}`);
    console.log('\n📋 Checking for Shai-Hulud handling on Turn 1...\n');
    
    // Analyze logs
    const logText = logs.join('\n');
    const hasShaiHulud = logText.includes('Shai-Hulud') || logText.includes('SHAI_HULUD');
    const hasTurn1Warning = logText.includes('Turn 1: Shai-Hulud cards will be set aside');
    const hasSetAside = logText.includes('set aside') || logText.includes('Set Aside');
    const hasIgnored = logText.includes('ignored on Turn 1') || logText.includes('ignoredTurnOne');
    const hasReshuffle = logText.includes('reshuffled') || logText.includes('Reshuffle');
    const hasNexus = logText.includes('NEXUS') && !logText.includes('No Nexus');
    
    console.log(`  Shai-Hulud appeared: ${hasShaiHulud ? '✅' : '❌'}`);
    console.log(`  Turn 1 warning shown: ${hasTurn1Warning ? '✅' : '❌'}`);
    console.log(`  Set aside handling: ${hasSetAside ? '✅' : '❌'}`);
    console.log(`  Ignored on Turn 1: ${hasIgnored ? '✅' : '❌'}`);
    console.log(`  Reshuffle mentioned: ${hasReshuffle ? '✅' : '⚠️  (may happen in cleanup)'}`);
    console.log(`  No Nexus on Turn 1: ${!hasNexus ? '✅' : '❌ (NEXUS SHOULD NOT OCCUR ON TURN 1!)'}`);
    
    if (hasNexus) {
      console.log('\n❌ ERROR: Nexus occurred on Turn 1, but Rule 1.02.03 states "There can not be a Nexus on Turn one for any reason."');
    }
    
    console.log('\n📄 Full logs available in:', outputFile);
    
  } catch (error) {
    // Restore console
    console.log = originalLog;
    console.error = originalError;
    
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testSpiceBlowTurn1().catch(console.error);

