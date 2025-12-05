/**
 * Core Sequential Processing Tests
 * 
 * Tests 1.1-1.5: Basic sequential flow, passing on actions
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';
import {
  TEST_FACTIONS,
  TEST_TERRITORIES,
  FORCE_PRESETS,
  SPICE_PRESETS,
  RESERVE_PRESETS,
} from '../helpers/fixtures';
import * as assertions from '../helpers/assertions';

/**
 * Test 1.1: Basic Sequential Flow
 * Factions process in storm order (ship then move)
 */
export async function testBasicSequentialFlow() {
  console.log('\n🧪 Testing: Basic Sequential Flow');

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

  const responses = new AgentResponseBuilder();

  // Atreides: Ship then move
  responses
    .queueShipment(Faction.ATREIDES, {
      territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      sector: 9,
      regularCount: 5,
    })
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Basic Sequential Flow',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventEmitted(result.events, 'FORCES_MOVED');
  assertions.assertForcesInTerritory(
    result.state,
    Faction.ATREIDES,
    TEST_TERRITORIES.IMPERIAL_BASIN.id,
    9,
    10 // 5 shipped + 5 moved
  );

  logScenarioResults('Basic Sequential Flow', result);
  return result;
}

/**
 * Test 1.2: Pass on Shipment
 * Faction can pass on shipment but still move
 */
export async function testPassOnShipment() {
  console.log('\n🧪 Testing: Pass on Shipment');

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

  const responses = new AgentResponseBuilder();

  // Atreides: Pass shipment, then move
  responses
    .queuePassShipment(Faction.ATREIDES)
    .queueMovement(Faction.ATREIDES, {
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Pass on Shipment',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventEmitted(result.events, 'FORCES_MOVED');
  assertions.assertForcesInTerritory(
    result.state,
    Faction.ATREIDES,
    TEST_TERRITORIES.IMPERIAL_BASIN.id,
    9,
    5 // Only moved, not shipped
  );

  logScenarioResults('Pass on Shipment', result);
  return result;
}

/**
 * Test 1.3: Pass on Movement
 * Faction can pass on movement after shipping
 */
export async function testPassOnMovement() {
  console.log('\n🧪 Testing: Pass on Movement');

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

  const responses = new AgentResponseBuilder();

  // Atreides: Ship, then pass movement
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Pass on Movement',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  assertions.assertForcesInTerritory(
    result.state,
    Faction.ATREIDES,
    TEST_TERRITORIES.IMPERIAL_BASIN.id,
    9,
    5 // Only shipped, not moved
  );

  logScenarioResults('Pass on Movement', result);
  return result;
}

/**
 * Test 1.4: Pass on Both
 * Faction can pass on both shipment and movement
 */
export async function testPassOnBoth() {
  console.log('\n🧪 Testing: Pass on Both');

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

  const responses = new AgentResponseBuilder();

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Pass on Both',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  // Forces should remain in original territory
  assertions.assertForcesInTerritory(
    result.state,
    Faction.ATREIDES,
    TEST_TERRITORIES.ARRAKEEN.id,
    9,
    5
  );

  logScenarioResults('Pass on Both', result);
  return result;
}

/**
 * Run all core sequential tests
 */
export async function runAllCoreSequentialTests() {
  console.log('='.repeat(80));
  console.log('CORE SEQUENTIAL PROCESSING TESTS');
  console.log('='.repeat(80));

  try {
    await testBasicSequentialFlow();
  } catch (error) {
    console.error('Basic Sequential Flow test failed:', error);
  }

  try {
    await testPassOnShipment();
  } catch (error) {
    console.error('Pass on Shipment test failed:', error);
  }

  try {
    await testPassOnMovement();
  } catch (error) {
    console.error('Pass on Movement test failed:', error);
  }

  try {
    await testPassOnBoth();
  } catch (error) {
    console.error('Pass on Both test failed:', error);
  }

  console.log('\n✅ All core sequential tests completed.');
}

