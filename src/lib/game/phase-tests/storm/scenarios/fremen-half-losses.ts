/**
 * Fremen Half Losses Scenario
 * 
 * Tests that Fremen only lose half forces (rounded up) in storm.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testFremenHalfLosses(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Fremen Half Losses Scenario');

  // Build test state
  let state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 8,
    forces: [
      {
        faction: Faction.FREMEN,
        territory: TerritoryId.MERIDIAN,
        sector: 9,
        regular: 5, // Should lose 3 (half of 5, rounded up)
      },
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.MERIDIAN,
        sector: 9,
        regular: 5, // Should lose all 5
      },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.FREMEN, 7);
  state = setPlayerPosition(state, Faction.ATREIDES, 10);

  // Rebuild state with storm at 7 so we can move 2 sectors to hit sector 9
  state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 7, // Adjusted so movement of 2 hits sector 9
    forces: [
      {
        faction: Faction.FREMEN,
        territory: TerritoryId.MERIDIAN,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.MERIDIAN,
        sector: 9,
        regular: 5,
      },
    ],
  });
  state = setPlayerPosition(state, Faction.FREMEN, 6);
  state = setPlayerPosition(state, Faction.ATREIDES, 10);

  // Queue agent responses
  // Storm moves 2 sectors (from 7 to 9), hitting sector 9
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.FREMEN, 1);
  responses.queueStormDial(Faction.ATREIDES, 1);
  // Total: 2 sectors (storm moves from 7 to 9, hitting sector 9)

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Fremen Half Losses'
  );

  logScenarioResults('Fremen Half Losses', result);
  return result;
}

