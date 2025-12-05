/**
 * Integration Tests: BG Abilities
 * 
 * Tests for Bene Gesserit ability interactions.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { EnhancedAgentResponseBuilder } from '../helpers/agent-response-builder-enhanced';
import { runPhaseScenario } from '../scenarios/base-scenario';
import * as assertions from '../assertions';
import { TEST_FACTIONS, TEST_TERRITORIES, SPICE_PRESETS } from '../helpers/fixtures';
import { setBGAdvisors } from '../helpers/bg-test-helpers';

/**
 * Test BG Spiritual Advisor
 */
export async function testBGSpiritualAdvisor() {
  console.log('\n=== Testing BG Spiritual Advisor ===');
  
  const state = buildTestState({
    factions: TEST_FACTIONS.WITH_BG,
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forFaction(Faction.ATREIDES)
      .shipTo(TEST_TERRITORIES.BASIN.id, 9, 5)
      .end()
    .forBG()
      .sendAdvisor(TerritoryId.POLAR_SINK)
      .end()
    .forFaction(Faction.ATREIDES)
      .moveFromTo(
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.IMPERIAL_BASIN.id,
        9,
        5
      )
      .end()
    .forBG()
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'BG Spiritual Advisor',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertBGAbilityTriggered(result.events, 'SPIRITUAL_ADVISOR', 'SEND');
  assertions.assertBGAdvisorSent(result.events, TerritoryId.POLAR_SINK);
  
  console.log('✅ BG Spiritual Advisor test passed\n');
}

/**
 * Test BG Spiritual Advisor - Fremen exclusion
 */
export async function testBGSpiritualAdvisorFremenExclusion() {
  console.log('\n=== Testing BG Spiritual Advisor - Fremen Exclusion ===');
  
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.BENE_GESSERIT],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: new Map([
      [Faction.FREMEN, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forFremen()
      .sendForces(TEST_TERRITORIES.GREAT_FLAT.id, 9, 5)
      .end()
    .forFremen()
      .passMovement()
      .end()
    .forBG()
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'BG Spiritual Advisor - Fremen Exclusion',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertEventNotEmitted(result.events, 'BG_SEND_SPIRITUAL_ADVISOR');
  
  console.log('✅ BG Spiritual Advisor Fremen exclusion test passed\n');
}

/**
 * Test BG INTRUSION
 */
export async function testBGIntrusion() {
  console.log('\n=== Testing BG INTRUSION ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 5, // Forces to move from Arrakeen
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        regular: 3, // Fighters
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new EnhancedAgentResponseBuilder();
  responses
    
    .forFaction(Faction.ATREIDES)
      .passShipment()
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.BASIN.id, // Entering territory with BG fighters
        9,
        3
      )
      .end()
    .forBG()
      .intrusion(TEST_TERRITORIES.BASIN.id, 9, 2) // Flip 2 fighters to advisors
      .end()
    .forBG()
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'BG INTRUSION',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertBGAbilityTriggered(result.events, 'INTRUSION', 'FLIP');
  assertions.assertBGFlipped(
    result.events,
    TEST_TERRITORIES.BASIN.id,
    'FIGHTERS',
    'ADVISORS',
    2
  );
  
  console.log('✅ BG INTRUSION test passed\n');
}

/**
 * Test BG WARTIME
 */
export async function testBGWartime() {
  console.log('\n=== Testing BG WARTIME ===');
  
  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        regular: 3, // Ship 3 forces first, then convert to advisors
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Convert forces to advisors (buildTestState doesn't handle advisors field)
  state = setBGAdvisors(state, TEST_TERRITORIES.BASIN.id, 9, 3);

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forBG()
      .wartime([{ territoryId: TEST_TERRITORIES.BASIN.id, sector: 9 }])
      .end()
    .forBG()
      .passBoth()
      .end()
    .forFaction(Faction.ATREIDES)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertBGAbilityTriggered(result.events, 'WARTIME', 'FLIP');
  assertions.assertBGFlipped(
    result.events,
    TEST_TERRITORIES.BASIN.id,
    'ADVISORS',
    'FIGHTERS',
    3
  );
  
  console.log('✅ BG WARTIME test passed\n');
}

/**
 * Test BG TAKE UP ARMS
 */
export async function testBGTakeUpArms() {
  console.log('\n=== Testing BG TAKE UP ARMS ===');
  
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        regular: 3, // Occupying the territory
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 2, // Ship 2 forces first, then convert to advisors
      },
    ],
    spice: new Map([
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Convert forces to advisors (buildTestState doesn't handle advisors field)
  state = setBGAdvisors(state, TEST_TERRITORIES.ARRAKEEN.id, 9, 2);

  const responses = new EnhancedAgentResponseBuilder();
  responses
    .forBG()
      .passWartime() // Pass on WARTIME first
      .end()
    .forBG()
      .passShipment()
      .moveFromTo(
        TEST_TERRITORIES.ARRAKEEN.id,
        9,
        TEST_TERRITORIES.BASIN.id, // Occupied territory
        9,
        2
      )
      .end()
    .forBG()
      .takeUpArms(TEST_TERRITORIES.BASIN.id, 9, 2) // Flip advisors to fighters
      .end()
    .forFaction(Faction.ATREIDES)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'BG TAKE UP ARMS',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertBGAbilityTriggered(result.events, 'TAKE_UP_ARMS', 'FLIP');
  assertions.assertBGFlipped(
    result.events,
    TEST_TERRITORIES.BASIN.id,
    'ADVISORS',
    'FIGHTERS',
    2
  );
  
  console.log('✅ BG TAKE UP ARMS test passed\n');
}

/**
 * Run all BG abilities tests
 */
export async function runBGAbilitiesTests() {
  console.log('='.repeat(80));
  console.log('BG ABILITIES INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await testBGSpiritualAdvisor();
    await testBGSpiritualAdvisorFremenExclusion();
    await testBGIntrusion();
    await testBGWartime();
    await testBGTakeUpArms();
    console.log('✅ All BG abilities tests passed!');
  } catch (error) {
    console.error('❌ BG abilities tests failed:', error);
    throw error;
  }
}
