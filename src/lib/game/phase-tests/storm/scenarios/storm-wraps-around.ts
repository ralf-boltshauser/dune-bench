/**
 * Storm Wraps Around Board - Edge Case Scenario
 * 
 * Tests:
 * - Storm movement wrapping from sector 17 to 0+
 * - Large movement that crosses the board boundary
 * - Forces in sectors 0, 1, 2 should be hit
 * - Correct wrapping calculation
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testStormWrapsAround(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Storm Wraps Around Board');

  // Build test state
  // Scenario: Storm at sector 17, will move 4 sectors → wraps to 0, 1, 2, 3
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 17, // At the end of the board
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.CIELAGO_NORTH, // Sand, sector 0
        sector: 0,
        regular: 10,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.CIELAGO_NORTH, // Sand, sector 1
        sector: 1,
        regular: 8,
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TerritoryId.CIELAGO_NORTH, // Sand, sector 2
        sector: 2,
        regular: 6,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.CIELAGO_NORTH,
        sector: 0,
        amount: 5,
      },
      {
        territory: TerritoryId.CIELAGO_NORTH,
        sector: 1,
        amount: 8,
      },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 16); // 1 behind storm
  state = setPlayerPosition(state, Faction.HARKONNEN, 0); // 1 ahead (wrapped)
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 3);

  // Queue agent responses
  // Expected dialers: Atreides (16) and Harkonnen (0) - nearest on either side
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 2);
  responses.queueStormDial(Faction.HARKONNEN, 2);
  // Total: 4 sectors
  // Storm moves from 17 → 0 → 1 → 2 → 3 (wraps around)
  // Expected: All forces in sectors 0, 1, 2 destroyed
  // Expected: Spice in sectors 0, 1 destroyed

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Storm Wraps Around Board'
  );

  logScenarioResults('Storm Wraps Around Board', result);
  return result;
}

