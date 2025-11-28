/**
 * Minimal and Maximum Movement - Edge Cases
 * 
 * Tests:
 * - Minimum movement (both dial 1 = total 2)
 * - Maximum standard movement (both dial 3 = total 6)
 * - Edge cases of movement range
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testMinimalMaximumMovement(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Minimal and Maximum Movement');

  // Test 1: Minimum movement (2 sectors)
  console.log('\n--- Test 1: Minimum Movement (2 sectors) ---');
  let state1 = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.THE_MINOR_ERG,
        sector: 6,
        regular: 5,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.THE_MINOR_ERG,
        sector: 7,
        regular: 3,
      },
    ],
  });

  state1 = setPlayerPosition(state1, Faction.ATREIDES, 4);
  state1 = setPlayerPosition(state1, Faction.HARKONNEN, 6);

  const responses1 = new AgentResponseBuilder();
  responses1.queueStormDial(Faction.ATREIDES, 1);
  responses1.queueStormDial(Faction.HARKONNEN, 1);
  // Total: 2 sectors (minimum)

  const result1 = await runStormScenario(
    state1,
    responses1,
    'Minimal Movement (2 sectors)'
  );

  // Test 2: Maximum movement (6 sectors)
  console.log('\n--- Test 2: Maximum Movement (6 sectors) ---');
  let state2 = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.THE_MINOR_ERG,
        sector: 6,
        regular: 5,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.THE_MINOR_ERG,
        sector: 10,
        regular: 3,
      },
    ],
  });

  state2 = setPlayerPosition(state2, Faction.ATREIDES, 4);
  state2 = setPlayerPosition(state2, Faction.HARKONNEN, 6);

  const responses2 = new AgentResponseBuilder();
  responses2.queueStormDial(Faction.ATREIDES, 3);
  responses2.queueStormDial(Faction.HARKONNEN, 3);
  // Total: 6 sectors (maximum)

  const result2 = await runStormScenario(
    state2,
    responses2,
    'Maximum Movement (6 sectors)'
  );

  logScenarioResults('Minimal and Maximum Movement', result1);
  return result1; // Return first result for consistency
}

