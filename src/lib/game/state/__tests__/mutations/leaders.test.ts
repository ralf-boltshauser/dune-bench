/**
 * Tests for leader mutations
 */

import { Faction, TerritoryId, LeaderLocation } from '../../../types';
import {
  killLeader,
  reviveLeader,
  markLeaderUsed,
  resetLeaderTurnState,
} from '../../mutations/leaders';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import {
  expectLeaderLocation,
  expectLeaderState,
  expectLeaderKilled,
  expectLeaderUsed,
  expectLeaderInPool,
  expectLeaderInTanks,
  expectLeaderOnBoard,
} from '../helpers/assertion-helpers';

/**
 * Test killLeader
 */
function testKillLeader() {
  console.log('\n=== Testing killLeader ===');

  // Test: Kill leader (send to tanks) - first kill
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const factionState1 = state1.factions.get(Faction.ATREIDES)!;
  const leaderId = factionState1.leaders[0]?.definitionId;
  if (!leaderId) {
    console.log('⚠ Skipping killLeader test: no leaders available');
    return;
  }

  const result1 = killLeader(state1, Faction.ATREIDES, leaderId);
  expectLeaderInTanks(result1, Faction.ATREIDES, leaderId, true); // Face up (first kill)
  expectLeaderKilled(result1, Faction.ATREIDES, leaderId, true);
  console.log('✓ Kill leader (send to tanks) - first kill');

  // Test: Kill already-killed leader (second kill)
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderKilled(Faction.ATREIDES, leaderId, 1)
    .build();

  const result2 = killLeader(state2, Faction.ATREIDES, leaderId);
  expectLeaderInTanks(result2, Faction.ATREIDES, leaderId, false); // Face down (subsequent kill)
  console.log('✓ Kill already-killed leader (second kill)');

  // Test: Leader with ON_BOARD location is protected (not killed)
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderUsed(Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN)
    .build();

  const result3 = killLeader(state3, Faction.ATREIDES, leaderId, false);
  expectLeaderOnBoard(result3, Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN);
  console.log('✓ Leader with ON_BOARD location is protected (not killed)');

  // Test: Protected leader with allowProtected=true → killed
  const state4 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderUsed(Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN)
    .build();

  const result4 = killLeader(state4, Faction.ATREIDES, leaderId, true);
  expectLeaderInTanks(result4, Faction.ATREIDES, leaderId, true);
  console.log('✓ Protected leader with allowProtected=true → killed');

  // Test: Leader usedThisTurn set to false
  const state5 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderUsed(Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN)
    .build();

  const result5 = killLeader(state5, Faction.ATREIDES, leaderId, true);
  expectLeaderUsed(result5, Faction.ATREIDES, leaderId, false);
  console.log('✓ Leader usedThisTurn set to false');

  // Test: Immutability
  const state6 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();
  const original6 = cloneStateForTesting(state6);
  const result6 = killLeader(state6, Faction.ATREIDES, leaderId);
  verifyStateNotSame(original6, result6);
  expectLeaderInPool(original6, Faction.ATREIDES, leaderId);
  console.log('✓ Immutability verified');

  console.log('✅ All killLeader tests passed\n');
}

/**
 * Test reviveLeader
 */
function testReviveLeader() {
  console.log('\n=== Testing reviveLeader ===');

  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const factionState1 = state1.factions.get(Faction.ATREIDES)!;
  const leaderId = factionState1.leaders[0]?.definitionId;
  if (!leaderId) {
    console.log('⚠ Skipping reviveLeader test: no leaders available');
    return;
  }

  // Test: Revive leader from tanks
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderKilled(Faction.ATREIDES, leaderId, 1)
    .build();

  const result2 = reviveLeader(state2, Faction.ATREIDES, leaderId);
  expectLeaderInPool(result2, Faction.ATREIDES, leaderId);
  console.log('✓ Revive leader from tanks');

  // Test: Immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderKilled(Faction.ATREIDES, leaderId, 1)
    .build();
  const original3 = cloneStateForTesting(state3);
  const result3 = reviveLeader(state3, Faction.ATREIDES, leaderId);
  verifyStateNotSame(original3, result3);
  expectLeaderInTanks(original3, Faction.ATREIDES, leaderId, true);
  console.log('✓ Immutability verified');

  console.log('✅ All reviveLeader tests passed\n');
}

/**
 * Test markLeaderUsed
 */
function testMarkLeaderUsed() {
  console.log('\n=== Testing markLeaderUsed ===');

  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const factionState1 = state1.factions.get(Faction.ATREIDES)!;
  const leaderId = factionState1.leaders[0]?.definitionId;
  if (!leaderId) {
    console.log('⚠ Skipping markLeaderUsed test: no leaders available');
    return;
  }

  // Test: Mark leader as used in battle
  const result1 = markLeaderUsed(state1, Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN);
  expectLeaderOnBoard(result1, Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN);
  expectLeaderUsed(result1, Faction.ATREIDES, leaderId, true);
  console.log('✓ Mark leader as used in battle');

  // Test: Immutability
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();
  const original2 = cloneStateForTesting(state2);
  const result2 = markLeaderUsed(state2, Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN);
  verifyStateNotSame(original2, result2);
  expectLeaderInPool(original2, Faction.ATREIDES, leaderId);
  console.log('✓ Immutability verified');

  console.log('✅ All markLeaderUsed tests passed\n');
}

/**
 * Test resetLeaderTurnState
 */
function testResetLeaderTurnState() {
  console.log('\n=== Testing resetLeaderTurnState ===');

  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const factionState1 = state1.factions.get(Faction.ATREIDES)!;
  const leaderId = factionState1.leaders[0]?.definitionId;
  if (!leaderId) {
    console.log('⚠ Skipping resetLeaderTurnState test: no leaders available');
    return;
  }

  // Test: Reset leader turn state
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderUsed(Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN)
    .build();

  const result2 = resetLeaderTurnState(state2, Faction.ATREIDES, leaderId);
  expectLeaderUsed(result2, Faction.ATREIDES, leaderId, false);
  console.log('✓ Reset leader turn state');

  // Test: Immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withLeaderUsed(Faction.ATREIDES, leaderId, TerritoryId.ARRAKEEN)
    .build();
  const original3 = cloneStateForTesting(state3);
  const result3 = resetLeaderTurnState(state3, Faction.ATREIDES, leaderId);
  verifyStateNotSame(original3, result3);
  expectLeaderUsed(original3, Faction.ATREIDES, leaderId, true);
  console.log('✓ Immutability verified');

  console.log('✅ All resetLeaderTurnState tests passed\n');
}

/**
 * Run all leader mutation tests
 */
export function runLeadersTests() {
  console.log('='.repeat(80));
  console.log('LEADER MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testKillLeader();
    testReviveLeader();
    testMarkLeaderUsed();
    testResetLeaderTurnState();
    console.log('✅ All leader mutation tests passed!');
  } catch (error) {
    console.error('❌ Leader mutation tests failed:', error);
    throw error;
  }
}

