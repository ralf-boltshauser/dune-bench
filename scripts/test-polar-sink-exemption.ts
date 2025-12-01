/**
 * Test script to verify Polar Sink exemption from storm movement restrictions
 */

import { Faction, TerritoryId } from '../src/lib/game/types';
import { createGameState } from '../src/lib/game/state/factory';
import { moveStorm, shipForces, addSpice } from '../src/lib/game/state';
import { validateMovement } from '../src/lib/game/rules/movement';
import { validateSourceSectorNotInStorm } from '../src/lib/game/rules/storm-validation';
import { TERRITORY_DEFINITIONS } from '../src/lib/game/types/territories';

console.log('='.repeat(80));
console.log('TEST: Polar Sink Exemption from Storm Movement Restrictions');
console.log('='.repeat(80));

// Check Polar Sink definition
const polarSink = TERRITORY_DEFINITIONS[TerritoryId.POLAR_SINK];
console.log(`\nPolar Sink configuration:`);
console.log(`  Sectors: ${polarSink.sectors.length === 0 ? '[] (no sectors)' : polarSink.sectors.join(', ')}`);
console.log(`  Protected from storm: ${polarSink.protectedFromStorm}`);

// Create state with storm at any sector (shouldn't matter for Polar Sink)
let state = createGameState({
  factions: [Faction.ATREIDES, Faction.HARKONNEN],
});

state = moveStorm(state, 10);
console.log(`\nStorm is at sector: ${state.stormSector}`);

// Place forces in Polar Sink
// Note: Polar Sink has no sectors, so we need to use sector 0 as placeholder
state = addSpice(state, Faction.ATREIDES, 10);

// Test validation directly
// Since Polar Sink has no sectors, we can't actually place forces there in the normal way
// But we can test the validation logic with sector 0 (which won't be in Polar Sink's sectors array)
const validationResult = validateSourceSectorNotInStorm(
  state,
  Faction.ATREIDES,
  TerritoryId.POLAR_SINK,
  0 // Use sector 0 as test - should be exempt because Polar Sink has no sectors
);

console.log('\nValidation Result for Polar Sink:');
if (validationResult === null) {
  console.log('✅ PASS: Polar Sink is exempt (validation returns null)');
} else {
  console.log(`❌ FAIL: Polar Sink should be exempt but got error: ${validationResult.message}`);
}

// Verify the logic: Polar Sink has no sectors, so the check should pass
const territory = TERRITORY_DEFINITIONS[TerritoryId.POLAR_SINK];
if (territory && territory.sectors.length === 0) {
  console.log('✅ PASS: Polar Sink correctly has no sectors (exempt from storm)');
} else {
  console.log('❌ FAIL: Polar Sink should have no sectors');
}

// Compare with protected stronghold (should NOT be exempt)
const carthag = TERRITORY_DEFINITIONS[TerritoryId.CARTHAG];
console.log(`\nCarthag configuration:`);
console.log(`  Sectors: ${carthag.sectors.join(', ')}`);
console.log(`  Protected from storm: ${carthag.protectedFromStorm}`);

state = shipForces(state, Faction.ATREIDES, TerritoryId.CARTHAG, 10, 5, false);
const carthagValidation = validateSourceSectorNotInStorm(
  state,
  Faction.ATREIDES,
  TerritoryId.CARTHAG,
  10 // sector 10 (in storm)
);

console.log('\nValidation Result for Carthag (protected stronghold in storm):');
if (carthagValidation !== null && carthagValidation.code === 'SOURCE_IN_STORM') {
  console.log('✅ PASS: Protected stronghold correctly has movement restrictions when sector is in storm');
} else {
  console.log('❌ FAIL: Protected stronghold should have movement restrictions');
}

console.log('\n' + '='.repeat(80));
console.log('Verification complete!');
console.log('='.repeat(80));

