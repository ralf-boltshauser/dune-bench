/**
 * Tests for force mutations
 */

import { Faction, TerritoryId, STRONGHOLD_TERRITORIES } from '../../../types';
import {
  shipForces,
  moveForces,
  sendForcesToTanks,
  reviveForces,
  sendForcesToReserves,
} from '../../mutations/forces';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import {
  expectForcesInReserves,
  expectForcesOnBoard,
  expectForcesAtLocation,
  expectForcesInTanks,
  expectNoForcesAtLocation,
  expectEliteRevivedThisTurn,
} from '../helpers/assertion-helpers';

/**
 * Test shipForces
 */
function testShipForces() {
  console.log('\n=== Testing shipForces ===');

  // Test: Ship regular forces from reserves to territory
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInReserves(Faction.ATREIDES, 10, 0)
    .build();

  const result1 = shipForces(state1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3);
  expectForcesInReserves(result1, Faction.ATREIDES, { regular: 7, elite: 0 });
  expectForcesAtLocation(result1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 3 });
  console.log('✓ Ship regular forces from reserves to territory');

  // Test: Ship elite forces
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInReserves(Faction.ATREIDES, 10, 5)
    .build();

  const result2 = shipForces(state2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2, true);
  expectForcesInReserves(result2, Faction.ATREIDES, { regular: 10, elite: 3 });
  expectForcesAtLocation(result2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 0, elite: 2 });
  console.log('✓ Ship elite forces from reserves to territory');

  // Test: Ship to stronghold territory
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInReserves(Faction.ATREIDES, 10, 0)
    .build();

  const stronghold = STRONGHOLD_TERRITORIES[0];
  const result3 = shipForces(state3, Faction.ATREIDES, stronghold, 1, 2);
  expectForcesAtLocation(result3, Faction.ATREIDES, stronghold, 1, { regular: 2 });
  console.log('✓ Ship to stronghold territory');

  // Test: Bene Gesserit ship as fighters (normal shipment)
  const state4 = buildTestState()
    .withFactions([Faction.BENE_GESSERIT, Faction.ATREIDES])
    .withForcesInReserves(Faction.BENE_GESSERIT, { regular: 10, elite: 0 })
    .build();

  const result4 = shipForces(state4, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 1, 3, false, false);
  expectForcesAtLocation(result4, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 1, { regular: 3, advisors: 0 });
  console.log('✓ Bene Gesserit: Ship as fighters (normal shipment)');

  // Test: Bene Gesserit ship as advisors (Spiritual Advisor ability)
  // Note: When shipping as advisors, addToStack adds both regular forces (count) and advisors (advisorCount)
  // This is the current implementation behavior
  const state5 = buildTestState()
    .withFactions([Faction.BENE_GESSERIT, Faction.ATREIDES])
    .withForcesInReserves(Faction.BENE_GESSERIT, 10, 0)
    .build();

  const result5 = shipForces(state5, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 1, 3, false, true);
  expectForcesAtLocation(result5, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 1, { regular: 3, advisors: 3 });
  console.log('✓ Bene Gesserit: Ship as advisors (Spiritual Advisor ability)');

  // Test: Ship to stronghold with 2 other factions (should throw)
  const state6 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
    .withForcesInReserves(Faction.ATREIDES, 10, 0)
    .withStrongholdFull(STRONGHOLD_TERRITORIES[0], Faction.HARKONNEN, Faction.EMPEROR)
    .build();

  try {
    shipForces(state6, Faction.ATREIDES, STRONGHOLD_TERRITORIES[0], 1, 1);
    throw new Error('Expected stronghold occupancy violation, but shipment succeeded');
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (!errorMessage.includes('Stronghold occupancy violation')) {
      throw error;
    }
  }
  console.log('✓ Ship to stronghold with 2 other factions (occupancy limit violation)');

  // Test: Immutability
  const state7 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInReserves(Faction.ATREIDES, 10, 0)
    .build();
  const original7 = cloneStateForTesting(state7);
  const result7 = shipForces(state7, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3);
  verifyStateNotSame(original7, result7);
  expectForcesInReserves(original7, Faction.ATREIDES, { regular: 10, elite: 0 });
  console.log('✓ Immutability verified');

  console.log('✅ All shipForces tests passed\n');
}

/**
 * Test moveForces
 */
function testMoveForces() {
  console.log('\n=== Testing moveForces ===');

  // Test: Move regular forces between territories
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();

  const result1 = moveForces(state1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, TerritoryId.CARTHAG, 1, 3);
  expectForcesAtLocation(result1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 2 });
  expectForcesAtLocation(result1, Faction.ATREIDES, TerritoryId.CARTHAG, 1, { regular: 3 });
  console.log('✓ Move regular forces between territories');

  // Test: Move elite forces
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
      elite: 3,
    })
    .build();

  const result2 = moveForces(state2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, TerritoryId.CARTHAG, 1, 2, true);
  expectForcesAtLocation(result2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 5, elite: 1 });
  expectForcesAtLocation(result2, Faction.ATREIDES, TerritoryId.CARTHAG, 1, { regular: 0, elite: 2 });
  console.log('✓ Move elite forces between territories');

  // Test: Move forces within same territory (repositioning)
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();

  const result3 = moveForces(state3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, TerritoryId.ARRAKEEN, 2, 3);
  expectForcesAtLocation(result3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 2 });
  expectForcesAtLocation(result3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 2, { regular: 3 });
  console.log('✓ Move forces within same territory (repositioning)');

  // Test: Move to stronghold with 2 other factions (should throw)
  const state4 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .withStrongholdFull(STRONGHOLD_TERRITORIES[0], Faction.HARKONNEN, Faction.EMPEROR)
    .build();

  try {
    moveForces(state4, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, STRONGHOLD_TERRITORIES[0], 1, 1);
    throw new Error('Expected stronghold occupancy violation, but movement succeeded');
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (!errorMessage.includes('Stronghold occupancy violation')) {
      throw error;
    }
  }
  console.log('✓ Move to stronghold with 2 other factions (occupancy limit)');

  // Test: Immutability
  const state5 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();
  const original5 = cloneStateForTesting(state5);
  const result5 = moveForces(state5, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, TerritoryId.CARTHAG, 1, 3);
  verifyStateNotSame(original5, result5);
  expectForcesAtLocation(original5, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 5 });
  console.log('✓ Immutability verified');

  console.log('✅ All moveForces tests passed\n');
}

/**
 * Test sendForcesToTanks
 */
function testSendForcesToTanks() {
  console.log('\n=== Testing sendForcesToTanks ===');

  // Test: Send regular forces to tanks (legacy mode)
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();

  const result1 = sendForcesToTanks(state1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3, false, true);
  expectForcesAtLocation(result1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 2 });
  expectForcesInTanks(result1, Faction.ATREIDES, { regular: 3 });
  console.log('✓ Send regular forces to tanks (legacy mode)');

  // Test: Send elite forces to tanks (legacy mode)
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
      elite: 3,
    })
    .build();

  const result2 = sendForcesToTanks(state2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2, true, true);
  expectForcesAtLocation(result2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 5, elite: 1 });
  expectForcesInTanks(result2, Faction.ATREIDES, { regular: 0, elite: 2 });
  console.log('✓ Send elite forces to tanks (legacy mode)');

  // Test: Send forces to tanks (new mode: separate regular/elite counts)
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
      elite: 3,
    })
    .build();

  // New mode: 6 parameters - (state, faction, territory, sector, regularCount, eliteCount)
  // Start with 5 regular, 3 elite. Send 2 regular, 1 elite to tanks. Should have 3 regular, 2 elite remaining.
  const result3 = sendForcesToTanks(state3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2, 1);
  expectForcesAtLocation(result3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 3, elite: 2 });
  expectForcesInTanks(result3, Faction.ATREIDES, { regular: 2, elite: 1 });
  console.log('✓ Send forces to tanks (new mode: separate regular/elite counts)');

  // Test: Send all forces from a stack
  const state4 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 3,
    })
    .build();

  const result4 = sendForcesToTanks(state4, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3, false, true);
  expectNoForcesAtLocation(result4, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1);
  expectForcesInTanks(result4, Faction.ATREIDES, { regular: 3 });
  console.log('✓ Send all forces from a stack');

  // Test: Immutability
  const state5 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();
  const original5 = cloneStateForTesting(state5);
  const result5 = sendForcesToTanks(state5, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3, false, true);
  verifyStateNotSame(original5, result5);
  expectForcesAtLocation(original5, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 5 });
  console.log('✓ Immutability verified');

  console.log('✅ All sendForcesToTanks tests passed\n');
}

/**
 * Test reviveForces
 */
function testReviveForces() {
  console.log('\n=== Testing reviveForces ===');

  // Test: Revive regular forces from tanks to reserves
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInTanks(Faction.ATREIDES, 5, 0)
    .build();

  const result1 = reviveForces(state1, Faction.ATREIDES, 3, false);
  expectForcesInTanks(result1, Faction.ATREIDES, { regular: 2, elite: 0 });
  
  // Check that reserves increased by 3 (don't check exact value since starting reserves may vary)
  const state1Reserves = state1.factions.get(Faction.ATREIDES)!.forces.reserves.regular;
  const result1Reserves = result1.factions.get(Faction.ATREIDES)!.forces.reserves.regular;
  if (result1Reserves !== state1Reserves + 3) {
    throw new Error(
      `Expected reserves to increase by 3 (from ${state1Reserves} to ${state1Reserves + 3}), but got ${result1Reserves}`
    );
  }
  console.log('✓ Revive regular forces from tanks to reserves');

  // Test: Revive elite forces from tanks to reserves
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInTanks(Faction.ATREIDES, 5, 3)
    .build();

  const result2 = reviveForces(state2, Faction.ATREIDES, 2, true);
  expectForcesInTanks(result2, Faction.ATREIDES, { regular: 5, elite: 1 });
  
  // Check that elite reserves increased by 2 (don't check exact value since starting reserves may vary)
  const state2EliteReserves = state2.factions.get(Faction.ATREIDES)!.forces.reserves.elite;
  const result2EliteReserves = result2.factions.get(Faction.ATREIDES)!.forces.reserves.elite;
  if (result2EliteReserves !== state2EliteReserves + 2) {
    throw new Error(
      `Expected elite reserves to increase by 2 (from ${state2EliteReserves} to ${state2EliteReserves + 2}), but got ${result2EliteReserves}`
    );
  }
  console.log('✓ Revive elite forces from tanks to reserves');

  // Test: Fremen track elite forces revived this turn
  const state3 = buildTestState()
    .withFactions([Faction.FREMEN, Faction.ATREIDES])
    .withForcesInTanks(Faction.FREMEN, 5, 3)
    .build();

  const result3 = reviveForces(state3, Faction.FREMEN, 1, true);
  expectEliteRevivedThisTurn(result3, Faction.FREMEN, 1);
  console.log('✓ Fremen: Track elite forces revived this turn');

  // Test: Emperor track elite forces revived this turn
  const state4 = buildTestState()
    .withFactions([Faction.EMPEROR, Faction.ATREIDES])
    .withForcesInTanks(Faction.EMPEROR, 5, 3)
    .build();

  const result4 = reviveForces(state4, Faction.EMPEROR, 1, true);
  expectEliteRevivedThisTurn(result4, Faction.EMPEROR, 1);
  console.log('✓ Emperor: Track elite forces revived this turn');

  // Test: Other factions don't track elite forces revived
  const state5 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInTanks(Faction.ATREIDES, 5, 3)
    .build();

  const result5 = reviveForces(state5, Faction.ATREIDES, 1, true);
  expectEliteRevivedThisTurn(result5, Faction.ATREIDES, 0);
  console.log('✓ Other factions: No tracking needed');

  // Test: Immutability
  const state6 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInTanks(Faction.ATREIDES, 5, 0)
    .build();
  const original6 = cloneStateForTesting(state6);
  const result6 = reviveForces(state6, Faction.ATREIDES, 3, false);
  verifyStateNotSame(original6, result6);
  expectForcesInTanks(original6, Faction.ATREIDES, { regular: 5, elite: 0 });
  console.log('✓ Immutability verified');

  console.log('✅ All reviveForces tests passed\n');
}

/**
 * Test sendForcesToReserves
 */
function testSendForcesToReserves() {
  console.log('\n=== Testing sendForcesToReserves ===');

  // Test: Send regular forces from board to reserves
  // Note: withForces ensures there are enough forces in reserves, so we need to account for that
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();

  const result1 = sendForcesToReserves(state1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3);
  expectForcesAtLocation(result1, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 2 });
  
  // Check that reserves increased by 3 (don't check exact value since starting reserves may vary)
  const state1Reserves = state1.factions.get(Faction.ATREIDES)!.forces.reserves.regular;
  const result1Reserves = result1.factions.get(Faction.ATREIDES)!.forces.reserves.regular;
  if (result1Reserves !== state1Reserves + 3) {
    throw new Error(
      `Expected reserves to increase by 3 (from ${state1Reserves} to ${state1Reserves + 3}), but got ${result1Reserves}`
    );
  }
  console.log('✓ Send regular forces from board to reserves');

  // Test: Send elite forces from board to reserves
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForcesInReserves(Faction.ATREIDES, 0, 0) // Start with 0 reserves
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
      elite: 3,
    })
    .build();

  const result2 = sendForcesToReserves(state2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2, true);
  expectForcesAtLocation(result2, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 5, elite: 1 });
  
  // Check that elite reserves increased by 2 (don't check exact value since starting reserves may vary)
  const state2EliteReserves = state2.factions.get(Faction.ATREIDES)!.forces.reserves.elite;
  const result2EliteReserves = result2.factions.get(Faction.ATREIDES)!.forces.reserves.elite;
  if (result2EliteReserves !== state2EliteReserves + 2) {
    throw new Error(
      `Expected elite reserves to increase by 2 (from ${state2EliteReserves} to ${state2EliteReserves + 2}), but got ${result2EliteReserves}`
    );
  }
  console.log('✓ Send elite forces from board to reserves');

  // Test: Send all forces from a stack
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 3,
    })
    .build();

  const result3 = sendForcesToReserves(state3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3);
  expectNoForcesAtLocation(result3, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1);
  
  // Check that reserves increased by 3 (don't check exact value since starting reserves may vary)
  const state3Reserves = state3.factions.get(Faction.ATREIDES)!.forces.reserves.regular;
  const result3Reserves = result3.factions.get(Faction.ATREIDES)!.forces.reserves.regular;
  if (result3Reserves !== state3Reserves + 3) {
    throw new Error(
      `Expected reserves to increase by 3 (from ${state3Reserves} to ${state3Reserves + 3}), but got ${result3Reserves}`
    );
  }
  console.log('✓ Send all forces from a stack');

  // Test: Immutability
  const state4 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.ARRAKEEN,
      sector: 1,
      regular: 5,
    })
    .build();
  const original4 = cloneStateForTesting(state4);
  const result4 = sendForcesToReserves(state4, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 3);
  verifyStateNotSame(original4, result4);
  expectForcesAtLocation(original4, Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, { regular: 5 });
  console.log('✓ Immutability verified');

  console.log('✅ All sendForcesToReserves tests passed\n');
}

/**
 * Run all force mutation tests
 */
export function runForcesTests() {
  console.log('='.repeat(80));
  console.log('FORCE MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testShipForces();
    testMoveForces();
    testSendForcesToTanks();
    testReviveForces();
    testSendForcesToReserves();
    console.log('✅ All force mutation tests passed!');
  } catch (error) {
    console.error('❌ Force mutation tests failed:', error);
    throw error;
  }
}

