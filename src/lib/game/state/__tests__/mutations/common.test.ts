/**
 * Tests for common mutation utilities
 */

import { Faction, Phase, TerritoryId, type GameActionType } from '../../../types';
import { logAction } from '../../mutations/common';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';

/**
 * Test logAction function
 */
function testLogAction() {
  console.log('\n=== Testing logAction ===');

  // Test: log action to actionLog array
  const state = buildTestState()
    .withPhase(Phase.SHIPMENT_MOVEMENT)
    .withTurn(2)
    .build();
  const originalActionCount = state.actionLog.length;

  const result = logAction(state, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, {
    territory: TerritoryId.ARRAKEEN,
    count: 5,
  });

  if (result.actionLog.length !== originalActionCount + 1) {
    throw new Error(
      `Expected actionLog length ${originalActionCount + 1}, got ${result.actionLog.length}`
    );
  }
  const loggedAction = result.actionLog[result.actionLog.length - 1];
  if (loggedAction.type !== 'FORCES_SHIPPED') {
    throw new Error(`Expected action type FORCES_SHIPPED, got ${loggedAction.type}`);
  }
  if (loggedAction.factionId !== Faction.ATREIDES) {
    throw new Error(`Expected faction ATREIDES, got ${loggedAction.factionId}`);
  }
  if (loggedAction.turn !== 2) {
    throw new Error(`Expected turn 2, got ${loggedAction.turn}`);
  }
  if (loggedAction.phase !== Phase.SHIPMENT_MOVEMENT) {
    throw new Error(`Expected phase SHIPMENT_MOVEMENT, got ${loggedAction.phase}`);
  }
  if (JSON.stringify(loggedAction.data) !== JSON.stringify({ territory: TerritoryId.ARRAKEEN, count: 5 })) {
    throw new Error(`Action data mismatch`);
  }
  if (!loggedAction.id) {
    throw new Error('Action ID should be truthy');
  }
  if (!loggedAction.timestamp || loggedAction.timestamp <= 0) {
    throw new Error('Action timestamp should be greater than 0');
  }
  console.log('✓ Log action to actionLog array');

  // Test: generate unique action IDs
  const state2 = buildTestState().build();
  const result1 = logAction(state2, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, {});
  const result2 = logAction(
    result1,
    'FORCES_SHIPPED' as GameActionType,
    Faction.HARKONNEN,
    {}
  );
  const action1 = result1.actionLog[result1.actionLog.length - 1];
  const action2 = result2.actionLog[result2.actionLog.length - 1];
  if (action1.id === action2.id) {
    throw new Error('Action IDs should be unique');
  }
  console.log('✓ Generate unique action IDs');

  // Test: include turn and phase from state
  const state3 = buildTestState()
    .withPhase(Phase.BATTLE)
    .withTurn(5)
    .build();
  const result3 = logAction(state3, 'BATTLE_STARTED' as GameActionType, null, {});
  const loggedAction3 = result3.actionLog[result3.actionLog.length - 1];
  if (loggedAction3.turn !== 5) {
    throw new Error(`Expected turn 5, got ${loggedAction3.turn}`);
  }
  if (loggedAction3.phase !== Phase.BATTLE) {
    throw new Error(`Expected phase BATTLE, got ${loggedAction3.phase}`);
  }
  console.log('✓ Include turn and phase from state');

  // Test: handle null factionId
  const state4 = buildTestState().build();
  const result4 = logAction(state4, 'PHASE_ADVANCED' as GameActionType, null, {
    from: Phase.STORM,
    to: Phase.SPICE_BLOW,
  });
  const loggedAction4 = result4.actionLog[result4.actionLog.length - 1];
  if (loggedAction4.factionId !== null) {
    throw new Error(`Expected null factionId, got ${loggedAction4.factionId}`);
  }
  console.log('✓ Handle null factionId');

  // Test: handle empty data object
  const state5 = buildTestState().build();
  const result5 = logAction(state5, 'PHASE_ADVANCED' as GameActionType, null, {});
  const loggedAction5 = result5.actionLog[result5.actionLog.length - 1];
  if (JSON.stringify(loggedAction5.data) !== JSON.stringify({})) {
    throw new Error('Expected empty data object');
  }
  console.log('✓ Handle empty data object');

  // Test: handle complex data object
  const state6 = buildTestState().build();
  const complexData = {
    territory: TerritoryId.ARRAKEEN,
    forces: { regular: 5, elite: 2 },
    leaders: ['duke-letto'],
    metadata: { source: 'shipment', cost: 5 },
  };
  const result6 = logAction(state6, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, complexData);
  const loggedAction6 = result6.actionLog[result6.actionLog.length - 1];
  if (JSON.stringify(loggedAction6.data) !== JSON.stringify(complexData)) {
    throw new Error('Complex data object mismatch');
  }
  console.log('✓ Handle complex data object');

  // Test: append to existing actionLog
  const state7 = buildTestState().build();
  const initialState = logAction(state7, 'PHASE_ADVANCED' as GameActionType, null, {});
  const initialCount = initialState.actionLog.length;
  const result7 = logAction(initialState, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, {});
  if (result7.actionLog.length !== initialCount + 1) {
    throw new Error(`Expected ${initialCount + 1} actions, got ${result7.actionLog.length}`);
  }
  console.log('✓ Append to existing actionLog');

  console.log('✅ All logAction tests passed\n');
}

/**
 * Test immutability of logAction
 */
function testLogActionImmutability() {
  console.log('\n=== Testing logAction Immutability ===');

  // Test: should not modify original state
  const state = buildTestState().build();
  const original = cloneStateForTesting(state);

  const result = logAction(state, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, {});

  try {
    verifyStateNotSame(original, result);
  } catch (error) {
    throw new Error(`Immutability check failed: ${(error as Error).message}`);
  }

  // Verify original actionLog unchanged
  if (original.actionLog.length !== state.actionLog.length) {
    throw new Error('Original actionLog was modified');
  }
  console.log('✓ Original state not modified');

  // Test: create new actionLog array
  const state2 = buildTestState().build();
  const result2 = logAction(state2, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, {});
  if (result2.actionLog === state2.actionLog) {
    throw new Error('actionLog array should be different reference');
  }
  console.log('✓ Create new actionLog array');

  // Test: preserve other state properties
  const state3 = buildTestState()
    .withSpice(Faction.ATREIDES, 20)
    .withTurn(3)
    .build();
  const original3 = cloneStateForTesting(state3);
  const result3 = logAction(state3, 'FORCES_SHIPPED' as GameActionType, Faction.ATREIDES, {});

  if (result3.turn !== original3.turn) {
    throw new Error('Turn should be unchanged');
  }
  if (result3.phase !== original3.phase) {
    throw new Error('Phase should be unchanged');
  }
  if (result3.factions.get(Faction.ATREIDES)?.spice !== original3.factions.get(Faction.ATREIDES)?.spice) {
    throw new Error('Faction spice should be unchanged');
  }
  console.log('✓ Preserve other state properties');

  console.log('✅ All immutability tests passed\n');
}

/**
 * Run all common mutation tests
 */
export function runCommonTests() {
  console.log('='.repeat(80));
  console.log('COMMON MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testLogAction();
    testLogActionImmutability();
    console.log('✅ All common mutation tests passed!');
  } catch (error) {
    console.error('❌ Common mutation tests failed:', error);
    throw error;
  }
}
