/**
 * Integration Tests: Sequential Flow
 * 
 * Tests for sequential processing (ship then move per faction).
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { EnhancedAgentResponseBuilder } from '../helpers/agent-response-builder-enhanced';
import { runPhaseScenario } from '../scenarios/base-scenario';
import * as assertions from '../assertions';
import { TEST_FACTIONS, TEST_TERRITORIES, FORCE_PRESETS, SPICE_PRESETS } from '../helpers/fixtures';

/**
 * Test basic sequential flow
 */
export async function testBasicSequentialFlow() {
  console.log('\n=== Testing Basic Sequential Flow ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.BASIC,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5)
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        5
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Basic Sequential Flow',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventEmitted(result.events, 'FORCES_MOVED');
  assertions.assertForcesInTerritory(
    result.state,
    Faction.ATREIDES,
    TEST_TERRITORIES.IMPERIAL_BASIN.id,
    9,
    10 // 5 shipped + 5 moved
  );
  
  console.log('✅ Basic sequential flow test passed\n');
}

/**
 * Test multiple factions in storm order
 */
export async function testMultipleFactionsSequential() {
  console.log('\n=== Testing Multiple Factions Sequential ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.EMPEROR, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.BASIN.id, 9, 3)
      .moveFromTo(
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.ARRAKEEN.id, // Adjacent to Basin
        9,
        3
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .shipTo(TEST_TERRITORIES.CARTHAG.id, 9, 3)
      .moveFromTo(
        TEST_TERRITORIES.CARTHAG.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id, // Adjacent to Carthag
        9,
        3
      )
      .end()
    .forFaction(Faction.EMPEROR)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Multiple Factions Sequential',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertEventCount(result.events, 'FORCES_SHIPPED', 2);
  assertions.assertEventCount(result.events, 'FORCES_MOVED', 2);
  
  // Verify events are in correct order (Atreides before Harkonnen)
  const shipmentEvents = result.events.filter((e) => e.type === 'FORCES_SHIPPED');
  if ((shipmentEvents[0].data as any).faction !== Faction.ATREIDES) {
    throw new Error('Expected first shipment event to be for Atreides');
  }
  if ((shipmentEvents[1].data as any).faction !== Faction.HARKONNEN) {
    throw new Error('Expected second shipment event to be for Harkonnen');
  }
  
  console.log('✅ Multiple factions sequential test passed\n');
}

/**
 * Test passing on shipment but moving
 */
export async function testPassShipmentButMove() {
  console.log('\n=== Testing Pass Shipment But Move ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.BASIC,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    
    .forFaction(Faction.ATREIDES)
      .passShipment()
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        5
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Pass Shipment But Move',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventEmitted(result.events, 'FORCES_MOVED');
  
  console.log('✅ Pass shipment but move test passed\n');
}

/**
 * Test passing on movement but shipping
 */
export async function testPassMovementButShip() {
  console.log('\n=== Testing Pass Movement But Ship ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.BASIC,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5)
      .passMovement()
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Pass Movement But Ship',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  console.log('✅ Pass movement but ship test passed\n');
}

/**
 * Test passing on both
 */
export async function testPassBoth() {
  console.log('\n=== Testing Pass Both ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.BASIC,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    
    .forFaction(Faction.ATREIDES)
      .passBoth()
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Pass Both',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  console.log('✅ Pass both test passed\n');
}

/**
 * Run all sequential flow tests
 */
export async function runSequentialFlowTests() {
  console.log('='.repeat(80));
  console.log('SEQUENTIAL FLOW INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await testBasicSequentialFlow();
    await testMultipleFactionsSequential();
    await testPassShipmentButMove();
    await testPassMovementButShip();
    await testPassBoth();
    console.log('✅ All sequential flow tests passed!');
  } catch (error) {
    console.error('❌ Sequential flow tests failed:', error);
    throw error;
  }
}
