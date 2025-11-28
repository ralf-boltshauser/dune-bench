#!/usr/bin/env npx tsx

/**
 * Test BG Spiritual Advisors Ability (Rule 2.02.05)
 *
 * Simplified test to verify that BG is asked about spiritual advisors
 * when another faction ships forces.
 */

// Load environment variables from .env file
import 'dotenv/config';

import { Faction, Phase, FACTION_NAMES, TerritoryId } from './types';
import { runDuneGame, type GameRunnerConfig } from './agent';

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_FOUNDRY_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY or ANTHROPIC_FOUNDRY_API_KEY environment variable is required.');
    process.exit(1);
  }

  // Setup 3 factions: Atreides (will ship), Bene Gesserit (should be asked), and Harkonnen
  const factions: Faction[] = [
    Faction.ATREIDES,
    Faction.BENE_GESSERIT,
    Faction.HARKONNEN,
  ];

  console.log('🧪 Testing BG Spiritual Advisors Ability (Rule 2.02.05)');
  console.log(`Factions: ${factions.map(f => FACTION_NAMES[f]).join(', ')}\n`);
  console.log('Expected behavior:');
  console.log('  1. When Atreides ships forces, BG should be asked about spiritual advisors');
  console.log('  2. BG can send 1 force for FREE to Polar Sink or same territory');
  console.log('  3. When Harkonnen ships forces, BG should be asked again\n');

  try {
    await runDuneGame({
      factions,
      maxTurns: 1,
      stopAfter: Phase.SHIPMENT_MOVEMENT,
      agentConfig: { verbose: true },
    });

    console.log('\n✅ Test complete!');
    console.log('\nVerify in the output above:');
    console.log('  ✓ "BG SPIRITUAL ADVISORS" message appears after non-BG shipments');
    console.log('  ✓ BG is asked: "You may send 1 force for FREE"');
    console.log('  ✓ BG can choose: Polar Sink, same territory, or pass');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
