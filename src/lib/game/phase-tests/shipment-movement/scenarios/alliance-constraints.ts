/**
 * Alliance Constraint Tests (Rule 1.06.03.08)
 * 
 * Tests 7.1-7.5: Alliance constraint
 * "At the end of your Shipment and Movement actions, Place all your Forces that are
 * in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks."
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
} from '../helpers/fixtures';
import * as assertions from '../helpers/assertions';
import { getFactionState, getForcesInTanks } from '../../../state';

/**
 * Test 7.1: Basic Alliance Constraint
 * Forces sent to Tanks when in same territory as ally
 */
export async function testAllianceConstraintBasic() {
  console.log('\n🧪 Testing: Alliance Constraint - Basic');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]], // Atreides and Harkonnen allied
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Same territory as ally
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
    'Alliance Constraint - Basic',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify alliance constraint event was emitted
  assertions.assertEventEmitted(result.events, 'FORCES_SENT_TO_TANKS');
  
  // Verify forces were sent to Tanks
  const atreidesTanks = getForcesInTanks(result.state, Faction.ATREIDES);
  const harkonnenTanks = getForcesInTanks(result.state, Faction.HARKONNEN);
  
  if (atreidesTanks === 0 && harkonnenTanks === 0) {
    throw new Error('Expected forces to be sent to Tanks due to alliance constraint');
  }

  logScenarioResults('Alliance Constraint - Basic', result);
  return result;
}

/**
 * Test 7.2: Alliance Constraint - Polar Sink Exception
 * Alliance constraint does NOT apply in Polar Sink
 */
export async function testAllianceConstraintPolarSinkException() {
  console.log('\n🧪 Testing: Alliance Constraint - Polar Sink Exception');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]],
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.POLAR_SINK,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.POLAR_SINK, // Same territory as ally, but Polar Sink
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
    'Alliance Constraint - Polar Sink Exception',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO forces sent to Tanks (Polar Sink exception)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SENT_TO_TANKS');
  
  // Verify forces remain in Polar Sink
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const polarSinkStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.POLAR_SINK && s.sector === 9
  );
  if (!polarSinkStack) {
    throw new Error('Atreides forces should remain in Polar Sink (exception applies)');
  }

  logScenarioResults('Alliance Constraint - Polar Sink Exception', result);
  return result;
}

/**
 * Test 7.3: Alliance Constraint - Applied After Each Faction
 * Constraint applied after each faction completes
 */
export async function testAllianceConstraintAfterEachFaction() {
  console.log('\n🧪 Testing: Alliance Constraint - Applied After Each Faction');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]], // Atreides and Harkonnen allied
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Same territory as ally
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.EMPEROR, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Ship to territory with ally
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.ARRAKEEN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  // Emperor: Pass both
  responses.queuePassBoth(Faction.EMPEROR);

  const result = await runPhaseScenario(
    state,
    responses,
    'Alliance Constraint - Applied After Each Faction',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify constraint applied after Atreides completes
  const tankEvents = result.events.filter(
    (e) => e.type === 'FORCES_SENT_TO_TANKS'
  );
  if (tankEvents.length === 0) {
    throw new Error('Expected FORCES_SENT_TO_TANKS event after Atreides completes');
  }

  logScenarioResults('Alliance Constraint - Applied After Each Faction', result);
  return result;
}

/**
 * Test 7.4: Alliance Constraint - Not Applied if Not Allied
 * Constraint only for allied factions
 */
export async function testAllianceConstraintNotIfNotAllied() {
  console.log('\n🧪 Testing: Alliance Constraint - Not Applied if Not Allied');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    // No alliances
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Same territory, but not allied
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
    'Alliance Constraint - Not Applied if Not Allied',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO forces sent to Tanks (not allied)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SENT_TO_TANKS');
  
  // Verify forces remain in territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const arrakeenStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 9
  );
  if (!arrakeenStack) {
    throw new Error('Forces should remain in territory when not allied');
  }

  logScenarioResults('Alliance Constraint - Not Applied if Not Allied', result);
  return result;
}

/**
 * Test 7.5: Alliance Constraint - Only After Shipment and Movement
 * Constraint applied after both actions complete
 */
export async function testAllianceConstraintAfterBothActions() {
  console.log('\n🧪 Testing: Alliance Constraint - Only After Shipment and Movement');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]],
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
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

  // Atreides: Ship and move to territory with ally
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
    'Alliance Constraint - Only After Shipment and Movement',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify constraint applied after movement completes (not after shipment)
  const tankEvents = result.events.filter(
    (e) => e.type === 'FORCES_SENT_TO_TANKS'
  );
  if (tankEvents.length === 0) {
    throw new Error('Expected FORCES_SENT_TO_TANKS event after both actions complete');
  }
  
  // Verify event comes after movement, not after shipment
  const shipmentIndex = result.events.findIndex(e => e.type === 'FORCES_SHIPPED');
  const movementIndex = result.events.findIndex(e => e.type === 'FORCES_MOVED');
  const tanksIndex = result.events.findIndex(e => e.type === 'FORCES_SENT_TO_TANKS');
  
  if (tanksIndex <= movementIndex) {
    throw new Error('Alliance constraint should be applied after movement completes');
  }

  logScenarioResults('Alliance Constraint - Only After Shipment and Movement', result);
  return result;
}

/**
 * Run all Alliance Constraint tests
 */
export async function runAllAllianceConstraintTests() {
  console.log('='.repeat(80));
  console.log('ALLIANCE CONSTRAINT TESTS');
  console.log('='.repeat(80));

  try {
    await testAllianceConstraintBasic();
  } catch (error) {
    console.error('Alliance Constraint - Basic test failed:', error);
  }

  try {
    await testAllianceConstraintPolarSinkException();
  } catch (error) {
    console.error('Alliance Constraint - Polar Sink Exception test failed:', error);
  }

  try {
    await testAllianceConstraintAfterEachFaction();
  } catch (error) {
    console.error('Alliance Constraint - Applied After Each Faction test failed:', error);
  }

  try {
    await testAllianceConstraintNotIfNotAllied();
  } catch (error) {
    console.error('Alliance Constraint - Not Applied if Not Allied test failed:', error);
  }

  try {
    await testAllianceConstraintAfterBothActions();
  } catch (error) {
    console.error('Alliance Constraint - Only After Shipment and Movement test failed:', error);
  }

  console.log('\n✅ All Alliance Constraint tests completed.');
}

