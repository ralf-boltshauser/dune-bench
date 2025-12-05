/**
 * Integration Tests: Ornithopter Access Flow
 * 
 * Tests for ornithopter access determination and movement range.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { EnhancedAgentResponseBuilder } from '../helpers/agent-response-builder-enhanced';
import { runPhaseScenario } from '../scenarios/base-scenario';
import * as assertions from '../assertions';
import { TEST_TERRITORIES, SPICE_PRESETS, FORCE_PRESETS } from '../helpers/fixtures';

/**
 * Test ornithopter access from Arrakeen
 */
export async function testOrnithopterAccessFromArrakeen() {
  console.log('\n=== Testing Ornithopter Access from Arrakeen ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.ARRAKEEN.id, // Has forces in Arrakeen
        sector: 9,
        ...FORCE_PRESETS.MEDIUM,
      },
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        ...FORCE_PRESETS.SMALL,
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
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.CARTHAG.id, // 2 territories away (within ornithopter range of 3)
        9,
        3
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Ornithopter Access from Arrakeen',
    200
  );

  assertions.assertPhaseCompleted(result);
    assertions.assertMovementSucceeded(
      result.events,
      Faction.ATREIDES,
      TEST_TERRITORIES.BASIN.id,
      TEST_TERRITORIES.CARTHAG.id,
      3
    );
  
  console.log('✅ Ornithopter access from Arrakeen test passed\n');
}

/**
 * Test ornithopter access from Carthag
 */
export async function testOrnithopterAccessFromCarthag() {
  console.log('\n=== Testing Ornithopter Access from Carthag ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.CARTHAG.id, // Has forces in Carthag
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
        TEST_TERRITORIES.CARTHAG.id,
        9,
        TEST_TERRITORIES.ARRAKEEN.id, // 2 territories away (within ornithopter range of 3)
        9,
        5
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Ornithopter Access from Carthag',
    200
  );

  assertions.assertPhaseCompleted(result);
    assertions.assertMovementSucceeded(
      result.events,
      Faction.ATREIDES,
      TEST_TERRITORIES.CARTHAG.id,
      TEST_TERRITORIES.ARRAKEEN.id,
      5
    );
  
  console.log('✅ Ornithopter access from Carthag test passed\n');
}

/**
 * Test no ornithopter access without forces in cities
 */
export async function testNoOrnithopterAccess() {
  console.log('\n=== Testing No Ornithopter Access ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TEST_TERRITORIES.BASIN.id, // Not in Arrakeen/Carthag
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
        TEST_TERRITORIES.BASIN.id,
        9,
        TEST_TERRITORIES.ARRAKEEN.id, // 1 territory away (adjacent, no ornithopters needed)
        9,
        5
      )
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'No Ornithopter Access',
    200
  );

  assertions.assertPhaseCompleted(result);
    assertions.assertMovementSucceeded(
      result.events,
      Faction.ATREIDES,
      TEST_TERRITORIES.BASIN.id,
      TEST_TERRITORIES.ARRAKEEN.id,
      5
    );
  
  console.log('✅ No ornithopter access test passed\n');
}

/**
 * Run all ornithopter flow tests
 */
export async function runOrnithopterFlowTests() {
  console.log('='.repeat(80));
  console.log('ORNITHOPTER FLOW INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await testOrnithopterAccessFromArrakeen();
    await testOrnithopterAccessFromCarthag();
    await testNoOrnithopterAccess();
    console.log('✅ All ornithopter flow tests passed!');
  } catch (error) {
    console.error('❌ Ornithopter flow tests failed:', error);
    throw error;
  }
}
