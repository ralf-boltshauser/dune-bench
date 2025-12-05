/**
 * Unit Tests for AllianceConstraintHandler
 * 
 * Tests 12.6: Alliance constraint application
 */

import { Faction, TerritoryId } from '../../../types';
import { createGameState, formAlliance, getFactionState } from '../../../state';
import { AllianceConstraintHandler } from '../../../phases/handlers/shipment-movement/handlers/alliance-constraints';
import { createForceStack } from '../../../state';

/**
 * Test 12.6.1: Apply Constraint - No Ally
 */
export function testApplyConstraintNoAlly(): boolean {
  console.log('\n🧪 Testing: Apply Constraint - No Ally');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Add forces to same territory
  const atreidesState = getFactionState(gameState, Faction.ATREIDES);
  atreidesState.forces.onBoard.push(
    createForceStack(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, { regular: 5, elite: 0 })
  );

  const harkonnenState = getFactionState(gameState, Faction.HARKONNEN);
  harkonnenState.forces.onBoard.push(
    createForceStack(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, { regular: 3, elite: 0 })
  );

  const handler = new AllianceConstraintHandler();
  const result = handler.applyForFaction(gameState, Faction.ATREIDES, []);

  // Verify no constraint applied (no alliance)
  if (result.events.length > 0) {
    throw new Error('Expected no events when no alliance');
  }

  console.log('✅ Apply Constraint - No Ally passed');
  return true;
}

/**
 * Test 12.6.2: Apply Constraint - With Ally in Same Territory
 */
export function testApplyConstraintWithAlly(): boolean {
  console.log('\n🧪 Testing: Apply Constraint - With Ally in Same Territory');

  let gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Form alliance
  gameState = formAlliance(gameState, Faction.ATREIDES, Faction.HARKONNEN);

  // Add forces to same territory
  const atreidesState = getFactionState(gameState, Faction.ATREIDES);
  atreidesState.forces.onBoard.push(
    createForceStack(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, { regular: 5, elite: 0 })
  );

  const harkonnenState = getFactionState(gameState, Faction.HARKONNEN);
  harkonnenState.forces.onBoard.push(
    createForceStack(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, { regular: 3, elite: 0 })
  );

  const handler = new AllianceConstraintHandler();
  const result = handler.applyForFaction(gameState, Faction.ATREIDES, []);

  // Verify constraint applied
  if (result.events.length === 0) {
    throw new Error('Expected events when alliance constraint applies');
  }

  const event = result.events[0];
  if (event.type !== 'FORCES_SHIPPED') {
    throw new Error(`Expected FORCES_SHIPPED event, got ${event.type}`);
  }

  const eventData = event.data as any;
  if (eventData.reason !== 'alliance_constraint') {
    throw new Error('Expected alliance_constraint reason');
  }

  // Verify forces sent to tanks
  const finalAtreidesState = getFactionState(result.state, Faction.ATREIDES);
  const forcesInTerritory = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === TerritoryId.ARRAKEEN
  );
  if (forcesInTerritory.length > 0) {
    throw new Error('Expected forces to be removed from territory');
  }

  console.log('✅ Apply Constraint - With Ally in Same Territory passed');
  return true;
}

/**
 * Test 12.6.3: Apply Constraint - Polar Sink Exception
 */
export function testApplyConstraintPolarSinkException(): boolean {
  console.log('\n🧪 Testing: Apply Constraint - Polar Sink Exception');

  let gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Form alliance
  gameState = formAlliance(gameState, Faction.ATREIDES, Faction.HARKONNEN);

  // Add forces to Polar Sink (exception)
  const atreidesState = getFactionState(gameState, Faction.ATREIDES);
  atreidesState.forces.onBoard.push(
    createForceStack(Faction.ATREIDES, TerritoryId.POLAR_SINK, 9, { regular: 5, elite: 0 })
  );

  const harkonnenState = getFactionState(gameState, Faction.HARKONNEN);
  harkonnenState.forces.onBoard.push(
    createForceStack(Faction.HARKONNEN, TerritoryId.POLAR_SINK, 9, { regular: 3, elite: 0 })
  );

  const handler = new AllianceConstraintHandler();
  const result = handler.applyForFaction(gameState, Faction.ATREIDES, []);

  // Verify no constraint applied (Polar Sink exception)
  if (result.events.length > 0) {
    throw new Error('Expected no events for Polar Sink (exception)');
  }

  // Verify forces still in territory
  const finalAtreidesState = getFactionState(result.state, Faction.ATREIDES);
  const forcesInTerritory = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === TerritoryId.POLAR_SINK
  );
  if (forcesInTerritory.length === 0) {
    throw new Error('Expected forces to remain in Polar Sink');
  }

  console.log('✅ Apply Constraint - Polar Sink Exception passed');
  return true;
}

/**
 * Test 12.6.4: Apply Constraint - Different Territories
 */
export function testApplyConstraintDifferentTerritories(): boolean {
  console.log('\n🧪 Testing: Apply Constraint - Different Territories');

  let gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Form alliance
  gameState = formAlliance(gameState, Faction.ATREIDES, Faction.HARKONNEN);

  // Add forces to different territories
  const atreidesState = getFactionState(gameState, Faction.ATREIDES);
  atreidesState.forces.onBoard.push(
    createForceStack(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, { regular: 5, elite: 0 })
  );

  const harkonnenState = getFactionState(gameState, Faction.HARKONNEN);
  harkonnenState.forces.onBoard.push(
    createForceStack(Faction.HARKONNEN, TerritoryId.CARTHAG, 9, { regular: 3, elite: 0 })
  );

  const handler = new AllianceConstraintHandler();
  const result = handler.applyForFaction(gameState, Faction.ATREIDES, []);

  // Verify no constraint applied (different territories)
  if (result.events.length > 0) {
    throw new Error('Expected no events when forces in different territories');
  }

  console.log('✅ Apply Constraint - Different Territories passed');
  return true;
}

/**
 * Test 12.6.5: Apply Constraint - Multiple Stacks in Territory
 */
export function testApplyConstraintMultipleStacks(): boolean {
  console.log('\n🧪 Testing: Apply Constraint - Multiple Stacks in Territory');

  let gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Form alliance
  gameState = formAlliance(gameState, Faction.ATREIDES, Faction.HARKONNEN);

  // Add multiple stacks to same territory
  const atreidesState = getFactionState(gameState, Faction.ATREIDES);
  atreidesState.forces.onBoard.push(
    createForceStack(Faction.ATREIDES, TerritoryId.ARRAKEEN, 8, { regular: 3, elite: 0 }),
    createForceStack(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, { regular: 5, elite: 0 })
  );

  const harkonnenState = getFactionState(gameState, Faction.HARKONNEN);
  harkonnenState.forces.onBoard.push(
    createForceStack(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, { regular: 3, elite: 0 })
  );

  const handler = new AllianceConstraintHandler();
  const result = handler.applyForFaction(gameState, Faction.ATREIDES, []);

  // Verify constraint applied to all stacks
  if (result.events.length === 0) {
    throw new Error('Expected events when alliance constraint applies');
  }

  const eventData = result.events[0].data as any;
  const totalForces = eventData.count;
  if (totalForces !== 8) {
    throw new Error(`Expected 8 total forces (3+5), got ${totalForces}`);
  }

  // Verify all forces removed
  const finalAtreidesState = getFactionState(result.state, Faction.ATREIDES);
  const forcesInTerritory = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === TerritoryId.ARRAKEEN
  );
  if (forcesInTerritory.length > 0) {
    throw new Error('Expected all forces to be removed from territory');
  }

  console.log('✅ Apply Constraint - Multiple Stacks in Territory passed');
  return true;
}

/**
 * Run all Alliance Constraint Handler Unit Tests
 */
export function runAllAllianceConstraintTests(): boolean {
  console.log('='.repeat(80));
  console.log('ALLIANCE CONSTRAINT HANDLER UNIT TESTS');
  console.log('='.repeat(80));

  const tests = [
    testApplyConstraintNoAlly,
    testApplyConstraintWithAlly,
    testApplyConstraintPolarSinkException,
    testApplyConstraintDifferentTerritories,
    testApplyConstraintMultipleStacks,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Test failed: ${error}`);
      failed++;
    }
  }

  console.log(`\n✅ Alliance Constraint Handler Tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

