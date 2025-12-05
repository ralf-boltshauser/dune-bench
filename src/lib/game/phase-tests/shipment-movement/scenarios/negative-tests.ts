/**
 * Negative Test Cases - Invalid Actions and Validation Errors
 * 
 * Tests 10.1-10.14: Invalid actions, validation errors, edge cases
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
import { getFactionState, moveStorm } from '../../../state';
import { setBGAdvisors } from '../helpers/bg-test-helpers';

/**
 * Test 10.1: Invalid Shipment - Storm Sector
 * Cannot ship into storm sector
 */
export async function testInvalidShipmentStormSector() {
  console.log('\n🧪 Testing: Invalid Shipment - Storm Sector');

  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Set storm in sector 9
  state = moveStorm(state, 9);

  const responses = new AgentResponseBuilder();

  // Atreides: Try to ship to territory in storm sector
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9, // Sector in storm
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Shipment - Storm Sector',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO shipment event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  
  // Verify forces remain in reserves
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const reserves = atreidesState.forces.reserves.regular + atreidesState.forces.reserves.elite;
  if (reserves < 5) {
    throw new Error('Forces should remain in reserves when shipment to storm sector is rejected');
  }

  logScenarioResults('Invalid Shipment - Storm Sector', result);
  return result;
}

/**
 * Test 10.2: Invalid Shipment - Occupancy Limit
 * Cannot ship into stronghold with 2 other factions
 */
export async function testInvalidShipmentOccupancyLimit() {
  console.log('\n🧪 Testing: Invalid Shipment - Occupancy Limit');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.EMPEROR,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.FREMEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold (3rd faction)
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.EMPEROR, SPICE_PRESETS.MEDIUM],
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to ship to stronghold with 3 other factions (occupancy limit)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.ARRAKEEN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // Other factions: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);
  responses.queuePassBoth(Faction.EMPEROR);
  responses.queuePassBoth(Faction.FREMEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Shipment - Occupancy Limit',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO shipment event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  
  // Verify forces remain in reserves
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const reserves = atreidesState.forces.reserves.regular + atreidesState.forces.reserves.elite;
  if (reserves < 5) {
    throw new Error('Forces should remain in reserves when shipment to occupied stronghold is rejected');
  }

  logScenarioResults('Invalid Shipment - Occupancy Limit', result);
  return result;
}

/**
 * Test 10.3: Invalid Shipment - Insufficient Spice
 * Cannot ship without sufficient spice
 */
export async function testInvalidShipmentInsufficientSpice() {
  console.log('\n🧪 Testing: Invalid Shipment - Insufficient Spice');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [],
    spice: new Map([
      [Faction.ATREIDES, 0], // No spice
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to ship 5 forces to stronghold (costs 5 spice, but has 0)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.ARRAKEEN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Shipment - Insufficient Spice',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO shipment event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  
  // Verify forces remain in reserves
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const reserves = atreidesState.forces.reserves.regular + atreidesState.forces.reserves.elite;
  if (reserves < 5) {
    throw new Error('Forces should remain in reserves when shipment is rejected due to insufficient spice');
  }

  logScenarioResults('Invalid Shipment - Insufficient Spice', result);
  return result;
}

/**
 * Test 10.4: Invalid Shipment - No Reserves
 * Cannot ship if no reserves
 */
export async function testInvalidShipmentNoReserves() {
  console.log('\n🧪 Testing: Invalid Shipment - No Reserves');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
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

  // Manually set reserves to 0
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  atreidesState.forces.reserves.regular = 0;
  atreidesState.forces.reserves.elite = 0;

  const responses = new AgentResponseBuilder();

  // Atreides: Try to ship with no reserves
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
    'Invalid Shipment - No Reserves',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO shipment event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');

  logScenarioResults('Invalid Shipment - No Reserves', result);
  return result;
}

/**
 * Test 10.5: Invalid Movement - Storm Sector
 * Cannot move through storm sector
 */
export async function testInvalidMovementStormSector() {
  console.log('\n🧪 Testing: Invalid Movement - Storm Sector');

  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 8, // Not in storm
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Set storm in sector 9
  state = moveStorm(state, 9);

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move to territory in storm sector
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 8,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9, // Sector in storm
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Storm Sector',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 8
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement to storm sector is rejected');
  }

  logScenarioResults('Invalid Movement - Storm Sector', result);
  return result;
}

/**
 * Test 10.6: Invalid Movement - Too Far (No Ornithopters)
 * Cannot move more than 1 territory without ornithopters
 */
export async function testInvalidMovementTooFarNoOrnithopters() {
  console.log('\n🧪 Testing: Invalid Movement - Too Far (No Ornithopters)');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
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
      // No forces in Arrakeen or Carthag at phase start = no ornithopter access
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move 2 territories (should fail - no ornithopters)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, // 2 territories away
      toSector: 9,
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Too Far (No Ornithopters)',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 9
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement is too far');
  }

  logScenarioResults('Invalid Movement - Too Far (No Ornithopters)', result);
  return result;
}

/**
 * Test 10.7: Invalid Movement - Too Far (With Ornithopters)
 * Cannot move more than 3 territories with ornithopters
 */
export async function testInvalidMovementTooFarWithOrnithopters() {
  console.log('\n🧪 Testing: Invalid Movement - Too Far (With Ornithopters)');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN, // Has forces in Arrakeen = ornithopter access
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        ...FORCE_PRESETS.SMALL,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move 4 territories (should fail - max is 3 with ornithopters)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.TUEKS_SIETCH.id, // 4+ territories away
      toSector: 9,
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Too Far (With Ornithopters)',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement exceeds ornithopter range');
  }

  logScenarioResults('Invalid Movement - Too Far (With Ornithopters)', result);
  return result;
}

/**
 * Test 10.8: Invalid Movement - Occupancy Limit
 * Cannot move into stronghold with 2 other factions
 */
export async function testInvalidMovementOccupancyLimit() {
  console.log('\n🧪 Testing: Invalid Movement - Occupancy Limit');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.EMPEROR,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.FREMEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold (3rd faction)
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.EMPEROR, SPICE_PRESETS.MEDIUM],
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move to stronghold with 3 other factions (occupancy limit)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      toSector: 9,
      count: 5,
    });

  // Other factions: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);
  responses.queuePassBoth(Faction.EMPEROR);
  responses.queuePassBoth(Faction.FREMEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Occupancy Limit',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement to occupied stronghold is rejected');
  }

  logScenarioResults('Invalid Movement - Occupancy Limit', result);
  return result;
}

/**
 * Test 10.9: Invalid Movement - No Forces at Source
 * Cannot move forces that don't exist
 */
export async function testInvalidMovementNoForcesAtSource() {
  console.log('\n🧪 Testing: Invalid Movement - No Forces at Source');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.SMALL, // Only 3 forces
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move from empty territory
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, // Empty territory
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      toSector: 9,
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - No Forces at Source',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');

  logScenarioResults('Invalid Movement - No Forces at Source', result);
  return result;
}

/**
 * Test 10.10: Invalid Movement - Insufficient Forces
 * Cannot move more forces than available
 */
export async function testInvalidMovementInsufficientForces() {
  console.log('\n🧪 Testing: Invalid Movement - Insufficient Forces');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.SMALL, // Only 3 forces
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move 5 forces when only 3 available
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5, // More than available
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Insufficient Forces',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 9
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement count exceeds available forces');
  }

  logScenarioResults('Invalid Movement - Insufficient Forces', result);
  return result;
}

/**
 * Test 10.11: Invalid Shipment - Fremen Beyond Range
 * Fremen cannot ship beyond 2 territories from Great Flat
 */
export async function testInvalidFremenShipmentBeyondRange() {
  console.log('\n🧪 Testing: Invalid Shipment - Fremen Beyond Range');

  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [],
    spice: new Map([
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Fremen: Try to ship to territory 3+ territories away from Great Flat
  responses.queueShipment(Faction.FREMEN, {
    territoryId: TEST_TERRITORIES.ARRAKEEN.id, // Too far from Great Flat
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.FREMEN);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Shipment - Fremen Beyond Range',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO shipment event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  
  // Verify forces remain in reserves
  const fremenState = getFactionState(result.state, Faction.FREMEN);
  const reserves = fremenState.forces.reserves.regular + fremenState.forces.reserves.elite;
  if (reserves < 5) {
    throw new Error('Fremen forces should remain in reserves when shipment is beyond range');
  }

  logScenarioResults('Invalid Shipment - Fremen Beyond Range', result);
  return result;
}

/**
 * Test 10.12: Invalid Movement - Through Storm Sector
 * Cannot move through storm sector in path
 */
export async function testInvalidMovementThroughStormSector() {
  console.log('\n🧪 Testing: Invalid Movement - Through Storm Sector');

  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 8, // Not in storm
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Set storm in sector 9
  state = moveStorm(state, 9);

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move through storm sector (path requires passing through sector 9)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 8,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 8, // Destination not in storm, but path through storm
      count: 5,
    });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Through Storm Sector',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 8
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement path goes through storm');
  }

  logScenarioResults('Invalid Movement - Through Storm Sector', result);
  return result;
}

/**
 * Test 10.13: Invalid Movement - Through Occupied Stronghold
 * Cannot move through stronghold with 2 other factions
 */
export async function testInvalidMovementThroughOccupiedStronghold() {
  console.log('\n🧪 Testing: Invalid Movement - Through Occupied Stronghold');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.EMPEROR,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.FREMEN,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Stronghold (3rd faction)
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.EMPEROR, SPICE_PRESETS.MEDIUM],
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides: Try to move through stronghold with 3 other factions (occupancy limit)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.CARTHAG.id, // Path through Arrakeen
      toSector: 9,
      count: 5,
    });

  // Other factions: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);
  responses.queuePassBoth(Faction.EMPEROR);
  responses.queuePassBoth(Faction.FREMEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid Movement - Through Occupied Stronghold',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO movement event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_MOVED');
  
  // Verify forces remain in original territory
  const atreidesState = getFactionState(result.state, Faction.ATREIDES);
  const originalStack = atreidesState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (!originalStack) {
    throw new Error('Forces should remain in original territory when movement path goes through occupied stronghold');
  }

  logScenarioResults('Invalid Movement - Through Occupied Stronghold', result);
  return result;
}

/**
 * Test 10.14: Invalid BG Action - Fighters to Territory with Advisors
 * BG cannot ship fighters to territory with advisors
 */
export async function testInvalidBGFightersToTerritoryWithAdvisors() {
  console.log('\n🧪 Testing: Invalid BG Action - Fighters to Territory with Advisors');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 3, // Will be converted to advisors
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 3);

  const responses = new AgentResponseBuilder();

  // BG: Try to ship fighters to territory with advisors (should fail)
  responses.queueShipment(Faction.BENE_GESSERIT, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'Invalid BG Action - Fighters to Territory with Advisors',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO shipment event (should be rejected)
  assertions.assertEventNotEmitted(result.events, 'FORCES_SHIPPED');
  
  // Verify forces remain in reserves
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  const reserves = bgState.forces.reserves.regular + bgState.forces.reserves.elite;
  if (reserves < 5) {
    throw new Error('BG forces should remain in reserves when trying to ship fighters to territory with advisors');
  }

  logScenarioResults('Invalid BG Action - Fighters to Territory with Advisors', result);
  return result;
}

/**
 * Run all Negative Test Cases
 */
export async function runAllNegativeTests() {
  console.log('='.repeat(80));
  console.log('NEGATIVE TEST CASES');
  console.log('='.repeat(80));

  try {
    await testInvalidShipmentStormSector();
  } catch (error) {
    console.error('Invalid Shipment - Storm Sector test failed:', error);
  }

  try {
    await testInvalidShipmentOccupancyLimit();
  } catch (error) {
    console.error('Invalid Shipment - Occupancy Limit test failed:', error);
  }

  try {
    await testInvalidShipmentInsufficientSpice();
  } catch (error) {
    console.error('Invalid Shipment - Insufficient Spice test failed:', error);
  }

  try {
    await testInvalidShipmentNoReserves();
  } catch (error) {
    console.error('Invalid Shipment - No Reserves test failed:', error);
  }

  try {
    await testInvalidMovementStormSector();
  } catch (error) {
    console.error('Invalid Movement - Storm Sector test failed:', error);
  }

  try {
    await testInvalidMovementTooFarNoOrnithopters();
  } catch (error) {
    console.error('Invalid Movement - Too Far (No Ornithopters) test failed:', error);
  }

  try {
    await testInvalidMovementTooFarWithOrnithopters();
  } catch (error) {
    console.error('Invalid Movement - Too Far (With Ornithopters) test failed:', error);
  }

  try {
    await testInvalidMovementOccupancyLimit();
  } catch (error) {
    console.error('Invalid Movement - Occupancy Limit test failed:', error);
  }

  try {
    await testInvalidMovementNoForcesAtSource();
  } catch (error) {
    console.error('Invalid Movement - No Forces at Source test failed:', error);
  }

  try {
    await testInvalidMovementInsufficientForces();
  } catch (error) {
    console.error('Invalid Movement - Insufficient Forces test failed:', error);
  }

  try {
    await testInvalidFremenShipmentBeyondRange();
  } catch (error) {
    console.error('Invalid Shipment - Fremen Beyond Range test failed:', error);
  }

  try {
    await testInvalidMovementThroughStormSector();
  } catch (error) {
    console.error('Invalid Movement - Through Storm Sector test failed:', error);
  }

  try {
    await testInvalidMovementThroughOccupiedStronghold();
  } catch (error) {
    console.error('Invalid Movement - Through Occupied Stronghold test failed:', error);
  }

  try {
    await testInvalidBGFightersToTerritoryWithAdvisors();
  } catch (error) {
    console.error('Invalid BG Action - Fighters to Territory with Advisors test failed:', error);
  }

  console.log('\n✅ All Negative Test Cases completed.');
}

