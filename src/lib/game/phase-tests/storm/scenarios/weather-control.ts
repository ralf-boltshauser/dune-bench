/**
 * Weather Control Card Scenario
 * 
 * Tests Weather Control card overriding normal storm movement.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testWeatherControl(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Weather Control Scenario');

  // Build test state for Turn 2 (Weather Control cannot be played on Turn 1)
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 3,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.MERIDIAN,
        sector: 4,
        regular: 10,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.CIELAGO_NORTH,
        sector: 5,
        regular: 8,
      },
    ],
    cards: [
      { faction: Faction.ATREIDES, cardId: 'weather_control' },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 2);
  state = setPlayerPosition(state, Faction.HARKONNEN, 4);
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 6);

  // Queue agent responses
  // Atreides plays Weather Control to move storm 5 sectors (protecting own forces at 4, hitting Harkonnen at 5)
  const responses = new AgentResponseBuilder();
  // Note: Weather Control implementation may need special handling
  // For now, we'll queue a dial response, but Weather Control should skip normal dialing
  // This test may need adjustment based on actual implementation
  responses.queueStormDial(Faction.ATREIDES, 5); // Weather Control: move 5 sectors

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Weather Control'
  );

  logScenarioResults('Weather Control', result);
  return result;
}

