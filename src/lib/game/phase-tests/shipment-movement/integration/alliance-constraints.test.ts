/**
 * Integration Tests: Alliance Constraints
 * 
 * Tests for alliance constraint application.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { EnhancedAgentResponseBuilder } from '../helpers/agent-response-builder-enhanced';
import { runPhaseScenario } from '../scenarios/base-scenario';
import * as assertions from '../assertions';
import { TEST_TERRITORIES, SPICE_PRESETS } from '../helpers/fixtures';

/**
 * Test alliance constraint application
 */
export async function testAllianceConstraint() {
  console.log('\n=== Testing Alliance Constraint ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]],
    forces: [
      {
        faction: Faction.HARKONNEN,
        territory: TEST_TERRITORIES.BASIN.id,
        sector: 9,
        regular: 3,
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
      .shipTo(TEST_TERRITORIES.BASIN.id, 9, 5) // Same territory as ally
      .passMovement() // Don't move - forces stay in Basin with ally
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Alliance Constraint',
    200
  );

  assertions.assertPhaseCompleted(result);
  assertions.assertAllianceConstraintApplied(result.events, Faction.ATREIDES, 5);
  // Forces should be sent to Tanks (removed from territory)
  assertions.assertForcesSentToTanks(
    result.state,
    Faction.ATREIDES,
    TEST_TERRITORIES.BASIN.id,
    0
  );
  
  console.log('✅ Alliance constraint test passed\n');
}

/**
 * Test alliance constraint - Polar Sink exception
 */
export async function testAllianceConstraintPolarSinkException() {
  console.log('\n=== Testing Alliance Constraint - Polar Sink Exception ===');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    alliances: [[Faction.ATREIDES, Faction.HARKONNEN]],
    forces: [
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.POLAR_SINK,
        sector: 9,
        regular: 3,
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
      .shipTo(TerritoryId.POLAR_SINK, 9, 5) // Polar Sink - exception
      .passMovement()
      .end()
    .forFaction(Faction.HARKONNEN)
      .passBoth();

  const result = await runPhaseScenario(
    state,
    responses,
    'Alliance Constraint - Polar Sink Exception',
    200
  );

  assertions.assertPhaseCompleted(result);
  // Forces should remain in Polar Sink (not sent to Tanks)
  assertions.assertForcesInTerritory(
    result.state,
    Faction.ATREIDES,
    TerritoryId.POLAR_SINK,
    9,
    5
  );
  
  console.log('✅ Alliance constraint Polar Sink exception test passed\n');
}

/**
 * Run all alliance constraints tests
 */
export async function runAllianceConstraintsTests() {
  console.log('='.repeat(80));
  console.log('ALLIANCE CONSTRAINTS INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await testAllianceConstraint();
    await testAllianceConstraintPolarSinkException();
    console.log('✅ All alliance constraints tests passed!');
  } catch (error) {
    console.error('❌ Alliance constraints tests failed:', error);
    throw error;
  }
}
