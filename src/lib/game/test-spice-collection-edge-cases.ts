/**
 * Test spice collection edge cases
 * - Limited spice (can't collect more than available)
 * - Multiple sectors in same territory
 * - No spice (nothing to collect)
 */

import { Faction, TerritoryId } from './types';
import { createGameState } from './state';
import { SpiceCollectionPhaseHandler } from './phases/handlers/spice-collection';
import { addSpiceToTerritory, shipForces } from './state/mutations';

const testFactions = [Faction.ATREIDES, Faction.HARKONNEN];
let state = createGameState({
  factions: testFactions,
});
const handler = new SpiceCollectionPhaseHandler();

console.log('='.repeat(80));
console.log('SPICE COLLECTION EDGE CASES TEST');
console.log('='.repeat(80));

// Clear starting forces
for (const [faction] of state.factions) {
  const factionState = state.factions.get(faction)!;
  factionState.forces.onBoard = [];
}

// Edge case 1: Limited spice - faction has 10 forces but only 5 spice available
console.log('\nEDGE CASE 1: Limited Spice');
console.log('-'.repeat(80));
state = shipForces(state, Faction.ATREIDES, TerritoryId.HAGGA_BASIN, 8, 10);
state = addSpiceToTerritory(state, TerritoryId.HAGGA_BASIN, 8, 5);
console.log('Atreides: 10 forces in Hagga Basin (sector 8) with only 5 spice');
console.log('Expected: Collect only 5 spice (limited by availability)');

// Edge case 2: Multiple sectors - same territory, different sectors
console.log('\nEDGE CASE 2: Multiple Sectors');
console.log('-'.repeat(80));
state = shipForces(state, Faction.HARKONNEN, TerritoryId.ROCK_OUTCROPPINGS, 10, 2);
state = addSpiceToTerritory(state, TerritoryId.ROCK_OUTCROPPINGS, 10, 6);
state = shipForces(state, Faction.HARKONNEN, TerritoryId.ROCK_OUTCROPPINGS, 11, 3);
state = addSpiceToTerritory(state, TerritoryId.ROCK_OUTCROPPINGS, 11, 8);
console.log('Harkonnen: 2 forces in sector 10 (6 spice), 3 forces in sector 11 (8 spice)');
console.log('Expected: Collect 4 spice from sector 10 + 6 spice from sector 11 = 10 total');

// Edge case 3: No spice to collect
console.log('\nEDGE CASE 3: No Spice');
console.log('-'.repeat(80));
state = shipForces(state, Faction.ATREIDES, TerritoryId.TUEKS_SIETCH, 15, 5);
console.log('Atreides: 5 forces in Tueks Sietch with 0 spice');
console.log('Expected: Collect 0 spice');

const initialAtreides = state.factions.get(Faction.ATREIDES)!.spice;
const initialHarkonnen = state.factions.get(Faction.HARKONNEN)!.spice;

console.log('\n' + '='.repeat(80));
console.log('RUNNING SPICE COLLECTION');
console.log('='.repeat(80));

const result = handler.initialize(state);

console.log('\nEVENTS:');
for (const event of result.events) {
  console.log(`  - ${event.message}`);
}

const finalAtreides = result.state.factions.get(Faction.ATREIDES)!.spice;
const finalHarkonnen = result.state.factions.get(Faction.HARKONNEN)!.spice;

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION:');
console.log('='.repeat(80));

// Verify edge case 1: Limited spice
const atreidesDelta = finalAtreides - initialAtreides;
const limitedSpicePass = atreidesDelta === 5;
console.log(`✓ Edge Case 1 - Limited spice: Collected ${atreidesDelta} (expected 5): ${limitedSpicePass ? 'PASS' : 'FAIL'}`);

// Verify edge case 2: Multiple sectors
const harkonnenDelta = finalHarkonnen - initialHarkonnen;
const multipleSectorsPass = harkonnenDelta === 10;
console.log(`✓ Edge Case 2 - Multiple sectors: Collected ${harkonnenDelta} (expected 10): ${multipleSectorsPass ? 'PASS' : 'FAIL'}`);

// Verify edge case 3: No spice (Atreides shouldn't collect from Tueks Sietch)
const eventCount = result.events.length;
const expectedEvents = 3; // Hagga Basin + 2 sectors in Rock Outcroppings
const noSpicePass = eventCount === expectedEvents;
console.log(`✓ Edge Case 3 - No spice: ${eventCount} collection events (expected ${expectedEvents}): ${noSpicePass ? 'PASS' : 'FAIL'}`);

const allPassed = limitedSpicePass && multipleSectorsPass && noSpicePass;
console.log('\n' + (allPassed ? '✓ ALL EDGE CASE TESTS PASSED' : '✗ SOME EDGE CASE TESTS FAILED'));
console.log('='.repeat(80));

process.exit(allPassed ? 0 : 1);
