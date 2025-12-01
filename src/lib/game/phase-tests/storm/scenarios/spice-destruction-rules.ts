/**
 * Spice Destruction Rules Scenario
 *
 * Tests that spice is destroyed in every affected sector:
 * - starting sector
 * - all intermediate sectors in the path
 * - ending sector
 *
 * Also ensures spice in non-affected sectors (even in the same territory)
 * is not destroyed.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testSpiceDestructionRules(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Spice Destruction Rules Scenario');

  // Build test state
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    territorySpice: [
      {
        territory: TerritoryId.MERIDIAN,
        sector: 5,
        amount: 5, // Starting sector - SHOULD be destroyed
      },
      {
        territory: TerritoryId.CIELAGO_NORTH,
        sector: 6,
        amount: 10, // Path - should be destroyed
      },
      {
        territory: TerritoryId.CIELAGO_SOUTH,
        sector: 7,
        amount: 8, // Ending sector - should be destroyed
      },
      {
        territory: TerritoryId.MERIDIAN,
        sector: 4,
        amount: 4, // Same territory, different sector - should survive
      },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 4);
  state = setPlayerPosition(state, Faction.HARKONNEN, 8);

  // Queue agent responses
  // Storm moves 2 sectors (from 5 to 7)
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 1);
  responses.queueStormDial(Faction.HARKONNEN, 1);
  // Total: 2 sectors

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Spice Destruction Rules'
  );

  logScenarioResults('Spice Destruction Rules', result);
  return result;
}

