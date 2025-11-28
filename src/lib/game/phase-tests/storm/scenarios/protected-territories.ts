/**
 * Protected Territories Scenario
 * 
 * Tests that protected territories (Rock, Imperial Basin, Polar Sink) are safe from storm.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testProtectedTerritories(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Protected Territories Scenario');

  // Build test state
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 7,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ROCK_OUTCROPPINGS, // Rock territory (protected)
        sector: 8,
        regular: 10,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.IMPERIAL_BASIN, // Protected
        sector: 8,
        regular: 8,
      },
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.POLAR_SINK, // Never in storm
        sector: 0, // Polar Sink is always safe
        regular: 6,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 8,
        amount: 5,
      },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 6);
  state = setPlayerPosition(state, Faction.HARKONNEN, 9);
  state = setPlayerPosition(state, Faction.EMPEROR, 12);

  // Queue agent responses
  // Storm moves 1 sector (from 7 to 8), passing over sector 8
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 1);
  responses.queueStormDial(Faction.HARKONNEN, 1);
  // Total: 2 sectors (storm moves from 7 to 9, passing through 8)

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Protected Territories'
  );

  logScenarioResults('Protected Territories', result);
  return result;
}

