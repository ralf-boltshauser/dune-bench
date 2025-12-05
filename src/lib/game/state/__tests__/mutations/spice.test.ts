/**
 * Tests for spice mutations
 */

import { Faction, TerritoryId } from '../../../types';
import {
  addSpice,
  removeSpice,
  transferSpice,
  addSpiceToTerritory,
  removeSpiceFromTerritory,
  destroySpiceInTerritory,
} from '../../mutations/spice';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import { expectSpice, expectTerritorySpice } from '../helpers/assertion-helpers';

/**
 * Test addSpice
 */
function testAddSpice() {
  console.log('\n=== Testing addSpice ===');

  // Test: add spice to faction with existing spice
  // Atreides starts with 10, we add 10 more = 20, then add 5 = 25
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 10)
    .build();

  const result = addSpice(state, Faction.ATREIDES, 5);
  expectSpice(result, Faction.ATREIDES, 25);
  console.log('✓ Add spice to faction with existing spice');

  // Test: add spice to faction with starting spice
  // Atreides starts with 10, we add 0 more = 10, then add 10 = 20
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 0)
    .build();

  const result2 = addSpice(state2, Faction.ATREIDES, 10);
  expectSpice(result2, Faction.ATREIDES, 20);
  console.log('✓ Add spice to faction with 0 spice');

  // Test: immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 10)
    .withSpice(Faction.HARKONNEN, 20)
    .build();
  const original = cloneStateForTesting(state3);
  const result3 = addSpice(state3, Faction.ATREIDES, 5);
  verifyStateNotSame(original, result3);
  expectSpice(original, Faction.ATREIDES, 20); // Starting 10 + added 10
  expectSpice(original, Faction.HARKONNEN, 30); // Starting 10 + added 20
  console.log('✓ Immutability verified');

  console.log('✅ All addSpice tests passed\n');
}

/**
 * Test removeSpice
 */
function testRemoveSpice() {
  console.log('\n=== Testing removeSpice ===');

  // Test: remove spice from faction with sufficient spice
  // Atreides starts with 10, we add 10 = 20, remove 5 = 15
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 10)
    .build();

  const result = removeSpice(state, Faction.ATREIDES, 5);
  expectSpice(result, Faction.ATREIDES, 15);
  console.log('✓ Remove spice from faction with sufficient spice');

  // Test: clamp to 0 when removing more than available
  // Atreides starts with 10, we add 10 = 20, remove 25 = 0 (clamped)
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 10)
    .build();

  const result2 = removeSpice(state2, Faction.ATREIDES, 25);
  expectSpice(result2, Faction.ATREIDES, 0);
  console.log('✓ Clamp to 0 when removing more than available');

  // Test: immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 10)
    .build();
  const original = cloneStateForTesting(state3);
  const result3 = removeSpice(state3, Faction.ATREIDES, 5);
  verifyStateNotSame(original, result3);
  expectSpice(original, Faction.ATREIDES, 20); // Starting 10 + added 10
  console.log('✓ Immutability verified');

  console.log('✅ All removeSpice tests passed\n');
}

/**
 * Test transferSpice
 */
function testTransferSpice() {
  console.log('\n=== Testing transferSpice ===');

  // Test: transfer spice between two factions
  // Atreides: starts 10 + add 10 = 20, transfer 5 = 15
  // Harkonnen: starts 10 + add 20 = 30, receive 5 = 35
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withSpice(Faction.ATREIDES, 10)
    .withSpice(Faction.HARKONNEN, 20)
    .build();

  const result = transferSpice(state, Faction.ATREIDES, Faction.HARKONNEN, 5);
  expectSpice(result, Faction.ATREIDES, 15);
  expectSpice(result, Faction.HARKONNEN, 35);
  console.log('✓ Transfer spice between two factions');

  // Test: immutability
  // All factions start with 10 spice
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
    .withSpice(Faction.ATREIDES, 10)
    .withSpice(Faction.HARKONNEN, 20)
    .withSpice(Faction.EMPEROR, 30)
    .build();
  const original = cloneStateForTesting(state2);
  const result2 = transferSpice(state2, Faction.ATREIDES, Faction.HARKONNEN, 5);
  verifyStateNotSame(original, result2);
  expectSpice(original, Faction.EMPEROR, 40); // Starting 10 + added 30
  expectSpice(result2, Faction.EMPEROR, 40); // Unchanged by transfer
  console.log('✓ Immutability verified');

  console.log('✅ All transferSpice tests passed\n');
}

/**
 * Test addSpiceToTerritory
 */
function testAddSpiceToTerritory() {
  console.log('\n=== Testing addSpiceToTerritory ===');

  // Test: add spice to empty territory/sector
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const result = addSpiceToTerritory(state, TerritoryId.GREAT_FLAT, 1, 5);
  expectTerritorySpice(result, TerritoryId.GREAT_FLAT, 1, 5);
  console.log('✓ Add spice to empty territory/sector');

  // Test: increment spice in existing location
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 1, 5)
    .build();

  const result2 = addSpiceToTerritory(state2, TerritoryId.GREAT_FLAT, 1, 3);
  expectTerritorySpice(result2, TerritoryId.GREAT_FLAT, 1, 8);
  console.log('✓ Increment spice in existing location');

  // Test: immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 1, 5)
    .withTerritorySpice(TerritoryId.ROCK_OUTCROPPINGS, 1, 10)
    .build();
  const original = cloneStateForTesting(state3);
  const result3 = addSpiceToTerritory(state3, TerritoryId.GREAT_FLAT, 1, 3);
  verifyStateNotSame(original, result3);
  expectTerritorySpice(original, TerritoryId.ROCK_OUTCROPPINGS, 1, 10);
  expectTerritorySpice(result3, TerritoryId.ROCK_OUTCROPPINGS, 1, 10);
  console.log('✓ Immutability verified');

  console.log('✅ All addSpiceToTerritory tests passed\n');
}

/**
 * Test removeSpiceFromTerritory
 */
function testRemoveSpiceFromTerritory() {
  console.log('\n=== Testing removeSpiceFromTerritory ===');

  // Test: remove spice from territory/sector
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 1, 10)
    .build();

  const result = removeSpiceFromTerritory(state, TerritoryId.GREAT_FLAT, 1, 5);
  expectTerritorySpice(result, TerritoryId.GREAT_FLAT, 1, 5);
  console.log('✓ Remove spice from territory/sector');

  // Test: remove all spice and delete entry
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 1, 5)
    .build();

  const result2 = removeSpiceFromTerritory(state2, TerritoryId.GREAT_FLAT, 1, 5);
  const spice = result2.spiceOnBoard.find(
    (s) => s.territoryId === TerritoryId.GREAT_FLAT && s.sector === 1
  );
  if (spice) {
    throw new Error('Spice entry should be removed when amount reaches 0');
  }
  console.log('✓ Remove all spice and delete entry');

  console.log('✅ All removeSpiceFromTerritory tests passed\n');
}

/**
 * Test destroySpiceInTerritory
 */
function testDestroySpiceInTerritory() {
  console.log('\n=== Testing destroySpiceInTerritory ===');

  // Test: destroy all spice in territory (sector undefined)
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 1, 5)
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 2, 3)
    .build();

  const result = destroySpiceInTerritory(state, TerritoryId.GREAT_FLAT);
  const spice = result.spiceOnBoard.filter(
    (s) => s.territoryId === TerritoryId.GREAT_FLAT
  );
  if (spice.length !== 0) {
    throw new Error(`Expected no spice in territory, but found ${spice.length} entries`);
  }
  console.log('✓ Destroy all spice in territory');

  // Test: destroy spice in specific sector
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 1, 5)
    .withTerritorySpice(TerritoryId.GREAT_FLAT, 2, 3)
    .build();

  const result2 = destroySpiceInTerritory(state2, TerritoryId.GREAT_FLAT, 1);
  expectTerritorySpice(result2, TerritoryId.GREAT_FLAT, 2, 3);
  const spice1 = result2.spiceOnBoard.find(
    (s) => s.territoryId === TerritoryId.GREAT_FLAT && s.sector === 1
  );
  if (spice1) {
    throw new Error('Sector 1 spice should be destroyed');
  }
  console.log('✓ Destroy spice in specific sector');

  console.log('✅ All destroySpiceInTerritory tests passed\n');
}

/**
 * Run all spice mutation tests
 */
export function runSpiceTests() {
  console.log('='.repeat(80));
  console.log('SPICE MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testAddSpice();
    testRemoveSpice();
    testTransferSpice();
    testAddSpiceToTerritory();
    testRemoveSpiceFromTerritory();
    testDestroySpiceInTerritory();
    console.log('✅ All spice mutation tests passed!');
  } catch (error) {
    console.error('❌ Spice mutation tests failed:', error);
    throw error;
  }
}
