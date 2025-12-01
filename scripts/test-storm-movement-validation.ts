/**
 * Test script to verify storm movement validation fix
 * 
 * This script tests the exact scenario from the bug report:
 * - Harkonnen trying to move from Carthag (sector 10) when sector 10 is in storm
 * - Should be blocked by validation
 */

import { Faction, TerritoryId, Phase } from '../src/lib/game/types';
import { createGameState } from '../src/lib/game/state/factory';
import { moveStorm, shipForces, addSpice } from '../src/lib/game/state';
import { validateMovement } from '../src/lib/game/rules/movement';

// Test 1: Harkonnen trying to move from Carthag (sector 10) when storm is at sector 10
console.log('='.repeat(80));
console.log('TEST 1: Harkonnen moving from Carthag (sector 10) when storm is at sector 10');
console.log('='.repeat(80));

let state = createGameState({
  factions: [Faction.HARKONNEN, Faction.ATREIDES],
});

// Set storm to sector 10 (where Carthag is)
state = moveStorm(state, 10);
console.log(`Storm is at sector: ${state.stormSector}`);

// Add spice and place forces in Carthag
state = addSpice(state, Faction.HARKONNEN, 10);
state = shipForces(state, Faction.HARKONNEN, TerritoryId.CARTHAG, 10, 10, false);

// Try to move from Carthag (sector 10) to Arrakeen (sector 9)
const result = validateMovement(
  state,
  Faction.HARKONNEN,
  TerritoryId.CARTHAG,
  10, // from sector 10 (in storm)
  TerritoryId.ARRAKEEN,
  9,  // to sector 9
  10  // force count
);

console.log('\nValidation Result:');
console.log(`Valid: ${result.valid}`);
if (!result.valid) {
  console.log(`Errors (${result.errors.length}):`);
  result.errors.forEach((error, i) => {
    console.log(`  ${i + 1}. [${error.code}] ${error.message}`);
    if (error.field) {
      console.log(`     Field: ${error.field}`);
    }
  });
}

if (result.valid) {
  console.log('❌ FAIL: Movement was allowed but should be blocked!');
  process.exit(1);
} else {
  const hasSourceStormError = result.errors.some(e => e.code === 'SOURCE_IN_STORM');
  if (hasSourceStormError) {
    console.log('✅ PASS: Movement correctly blocked with SOURCE_IN_STORM error');
  } else {
    console.log('❌ FAIL: Movement blocked but wrong error code');
    process.exit(1);
  }
}

// Test 2: Fremen should be able to move from storm sector
console.log('\n' + '='.repeat(80));
console.log('TEST 2: Fremen moving from storm sector (should be allowed)');
console.log('='.repeat(80));

state = createGameState({
  factions: [Faction.FREMEN, Faction.ATREIDES],
});

// Set storm to sector 10
state = moveStorm(state, 10);
state = addSpice(state, Faction.FREMEN, 10);
state = shipForces(state, Faction.FREMEN, TerritoryId.CARTHAG, 10, 5, false);

const fremenResult = validateMovement(
  state,
  Faction.FREMEN,
  TerritoryId.CARTHAG,
  10, // from sector 10 (in storm)
  TerritoryId.ARRAKEEN,
  9,  // to sector 9
  5   // force count
);

console.log('\nValidation Result:');
console.log(`Valid: ${fremenResult.valid}`);
if (fremenResult.valid) {
  console.log('✅ PASS: Fremen can move through storm (exception works)');
} else {
  console.log('❌ FAIL: Fremen movement blocked but should be allowed!');
  fremenResult.errors.forEach((error, i) => {
    console.log(`  ${i + 1}. [${error.code}] ${error.message}`);
  });
  process.exit(1);
}

// Test 3: Protected stronghold should NOT be exempt from movement restrictions
console.log('\n' + '='.repeat(80));
console.log('TEST 3: Protected stronghold (Carthag) - movement should be blocked when sector in storm');
console.log('='.repeat(80));

// This is the same as Test 1, but let's verify the territory is protected
import { TERRITORY_DEFINITIONS } from '../src/lib/game/types/territories';
const carthagDef = TERRITORY_DEFINITIONS[TerritoryId.CARTHAG];
console.log(`Carthag is protected: ${carthagDef.protectedFromStorm}`);
console.log(`Carthag sectors: ${carthagDef.sectors.join(', ')}`);

// Movement should still be blocked even though Carthag is protected
// (protection prevents destruction, not movement restrictions)
if (!result.valid && result.errors.some(e => e.code === 'SOURCE_IN_STORM')) {
  console.log('✅ PASS: Protected stronghold correctly has movement restrictions when sector is in storm');
} else {
  console.log('❌ FAIL: Protected stronghold incorrectly exempted from movement restrictions');
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('All tests passed! ✅');
console.log('='.repeat(80));

