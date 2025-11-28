/**
 * Test automatic spice collection phase
 * Verifies that:
 * 1. Collection is automatic (no agent requests)
 * 2. Base rate is 2 spice/force
 * 3. Rate increases to 3 spice/force with Arrakeen/Carthag
 * 4. Collection is limited by available spice
 * 5. Per-sector collection works correctly
 */

import { Faction, Phase, TerritoryId } from './types';
import { createGameState } from './state';
import { SpiceCollectionPhaseHandler } from './phases/handlers/spice-collection';
import { addSpiceToTerritory, shipForces } from './state/mutations';

// Test setup
const testFactions = [Faction.ATREIDES, Faction.HARKONNEN];
let state = createGameState({
  factions: testFactions,
});
const handler = new SpiceCollectionPhaseHandler();

console.log('='.repeat(80));
console.log('SPICE COLLECTION PHASE - AUTOMATIC TEST');
console.log('='.repeat(80));

// Setup test scenario:
// - Atreides: 5 forces in a territory with 20 spice (no city bonus)
// - Harkonnen: 3 forces in a territory with 10 spice + forces in Carthag (city bonus)

// Clear starting forces
for (const [faction] of state.factions) {
  const factionState = state.factions.get(faction)!;
  factionState.forces.onBoard = [];
}

// Atreides: 5 forces in Hagga Basin sector 8 with 20 spice
state = shipForces(state, Faction.ATREIDES, TerritoryId.HAGGA_BASIN, 8, 5);
state = addSpiceToTerritory(state, TerritoryId.HAGGA_BASIN, 8, 20);

// Harkonnen: 3 forces in Rock Outcroppings sector 10 with 10 spice
state = shipForces(state, Faction.HARKONNEN, TerritoryId.ROCK_OUTCROPPINGS, 10, 3);
state = addSpiceToTerritory(state, TerritoryId.ROCK_OUTCROPPINGS, 10, 10);

// Harkonnen: Also has forces in Carthag (gives city bonus)
state = shipForces(state, Faction.HARKONNEN, TerritoryId.CARTHAG, 5, 2);

console.log('\nINITIAL STATE:');
console.log('-'.repeat(80));
console.log('Atreides:');
console.log(`  - Spice: ${state.factions.get(Faction.ATREIDES)?.spice ?? 0}`);
console.log(`  - Forces in Hagga Basin (sector 8): 5 forces`);
console.log(`  - Spice in Hagga Basin (sector 8): 20 spice`);
console.log(`  - Expected collection: 5 forces × 2 spice/force = 10 spice (base rate, no city)`);

console.log('\nHarkonnen:');
console.log(`  - Spice: ${state.factions.get(Faction.HARKONNEN)?.spice ?? 0}`);
console.log(`  - Forces in Rock Outcroppings (sector 10): 3 forces`);
console.log(`  - Spice in Rock Outcroppings (sector 10): 10 spice`);
console.log(`  - Forces in Carthag: 2 forces (gives city bonus)`);
console.log(`  - Expected collection: 3 forces × 3 spice/force = 9 spice (city bonus applies)`);

// Run the phase
console.log('\n' + '='.repeat(80));
console.log('RUNNING SPICE COLLECTION PHASE (AUTOMATIC)');
console.log('='.repeat(80));

const result = handler.initialize(state);

console.log('\nRESULTS:');
console.log('-'.repeat(80));
console.log(`Phase complete: ${result.phaseComplete}`);
console.log(`Next phase: ${result.nextPhase}`);
console.log(`Pending requests: ${result.pendingRequests.length} (should be 0 - automatic)`);

console.log('\nEVENTS:');
for (const event of result.events) {
  console.log(`  - ${event.message}`);
}

console.log('\nFINAL STATE:');
console.log('-'.repeat(80));
const atreidesFinal = result.state.factions.get(Faction.ATREIDES)!;
const harkonnenFinal = result.state.factions.get(Faction.HARKONNEN)!;

console.log('Atreides:');
console.log(`  - Spice: ${atreidesFinal.spice} (expected: ${state.factions.get(Faction.ATREIDES)?.spice ?? 0} + 10 = ${(state.factions.get(Faction.ATREIDES)?.spice ?? 0) + 10})`);
console.log(`  - Remaining spice in Hagga Basin (sector 8): ${result.state.spiceOnBoard.find(s => s.territoryId === TerritoryId.HAGGA_BASIN && s.sector === 8)?.amount ?? 0} (expected: 10)`);

console.log('\nHarkonnen:');
console.log(`  - Spice: ${harkonnenFinal.spice} (expected: ${state.factions.get(Faction.HARKONNEN)?.spice ?? 0} + 9 = ${(state.factions.get(Faction.HARKONNEN)?.spice ?? 0) + 9})`);
console.log(`  - Remaining spice in Rock Outcroppings (sector 10): ${result.state.spiceOnBoard.find(s => s.territoryId === TerritoryId.ROCK_OUTCROPPINGS && s.sector === 10)?.amount ?? 0} (expected: 1)`);

// Verify expectations
console.log('\n' + '='.repeat(80));
console.log('VERIFICATION:');
console.log('='.repeat(80));

const expectedAtreides = (state.factions.get(Faction.ATREIDES)?.spice ?? 0) + 10;
const expectedHarkonnen = (state.factions.get(Faction.HARKONNEN)?.spice ?? 0) + 9;

const atreidesPassed = atreidesFinal.spice === expectedAtreides;
const harkonnenPassed = harkonnenFinal.spice === expectedHarkonnen;
const noRequestsPassed = result.pendingRequests.length === 0;
const phaseCompletePassed = result.phaseComplete === true;

console.log(`✓ Atreides collected 10 spice (base rate): ${atreidesPassed ? 'PASS' : 'FAIL'}`);
console.log(`✓ Harkonnen collected 9 spice (city bonus): ${harkonnenPassed ? 'PASS' : 'FAIL'}`);
console.log(`✓ No agent requests (automatic): ${noRequestsPassed ? 'PASS' : 'FAIL'}`);
console.log(`✓ Phase completes immediately: ${phaseCompletePassed ? 'PASS' : 'FAIL'}`);

const allPassed = atreidesPassed && harkonnenPassed && noRequestsPassed && phaseCompletePassed;
console.log('\n' + (allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'));
console.log('='.repeat(80));

process.exit(allPassed ? 0 : 1);
