/**
 * Tests for phase mutations
 */

import { Faction, Phase } from '../../../types';
import { setActiveFactions, advancePhase, advanceTurn } from '../../mutations';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import { expectPhase, expectTurn } from '../helpers/assertion-helpers';

/**
 * Test setActiveFactions
 */
function testSetActiveFactions() {
  console.log('\n=== Testing setActiveFactions ===');

  // Test: set active factions list
  const state = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const result = setActiveFactions(state, [Faction.ATREIDES, Faction.HARKONNEN]);
  if (JSON.stringify(result.activeFactions) !== JSON.stringify([Faction.ATREIDES, Faction.HARKONNEN])) {
    throw new Error('Active factions not set correctly');
  }
  console.log('✓ Set active factions list');

  // Test: clear existing active factions when setting new list
  let newState = setActiveFactions(state, [Faction.ATREIDES, Faction.HARKONNEN]);
  const result2 = setActiveFactions(newState, [Faction.EMPEROR]);
  if (JSON.stringify(result2.activeFactions) !== JSON.stringify([Faction.EMPEROR])) {
    throw new Error('Active factions not cleared correctly');
  }
  console.log('✓ Clear existing active factions when setting new list');

  // Test: immutability
  const original = cloneStateForTesting(state);
  const result3 = setActiveFactions(state, [Faction.ATREIDES]);
  verifyStateNotSame(original, result3);
  if (JSON.stringify(original.activeFactions) === JSON.stringify(result3.activeFactions)) {
    throw new Error('Original state was modified');
  }
  console.log('✓ Immutability verified');

  console.log('✅ All setActiveFactions tests passed\n');
}

/**
 * Test advancePhase
 */
function testAdvancePhase() {
  console.log('\n=== Testing advancePhase ===');

  // Test: advance to next phase
  const state = buildTestState()
    .withPhase(Phase.STORM)
    .build();

  const result = advancePhase(state, Phase.SPICE_BLOW);
  expectPhase(result, Phase.SPICE_BLOW);
  console.log('✓ Advance to next phase');

  // Test: clear activeFactions
  let newState = setActiveFactions(state, [Faction.ATREIDES]);
  const result2 = advancePhase(newState, Phase.SPICE_BLOW);
  if (result2.activeFactions.length !== 0) {
    throw new Error('activeFactions should be cleared');
  }
  console.log('✓ Clear activeFactions');

  // Test: immutability
  const original = cloneStateForTesting(state);
  const result3 = advancePhase(state, Phase.SPICE_BLOW);
  verifyStateNotSame(original, result3);
  expectPhase(original, Phase.STORM);
  expectPhase(result3, Phase.SPICE_BLOW);
  console.log('✓ Immutability verified');

  console.log('✅ All advancePhase tests passed\n');
}

/**
 * Test advanceTurn
 */
function testAdvanceTurn() {
  console.log('\n=== Testing advanceTurn ===');

  // Test: increment turn number
  const state = buildTestState()
    .withTurn(1)
    .build();

  const result = advanceTurn(state);
  expectTurn(result, 2);
  console.log('✓ Increment turn number');

  // Test: reset phase to STORM
  const state2 = buildTestState()
    .withPhase(Phase.BATTLE)
    .withTurn(1)
    .build();

  const result2 = advanceTurn(state2);
  expectPhase(result2, Phase.STORM);
  console.log('✓ Reset phase to STORM');

  // Test: immutability
  const original = cloneStateForTesting(state);
  const result3 = advanceTurn(state);
  verifyStateNotSame(original, result3);
  expectTurn(original, 1);
  expectTurn(result3, 2);
  console.log('✓ Immutability verified');

  console.log('✅ All advanceTurn tests passed\n');
}

/**
 * Run all phase mutation tests
 */
export function runPhaseTests() {
  console.log('='.repeat(80));
  console.log('PHASE MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testSetActiveFactions();
    testAdvancePhase();
    testAdvanceTurn();
    console.log('✅ All phase mutation tests passed!');
  } catch (error) {
    console.error('❌ Phase mutation tests failed:', error);
    throw error;
  }
}
