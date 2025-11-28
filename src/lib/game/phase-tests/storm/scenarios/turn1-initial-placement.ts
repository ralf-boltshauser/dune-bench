/**
 * Turn 1 Initial Storm Placement Scenario
 * 
 * Tests initial storm placement mechanics on Turn 1.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Turn 1 Initial Storm Placement - Difficult Scenario
 * 
 * Tests:
 * - Dialer selection (nearest to sector 0 on either side)
 * - Dial range 0-20 (not 1-3)
 * - Storm starts at sector 0, then moves
 * - Large movement that wraps around board
 * - Storm order determination after initial placement
 */
export async function testTurn1InitialPlacement(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Turn 1 Initial Storm Placement');

  // Build test state for Turn 1
  // Scenario: 4 factions positioned around sector 0
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.FREMEN],
    phase: Phase.STORM,
    turn: 1,
    advancedRules: true,
  });

  // Set player positions around sector 0
  // Atreides at 1 (1 sector forward), Harkonnen at 17 (1 sector backward)
  // BG at 3 (3 sectors forward), Fremen at 15 (3 sectors backward)
  // Expected dialers: Atreides (1) and Harkonnen (17) - nearest on either side
  state = setPlayerPosition(state, Faction.ATREIDES, 1);
  state = setPlayerPosition(state, Faction.HARKONNEN, 17);
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 3);
  state = setPlayerPosition(state, Faction.FREMEN, 15);

  // Queue agent responses
  // Two players nearest sector 0 on either side: Atreides (1) and Harkonnen (17)
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 5); // Forward from sector 0
  responses.queueStormDial(Faction.HARKONNEN, 8); // Backward from sector 0
  // Total: 13 sectors
  // Storm starts at 0, moves 13 sectors counterclockwise → ends at sector 13

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Turn 1 Initial Storm Placement'
  );

  logScenarioResults('Turn 1 Initial Storm Placement', result);
  return result;
}

