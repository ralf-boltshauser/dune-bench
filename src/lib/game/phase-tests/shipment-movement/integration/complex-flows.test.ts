/**
 * Integration Tests for Complex Flows
 * 
 * Tests 13.1-13.7: Multi-faction, multi-ability interactions
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from '../scenarios/base-scenario';
import {
  TEST_TERRITORIES,
  FORCE_PRESETS,
  SPICE_PRESETS,
} from '../helpers/fixtures';
import * as assertions from '../helpers/assertions';
import { getFactionState } from '../../../state';
import { setBGAdvisors } from '../helpers/bg-test-helpers';

/**
 * Test 13.1: Full Phase Flow
 * Complete phase with multiple factions
 */
export async function testFullPhaseFlow() {
  console.log('\n🧪 Testing: Full Phase Flow');

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.SPACING_GUILD],
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
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.CARTHAG.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.EMPEROR, SPICE_PRESETS.MEDIUM],
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Guild: Act NOW
  responses
    .forGuild()
    .timing('NOW')
    .normalShipment({
      territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      sector: 9,
      regularCount: 5,
    });
  responses.queuePassMovement(Faction.SPACING_GUILD);

  // Atreides: Ship and move
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
    fromSector: 9,
    toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    toSector: 9,
    count: 5,
  });

  // Harkonnen: Ship and move
  responses.queueShipment(Faction.HARKONNEN, {
    territoryId: TEST_TERRITORIES.CARTHAG.id,
    sector: 9,
    regularCount: 3,
  });
  responses.queueMovement(Faction.HARKONNEN, {
    fromTerritoryId: TEST_TERRITORIES.CARTHAG.id,
    fromSector: 9,
    toTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
    toSector: 9,
    count: 3,
  });

  // Emperor: Pass both
  responses.queuePassBoth(Faction.EMPEROR);

  const result = await runPhaseScenario(
    state,
    responses,
    'Full Phase Flow',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify all factions processed
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');
  assertions.assertEventEmitted(result.events, 'FORCES_MOVED');

  // Verify multiple shipment events
  const shipmentEvents = result.events.filter(e => e.type === 'FORCES_SHIPPED');
  if (shipmentEvents.length < 3) {
    throw new Error(`Expected at least 3 shipment events, got ${shipmentEvents.length}`);
  }

  logScenarioResults('Full Phase Flow', result);
  return result;
}

/**
 * Test 13.2: BG Abilities Chain
 * Multiple BG abilities triggered in sequence
 */
export async function testBGAbilitiesChain() {
  console.log('\n🧪 Testing: BG Abilities Chain');

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
        regular: 5, // Will be converted to advisors
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

  // Set advisors
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // BG: WARTIME - flip advisors to fighters
  responses.queueBGWartime(Faction.BENE_GESSERIT, [
    { territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, sector: 9 },
  ]);
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Ship to territory with BG fighters (triggers INTRUSION)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // BG: INTRUSION - flip fighters to advisors
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
    'BG Abilities Chain',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify WARTIME event
  const wartimeEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'advisors_to_fighters'
  );
  if (wartimeEvents.length === 0) {
    throw new Error('Expected WARTIME conversion event');
  }

  // Verify INTRUSION event
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected INTRUSION conversion event');
  }

  logScenarioResults('BG Abilities Chain', result);
  return result;
}

/**
 * Test 13.3: Guild + BG Interaction
 * Guild and BG abilities interact correctly
 */
export async function testGuildBGInteraction() {
  console.log('\n🧪 Testing: Guild + BG Interaction');

  let state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5, // Will be fighters
      },
      {
        faction: Faction.SPACING_GUILD,
        territory: TEST_TERRITORIES.TUEKS_SIETCH.id,
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
    ],
    spice: new Map([
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Guild: Act NOW, cross-ship to territory with BG fighters
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

  // BG: INTRUSION should NOT trigger (Guild cross-ship doesn't trigger INTRUSION)
  // But if it did, we'd queue it here

  // Atreides: Ship to territory with BG fighters (triggers INTRUSION)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // BG: INTRUSION - flip fighters to advisors
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  const result = await runPhaseScenario(
    state,
    responses,
    'Guild + BG Interaction',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify Guild cross-ship event
  const crossShipEvents = result.events.filter(
    (e) => e.type === 'FORCES_SHIPPED' && (e.data as any)?.actionType === 'GUILD_CROSS_SHIP'
  );
  if (crossShipEvents.length === 0) {
    throw new Error('Expected Guild cross-ship event');
  }

  // Verify BG INTRUSION event (from Atreides shipment, not Guild)
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected INTRUSION conversion event');
  }

  logScenarioResults('Guild + BG Interaction', result);
  return result;
}

/**
 * Test 13.4: BG Abilities with Restrictions
 * BG abilities respect PEACETIME and STORMED IN
 */
export async function testBGAbilitiesWithRestrictions() {
  console.log('\n🧪 Testing: BG Abilities with Restrictions');

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
        regular: 5, // Will be advisors
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id, // Same territory as ally
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

  // Set advisors (PEACETIME restriction: can't flip if ally present)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // BG: WARTIME - should be restricted (ally present = PEACETIME)
  responses.queueBGWartime(Faction.BENE_GESSERIT, []); // Pass (restricted)
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  // Harkonnen: Ship to territory with BG advisors
  responses.queueShipment(Faction.HARKONNEN, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.HARKONNEN);

  // BG: TAKE UP ARMS - should be restricted (ally present = PEACETIME)
  responses.queueBGTakeUpArms(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 0, // Pass (restricted)
  });

  const result = await runPhaseScenario(
    state,
    responses,
    'BG Abilities with Restrictions',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify NO conversion events (restrictions applied)
  const conversionEvents = result.events.filter(e => e.type === 'FORCES_CONVERTED');
  if (conversionEvents.length > 0) {
    throw new Error('Expected no conversion events when restrictions apply');
  }

  // Verify advisors remain
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (basinStack && (basinStack.advisors || 0) < 5) {
    throw new Error('Expected advisors to remain when restrictions apply');
  }

  logScenarioResults('BG Abilities with Restrictions', result);
  return result;
}

/**
 * Test 13.5: Fremen + BG Interaction
 * Fremen shipment does NOT trigger BG Spiritual Advisor
 */
export async function testFremenBGInteraction() {
  console.log('\n🧪 Testing: Fremen + BG Interaction');

  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.BENE_GESSERIT],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [],
    spice: new Map([
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Fremen: Send forces (special shipment, NOT off-planet)
  responses.queueShipment(Faction.FREMEN, {
    territoryId: TerritoryId.THE_GREAT_FLAT,
    sector: 14,
    regularCount: 10,
  });
  responses.queuePassMovement(Faction.FREMEN);

  // BG: Should NOT get Spiritual Advisor request (Fremen send doesn't trigger)
  // No response queued for BG

  const result = await runPhaseScenario(
    state,
    responses,
    'Fremen + BG Interaction',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify NO BG Spiritual Advisor event
  // BG Spiritual Advisor would emit FORCES_SHIPPED with reason 'spiritual_advisor'
  const advisorEvents = result.events.filter(
    (e) => e.type === 'FORCES_SHIPPED' && (e.data as any)?.faction === Faction.BENE_GESSERIT && (e.data as any)?.reason === 'spiritual_advisor'
  );
  if (advisorEvents.length > 0) {
    throw new Error('Expected no BG Spiritual Advisor event for Fremen shipment');
  }

  // Verify Fremen shipment succeeded
  assertions.assertEventEmitted(result.events, 'FORCES_SHIPPED');

  logScenarioResults('Fremen + BG Interaction', result);
  return result;
}

/**
 * Test 13.6: Alliance + BG Interaction
 * Allied faction entering territory does NOT trigger INTRUSION
 */
export async function testAllianceBGInteraction() {
  console.log('\n🧪 Testing: Alliance + BG Interaction');

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
        regular: 5, // Will be fighters
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // Atreides (ally): Ship to territory with BG fighters (should NOT trigger INTRUSION)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // BG: Should NOT get INTRUSION request (ally entering)
  // No response queued for BG

  // Harkonnen (non-ally): Ship to territory with BG fighters (SHOULD trigger INTRUSION)
  responses.queueShipment(Faction.HARKONNEN, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.HARKONNEN);

  // BG: INTRUSION - flip fighters to advisors (non-ally entered)
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  const result = await runPhaseScenario(
    state,
    responses,
    'Alliance + BG Interaction',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify INTRUSION event only for non-ally (Harkonnen)
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length !== 1) {
    throw new Error(`Expected 1 INTRUSION event (for non-ally), got ${intrusionEvents.length}`);
  }

  // Verify no INTRUSION for ally (Atreides)
  const atreidesIntrusion = intrusionEvents.find(
    (e) => (e.data as any)?.enteringFaction === Faction.ATREIDES
  );
  if (atreidesIntrusion) {
    throw new Error('Expected no INTRUSION event for allied faction');
  }

  logScenarioResults('Alliance + BG Interaction', result);
  return result;
}

/**
 * Test 13.7: Complex Multi-Faction Multi-Ability Scenario
 * All abilities and interactions in one complex flow
 */
export async function testComplexMultiFactionMultiAbility() {
  console.log('\n🧪 Testing: Complex Multi-Faction Multi-Ability Scenario');

  let state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]], // Atreides and Harkonnen allied
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5, // Will be advisors
      },
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
      [Faction.SPACING_GUILD, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.HARKONNEN, SPICE_PRESETS.MEDIUM],
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
    ]),
  });

  // Set advisors
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // BG: WARTIME - flip advisors to fighters
  responses.queueBGWartime(Faction.BENE_GESSERIT, [
    { territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, sector: 9 },
  ]);
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Guild: Act NOW, cross-ship to territory with BG fighters
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

  // Atreides: Ship to territory with BG fighters (triggers INTRUSION)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    regularCount: 5,
  });
  responses.queuePassMovement(Faction.ATREIDES);

  // BG: INTRUSION - flip fighters to advisors
  responses.queueBGIntrusion(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 3,
  });

  // Harkonnen: Move to occupied territory with BG advisors (triggers TAKE UP ARMS)
  responses
    .forFaction(Faction.HARKONNEN)
    .passShipment()
    .movement({
      fromTerritoryId: TEST_TERRITORIES.ARRAKEEN.id,
      fromSector: 9,
      toTerritoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id,
      toSector: 9,
      count: 5,
    });

  // BG: TAKE UP ARMS - flip advisors to fighters
  responses.queueBGTakeUpArms(Faction.BENE_GESSERIT, {
    territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
    sector: 9,
    flipCount: 2,
  });

  // Alliance constraint: Atreides and Harkonnen in same territory (except they're both in Arrakeen initially)
  // After Harkonnen moves, they're both in Imperial Basin - constraint should apply

  // Fremen: Send forces (does NOT trigger BG Spiritual Advisor)
  responses.queueShipment(Faction.FREMEN, {
    territoryId: TerritoryId.THE_GREAT_FLAT,
    sector: 14,
    regularCount: 10,
  });
  responses.queuePassMovement(Faction.FREMEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Complex Multi-Faction Multi-Ability',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }

  // Verify WARTIME event
  const wartimeEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'advisors_to_fighters'
  );
  if (wartimeEvents.length === 0) {
    throw new Error('Expected WARTIME conversion event');
  }

  // Verify INTRUSION event
  const intrusionEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'fighters_to_advisors'
  );
  if (intrusionEvents.length === 0) {
    throw new Error('Expected INTRUSION conversion event');
  }

  // Verify TAKE UP ARMS event
  const takeUpArmsEvents = result.events.filter(
    (e) => e.type === 'FORCES_CONVERTED' && (e.data as any)?.conversionType === 'advisors_to_fighters' && (e.data as any)?.reason === 'take_up_arms'
  );
  if (takeUpArmsEvents.length === 0) {
    throw new Error('Expected TAKE UP ARMS conversion event');
  }

  // Verify alliance constraint applied
  const allianceEvents = result.events.filter(
    (e) => e.type === 'FORCES_SHIPPED' && (e.data as any)?.reason === 'alliance_constraint'
  );
  if (allianceEvents.length === 0) {
    throw new Error('Expected alliance constraint event');
  }

  // Verify NO BG Spiritual Advisor for Fremen
  // BG Spiritual Advisor would emit FORCES_SHIPPED with reason 'spiritual_advisor'
  const advisorEvents = result.events.filter(
    (e) => e.type === 'FORCES_SHIPPED' && (e.data as any)?.faction === Faction.BENE_GESSERIT && (e.data as any)?.reason === 'spiritual_advisor'
  );
  if (advisorEvents.length > 0) {
    throw new Error('Expected no BG Spiritual Advisor event for Fremen shipment');
  }

  logScenarioResults('Complex Multi-Faction Multi-Ability', result);
  return result;
}

/**
 * Run all Integration Tests
 */
export async function runAllIntegrationTests() {
  console.log('='.repeat(80));
  console.log('INTEGRATION TESTS FOR COMPLEX FLOWS');
  console.log('='.repeat(80));

  try {
    await testFullPhaseFlow();
  } catch (error) {
    console.error('Full Phase Flow test failed:', error);
  }

  try {
    await testBGAbilitiesChain();
  } catch (error) {
    console.error('BG Abilities Chain test failed:', error);
  }

  try {
    await testGuildBGInteraction();
  } catch (error) {
    console.error('Guild + BG Interaction test failed:', error);
  }

  try {
    await testBGAbilitiesWithRestrictions();
  } catch (error) {
    console.error('BG Abilities with Restrictions test failed:', error);
  }

  try {
    await testFremenBGInteraction();
  } catch (error) {
    console.error('Fremen + BG Interaction test failed:', error);
  }

  try {
    await testAllianceBGInteraction();
  } catch (error) {
    console.error('Alliance + BG Interaction test failed:', error);
  }

  try {
    await testComplexMultiFactionMultiAbility();
  } catch (error) {
    console.error('Complex Multi-Faction Multi-Ability test failed:', error);
  }

  console.log('\n✅ All Integration Tests completed.');
}

