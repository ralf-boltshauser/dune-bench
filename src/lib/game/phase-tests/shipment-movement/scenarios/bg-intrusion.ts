/**
 * BG INTRUSION Tests (Rule 2.02.16)
 * 
 * Tests 4.1-4.10: BG INTRUSION ability
 * "When a Force of another faction that you are not allied to enters a Territory
 * where you have fighters, you may flip them to advisors.✷"
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
import { getFactionState } from '../../../state';
import { setBGAdvisors } from '../helpers/bg-test-helpers';

/**
 * Test 4.1: Basic INTRUSION Trigger
 * BG INTRUSION triggers when non-ally enters territory with BG fighters
 */
export async function testBGIntrusionBasic() {
  console.log('\n🧪 Testing: BG INTRUSION - Basic Trigger');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5, // BG has 5 fighters (not advisors)
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Move to territory with BG fighters
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // BG: Flip 3 fighters to advisors (INTRUSION)
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - Basic Trigger',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify INTRUSION event was emitted
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected BG_INTRUSION or FORCES_CONVERTED event');
  }

  // Verify BG has 3 advisors and 2 fighters in Imperial Basin
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (!basinStack) {
    throw new Error('BG should have forces in Imperial Basin');
  }
  if (basinStack.advisors !== 3) {
    throw new Error(`Expected 3 advisors, got ${basinStack.advisors}`);
  }
  const totalForces = (basinStack.forces.regular || 0) + (basinStack.forces.elite || 0);
  const fighters = totalForces - (basinStack.advisors || 0);
  if (fighters !== 2) {
    throw new Error(`Expected 2 fighters, got ${fighters}`);
  }

  logScenarioResults('BG INTRUSION - Basic Trigger', result);
  return result;
}

/**
 * Test 4.2: INTRUSION After Shipment
 * INTRUSION triggers after normal shipment
 */
export async function testBGIntrusionAfterShipment() {
  console.log('\n🧪 Testing: BG INTRUSION - After Shipment');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Ship to territory with BG fighters
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // BG: Flip fighters to advisors (INTRUSION)
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - After Shipment',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected BG_INTRUSION or FORCES_CONVERTED event after shipment');
  }

  logScenarioResults('BG INTRUSION - After Shipment', result);
  return result;
}

/**
 * Test 4.3: INTRUSION After Guild Cross-Ship
 * INTRUSION triggers after Guild cross-ship
 */
export async function testBGIntrusionAfterGuildCrossShip() {
  console.log('\n🧪 Testing: BG INTRUSION - After Guild Cross-Ship');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.SPACING_GUILD, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.SPACING_GUILD,
        territory: TEST_TERRITORIES.TUEKS_SIETCH.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Guild: Cross-ship to territory with BG fighters
  responses
    .forGuild()
    .timing('NOW')
    .crossShip({
      fromTerritoryId: TEST_TERRITORIES.TUEKS_SIETCH.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });
  responses.queuePassMovement(Faction.SPACING_GUILD);

  // BG: Flip fighters to advisors (INTRUSION)
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - After Guild Cross-Ship',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected BG_INTRUSION or FORCES_CONVERTED event after Guild cross-ship');
  }

  logScenarioResults('BG INTRUSION - After Guild Cross-Ship', result);
  return result;
}

/**
 * Test 4.4: INTRUSION After Movement
 * INTRUSION triggers after movement
 */
export async function testBGIntrusionAfterMovement() {
  console.log('\n🧪 Testing: BG INTRUSION - After Movement');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Pass shipment, move to territory with BG fighters
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // BG: Flip fighters to advisors (INTRUSION)
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - After Movement',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  assertions.assertEventEmitted(result.events, 'FORCES_MOVED');
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected BG_INTRUSION or FORCES_CONVERTED event after movement');
  }

  logScenarioResults('BG INTRUSION - After Movement', result);
  return result;
}

/**
 * Test 4.5: INTRUSION - BG Flips Fighters
 * BG flips fighters to advisors
 */
export async function testBGIntrusionFlipFighters() {
  console.log('\n🧪 Testing: BG INTRUSION - Flip Fighters');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5, // 5 fighters, 0 advisors
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Move to territory with BG fighters
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // BG: Flip 3 fighters to advisors (INTRUSION)
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - Flip Fighters',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify conversion happened
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (!basinStack) {
    throw new Error('BG should have forces in Imperial Basin');
  }
  
  // Should have 3 advisors and 2 fighters (5 total, 3 converted)
  if (basinStack.advisors !== 3) {
    throw new Error(`Expected 3 advisors after INTRUSION, got ${basinStack.advisors}`);
  }
  const totalForces = (basinStack.forces.regular || 0) + (basinStack.forces.elite || 0);
  const fighters = totalForces - (basinStack.advisors || 0);
  if (fighters !== 2) {
    throw new Error(`Expected 2 fighters after INTRUSION, got ${fighters}`);
  }

  logScenarioResults('BG INTRUSION - Flip Fighters', result);
  return result;
}

/**
 * Test 4.6: INTRUSION - BG Passes
 * BG can pass on INTRUSION
 */
export async function testBGIntrusionPass() {
  console.log('\n🧪 Testing: BG INTRUSION - BG Passes');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Move to territory with BG fighters
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // BG: Pass on INTRUSION
  responses.queueBGPassAbility(Faction.BENE_GESSERIT, 'INTRUSION');

  // Harkonnen: Pass both
  responses.queuePassBoth(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - BG Passes',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify no conversion happened - fighters should remain fighters
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (!basinStack) {
    throw new Error('BG should have forces in Imperial Basin');
  }
  
  // Should still have 5 fighters, 0 advisors (no conversion)
  if (basinStack.advisors !== 0) {
    throw new Error(`Expected 0 advisors when BG passes, got ${basinStack.advisors}`);
  }

  logScenarioResults('BG INTRUSION - BG Passes', result);
  return result;
}

/**
 * Test 4.7: INTRUSION - Not Triggered for Allies
 * INTRUSION does NOT trigger for allied factions
 */
export async function testBGIntrusionNotForAllies() {
  console.log('\n🧪 Testing: BG INTRUSION - Not Triggered for Allies');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.BENE_GESSERIT, Faction.ATREIDES]], // BG and Atreides allied
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Move to territory with BG fighters (but they're allied)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
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
    'BG INTRUSION - Not Triggered for Allies',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO INTRUSION event (allies don't trigger it)
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length > 0) {
    throw new Error('INTRUSION should NOT trigger for allied factions');
  }

  logScenarioResults('BG INTRUSION - Not Triggered for Allies', result);
  return result;
}

/**
 * Test 4.8: INTRUSION - Not Triggered if Only Advisors
 * INTRUSION requires fighters, not advisors
 */
export async function testBGIntrusionNotForAdvisors() {
  console.log('\n🧪 Testing: BG INTRUSION - Not Triggered if Only Advisors');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 0, // Only advisors, no fighters (will be set manually)
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Move to territory with BG advisors (but no fighters)
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
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
    'BG INTRUSION - Not Triggered if Only Advisors',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO INTRUSION event (requires fighters, not advisors)
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length > 0) {
    throw new Error('INTRUSION should NOT trigger if BG only has advisors (no fighters)');
  }

  logScenarioResults('BG INTRUSION - Not Triggered if Only Advisors', result);
  return result;
}

/**
 * Test 4.9: INTRUSION - Not Triggered for BG's Own Actions
 * INTRUSION does NOT trigger for BG's own movements
 */
export async function testBGIntrusionNotForSelf() {
  console.log('\n🧪 Testing: BG INTRUSION - Not Triggered for BG\'s Own Actions');

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
        regular: 5,
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // BG: Move own forces to territory with own fighters
  responses
    .forFaction(Faction.BENE_GESSERIT)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION - Not Triggered for BG\'s Own Actions',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO INTRUSION event (BG's own actions don't trigger it)
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length > 0) {
    throw new Error('INTRUSION should NOT trigger for BG\'s own movements');
  }

  logScenarioResults('BG INTRUSION - Not Triggered for BG\'s Own Actions', result);
  return result;
}

/**
 * Test 4.10: INTRUSION - Not in Basic Rules
 * INTRUSION only in advanced rules
 */
export async function testBGIntrusionNotInBasicRules() {
  console.log('\n🧪 Testing: BG INTRUSION - Not in Basic Rules');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: false, // Basic rules
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // Atreides: Move to territory with BG fighters
  responses
    .forFaction(Faction.ATREIDES)
    .passShipment()
    .movement({
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
    'BG INTRUSION - Not in Basic Rules',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO INTRUSION event (only in advanced rules)
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length > 0) {
    throw new Error('INTRUSION should NOT trigger in basic rules');
  }

  logScenarioResults('BG INTRUSION - Not in Basic Rules', result);
  return result;
}

/**
 * Run all BG INTRUSION tests
 */
export async function runAllBGIntrusionTests() {
  console.log('='.repeat(80));
  console.log('BG INTRUSION TESTS');
  console.log('='.repeat(80));

  try {
    await testBGIntrusionBasic();
  } catch (error) {
    console.error('BG INTRUSION - Basic Trigger test failed:', error);
  }

  try {
    await testBGIntrusionAfterShipment();
  } catch (error) {
    console.error('BG INTRUSION - After Shipment test failed:', error);
  }

  try {
    await testBGIntrusionAfterGuildCrossShip();
  } catch (error) {
    console.error('BG INTRUSION - After Guild Cross-Ship test failed:', error);
  }

  try {
    await testBGIntrusionAfterMovement();
  } catch (error) {
    console.error('BG INTRUSION - After Movement test failed:', error);
  }

  try {
    await testBGIntrusionFlipFighters();
  } catch (error) {
    console.error('BG INTRUSION - Flip Fighters test failed:', error);
  }

  try {
    await testBGIntrusionPass();
  } catch (error) {
    console.error('BG INTRUSION - BG Passes test failed:', error);
  }

  try {
    await testBGIntrusionNotForAllies();
  } catch (error) {
    console.error('BG INTRUSION - Not Triggered for Allies test failed:', error);
  }

  try {
    await testBGIntrusionNotForAdvisors();
  } catch (error) {
    console.error('BG INTRUSION - Not Triggered if Only Advisors test failed:', error);
  }

  try {
    await testBGIntrusionNotForSelf();
  } catch (error) {
    console.error('BG INTRUSION - Not Triggered for BG\'s Own Actions test failed:', error);
  }

  try {
    await testBGIntrusionNotInBasicRules();
  } catch (error) {
    console.error('BG INTRUSION - Not in Basic Rules test failed:', error);
  }

  console.log('\n✅ All BG INTRUSION tests completed.');
}

