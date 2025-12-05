/**
 * Tests for storm mutations
 */

import { Faction } from '../../../types';
import { moveStorm, updateStormOrder } from '../../mutations';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import { expectStormSector } from '../helpers/assertion-helpers';
import { GAME_CONSTANTS } from '../../../data';

/**
 * Test moveStorm
 */
function testMoveStorm() {
  console.log('\n=== Testing moveStorm ===');

  // Test: move storm to new sector
  const state = buildTestState().build();
  const result = moveStorm(state, 10);
  expectStormSector(result, 10);
  console.log('✓ Move storm to new sector');

  // Test: wrap around using modulo
  const overflowSector = GAME_CONSTANTS.TOTAL_SECTORS + 5;
  const result2 = moveStorm(state, overflowSector);
  expectStormSector(result2, 5);
  console.log('✓ Wrap around using modulo');

  // Test: handle sector 0
  const result3 = moveStorm(state, 0);
  expectStormSector(result3, 0);
  console.log('✓ Handle sector 0');

  // Test: immutability
  const original = cloneStateForTesting(state);
  const originalSector = state.stormSector;
  const result4 = moveStorm(state, 10);
  verifyStateNotSame(original, result4);
  if (original.stormSector !== originalSector) {
    throw new Error('Original state was modified');
  }
  console.log('✓ Immutability verified');

  console.log('✅ All moveStorm tests passed\n');
}

/**
 * Test updateStormOrder
 */
function testUpdateStormOrder() {
  console.log('\n=== Testing updateStormOrder ===');

  // Test: update storm order with new faction array
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
    .build();

  const newOrder = [Faction.EMPEROR, Faction.ATREIDES, Faction.HARKONNEN];
  const result = updateStormOrder(state, newOrder);
  if (JSON.stringify(result.stormOrder) !== JSON.stringify(newOrder)) {
    throw new Error('Storm order not updated correctly');
  }
  console.log('✓ Update storm order with new faction array');

  // Test: handle empty order
  const result2 = updateStormOrder(state, []);
  if (result2.stormOrder.length !== 0) {
    throw new Error('Empty storm order not handled correctly');
  }
  console.log('✓ Handle empty order');

  // Test: immutability
  const original = cloneStateForTesting(state);
  const originalOrder = state.stormOrder;
  const result3 = updateStormOrder(state, newOrder);
  verifyStateNotSame(original, result3);
  if (JSON.stringify(original.stormOrder) !== JSON.stringify(originalOrder)) {
    throw new Error('Original state was modified');
  }
  console.log('✓ Immutability verified');

  console.log('✅ All updateStormOrder tests passed\n');
}

/**
 * Run all storm mutation tests
 */
export function runStormTests() {
  console.log('='.repeat(80));
  console.log('STORM MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testMoveStorm();
    testUpdateStormOrder();
    console.log('✅ All storm mutation tests passed!');
  } catch (error) {
    console.error('❌ Storm mutation tests failed:', error);
    throw error;
  }
}
