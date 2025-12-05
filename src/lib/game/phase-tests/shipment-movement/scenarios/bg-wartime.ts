/**
 * BG WARTIME Tests (Rule 2.02.18)
 * 
 * Tests 5.1-5.6: BG WARTIME ability
 * "Before Shipment and Movement [1.06.00], in each Territory that you have advisors,
 * you may flip all of those advisors to fighters. This change must be publicly announced.✷"
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
 * Test 5.1: Basic WARTIME Trigger
 * BG WARTIME asked at phase start
 */
export async function testBGWartimeBasic() {
  console.log('\n🧪 Testing: BG WARTIME - Basic Trigger');

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
        regular: 5, // Will be converted to advisors manually // BG has advisors
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 3, // Will be converted to advisors manually // BG has advisors in multiple territories
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors (since ForcePlacement doesn't support advisors)
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);
  state = setBGAdvisors(state, TEST_TERRITORIES.ARRAKEEN.id, 9, 3);

  const responses = new AgentResponseBuilder();

  // BG: Flip all advisors to fighters in both territories (WARTIME)
  responses.queueBGWartime(Faction.BENE_GESSERIT, [
    { territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, sector: 9 },
    { territoryId: TEST_TERRITORIES.ARRAKEEN.id, sector: 9 },
  ]);

  // BG: Pass both (after WARTIME)
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME - Basic Trigger',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify WARTIME event was emitted
  const wartimeEvents = result.events.filter(
    (e) => e.type === 'BG_WARTIME' || e.type === 'FORCES_CONVERTED'
  );
  if (wartimeEvents.length === 0) {
    throw new Error('Expected BG_WARTIME or FORCES_CONVERTED event');
  }

  // Verify all advisors flipped to fighters
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  
  // Check Imperial Basin
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (basinStack && basinStack.advisors !== 0) {
    throw new Error(`Expected 0 advisors in Imperial Basin after WARTIME, got ${basinStack.advisors}`);
  }
  
  // Check Arrakeen
  const arrakeenStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 9
  );
  if (arrakeenStack && arrakeenStack.advisors !== 0) {
    throw new Error(`Expected 0 advisors in Arrakeen after WARTIME, got ${arrakeenStack.advisors}`);
  }

  logScenarioResults('BG WARTIME - Basic Trigger', result);
  return result;
}

/**
 * Test 5.2: WARTIME - Flip All Advisors
 * BG flips all advisors to fighters
 */
export async function testBGWartimeFlipAll() {
  console.log('\n🧪 Testing: BG WARTIME - Flip All Advisors');

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
        regular: 5, // Will be converted to advisors manually
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 3, // Will be converted to advisors manually
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.CARTHAG.id,
        sector: 9,
        regular: 2, // Will be converted to advisors manually
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // BG: Flip all advisors in all 3 territories
  responses.queueBGWartime(Faction.BENE_GESSERIT, [
    { territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, sector: 9 },
    { territoryId: TEST_TERRITORIES.ARRAKEEN.id, sector: 9 },
    { territoryId: TEST_TERRITORIES.CARTHAG.id, sector: 9 },
  ]);

  // BG: Pass both
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME - Flip All Advisors',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify all advisors flipped to fighters in all territories
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  
  const territories = [
    TEST_TERRITORIES.IMPERIAL_BASIN.id,
    TEST_TERRITORIES.ARRAKEEN.id,
    TEST_TERRITORIES.CARTHAG.id,
  ];
  
  for (const territoryId of territories) {
    const stack = bgState.forces.onBoard.find(
      (s) => s.territoryId === territoryId && s.sector === 9
    );
    if (stack && stack.advisors !== 0) {
      throw new Error(`Expected 0 advisors in ${territoryId} after WARTIME, got ${stack.advisors}`);
    }
  }

  logScenarioResults('BG WARTIME - Flip All Advisors', result);
  return result;
}

/**
 * Test 5.3: WARTIME - Selective Flip
 * BG flips advisors in some territories only
 */
export async function testBGWartimeSelective() {
  console.log('\n🧪 Testing: BG WARTIME - Selective Flip');

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
        regular: 5, // Will be converted to advisors manually
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.ARRAKEEN.id,
        sector: 9,
        regular: 3, // Will be converted to advisors manually
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.CARTHAG.id,
        sector: 9,
        regular: 2, // Will be converted to advisors manually
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);
  state = setBGAdvisors(state, TEST_TERRITORIES.ARRAKEEN.id, 9, 3);
  state = setBGAdvisors(state, TEST_TERRITORIES.CARTHAG.id, 9, 2);

  const responses = new AgentResponseBuilder();

  // BG: Flip advisors only in Imperial Basin and Arrakeen (not Carthag)
  responses.queueBGWartime(Faction.BENE_GESSERIT, [
    { territoryId: TEST_TERRITORIES.IMPERIAL_BASIN.id, sector: 9 },
    { territoryId: TEST_TERRITORIES.ARRAKEEN.id, sector: 9 },
  ]);

  // BG: Pass both
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME - Selective Flip',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify only selected territories flipped
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  
  // Imperial Basin: should have 0 advisors (flipped)
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (basinStack && basinStack.advisors !== 0) {
    throw new Error(`Expected 0 advisors in Imperial Basin after WARTIME, got ${basinStack.advisors}`);
  }
  
  // Arrakeen: should have 0 advisors (flipped)
  const arrakeenStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.ARRAKEEN.id && s.sector === 9
  );
  if (arrakeenStack && arrakeenStack.advisors !== 0) {
    throw new Error(`Expected 0 advisors in Arrakeen after WARTIME, got ${arrakeenStack.advisors}`);
  }
  
  // Carthag: should still have 2 advisors (not flipped)
  const carthagStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.CARTHAG.id && s.sector === 9
  );
  if (carthagStack && carthagStack.advisors !== 2) {
    throw new Error(`Expected 2 advisors in Carthag (not flipped), got ${carthagStack.advisors}`);
  }

  logScenarioResults('BG WARTIME - Selective Flip', result);
  return result;
}

/**
 * Test 5.4: WARTIME - BG Passes
 * BG can pass on WARTIME
 */
export async function testBGWartimePass() {
  console.log('\n🧪 Testing: BG WARTIME - BG Passes');

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
        regular: 5, // Will be converted to advisors manually
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });
  
  // Manually set advisors
  state = setBGAdvisors(state, TEST_TERRITORIES.IMPERIAL_BASIN.id, 9, 5);

  const responses = new AgentResponseBuilder();

  // BG: Pass on WARTIME
  responses.queueBGPassAbility(Faction.BENE_GESSERIT, 'WARTIME');

  // BG: Pass both
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME - BG Passes',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify advisors remain advisors (no conversion)
  const bgState = getFactionState(result.state, Faction.BENE_GESSERIT);
  const basinStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TEST_TERRITORIES.IMPERIAL_BASIN.id && s.sector === 9
  );
  if (basinStack && basinStack.advisors !== 5) {
    throw new Error(`Expected 5 advisors when BG passes on WARTIME, got ${basinStack.advisors}`);
  }

  logScenarioResults('BG WARTIME - BG Passes', result);
  return result;
}

/**
 * Test 5.5: WARTIME - Not Triggered if No Advisors
 * WARTIME only if BG has advisors
 */
export async function testBGWartimeNotIfNoAdvisors() {
  console.log('\n🧪 Testing: BG WARTIME - Not Triggered if No Advisors');

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
        regular: 5, // Only fighters, no advisors
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // BG: Pass both
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME - Not Triggered if No Advisors',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO WARTIME event (no advisors present)
  const wartimeEvents = result.events.filter(
    (e) => e.type === 'BG_WARTIME'
  );
  if (wartimeEvents.length > 0) {
    throw new Error('WARTIME should NOT trigger if BG has no advisors');
  }

  logScenarioResults('BG WARTIME - Not Triggered if No Advisors', result);
  return result;
}

/**
 * Test 5.6: WARTIME - Not in Basic Rules
 * WARTIME only in advanced rules
 */
export async function testBGWartimeNotInBasicRules() {
  console.log('\n🧪 Testing: BG WARTIME - Not in Basic Rules');

  let state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: false, // Basic rules
    forces: [
      {
        faction: Faction.BENE_GESSERIT,
        territory: TEST_TERRITORIES.IMPERIAL_BASIN.id,
        sector: 9,
        regular: 5, // Will be converted to advisors manually
      },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, SPICE_PRESETS.MEDIUM],
      [Faction.ATREIDES, SPICE_PRESETS.MEDIUM],
    ]),
  });

  const responses = new AgentResponseBuilder();

  // BG: Pass both
  responses.queuePassBoth(Faction.BENE_GESSERIT);

  // Atreides: Pass both
  responses.queuePassBoth(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'BG WARTIME - Not in Basic Rules',
    200
  );

  // Assertions
  if (!result.completed) {
    throw new Error('Expected phase to be complete');
  }
  
  // Verify NO WARTIME event (only in advanced rules)
  const wartimeEvents = result.events.filter(
    (e) => e.type === 'BG_WARTIME'
  );
  if (wartimeEvents.length > 0) {
    throw new Error('WARTIME should NOT trigger in basic rules');
  }

  logScenarioResults('BG WARTIME - Not in Basic Rules', result);
  return result;
}

/**
 * Run all BG WARTIME tests
 */
export async function runAllBGWartimeTests() {
  console.log('='.repeat(80));
  console.log('BG WARTIME TESTS');
  console.log('='.repeat(80));

  try {
    await testBGWartimeBasic();
  } catch (error) {
    console.error('BG WARTIME - Basic Trigger test failed:', error);
  }

  try {
    await testBGWartimeFlipAll();
  } catch (error) {
    console.error('BG WARTIME - Flip All Advisors test failed:', error);
  }

  try {
    await testBGWartimeSelective();
  } catch (error) {
    console.error('BG WARTIME - Selective Flip test failed:', error);
  }

  try {
    await testBGWartimePass();
  } catch (error) {
    console.error('BG WARTIME - BG Passes test failed:', error);
  }

  try {
    await testBGWartimeNotIfNoAdvisors();
  } catch (error) {
    console.error('BG WARTIME - Not Triggered if No Advisors test failed:', error);
  }

  try {
    await testBGWartimeNotInBasicRules();
  } catch (error) {
    console.error('BG WARTIME - Not in Basic Rules test failed:', error);
  }

  console.log('\n✅ All BG WARTIME tests completed.');
}

