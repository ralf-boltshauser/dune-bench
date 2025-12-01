/**
 * Edge Case: Turn 1 - Only 1 Faction Not at Sector 0
 * 
 * Tests Turn 1 fallback logic when only one faction is not at sector 0.
 * Verifies two different dialers are still selected.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: Turn 1 Single Faction Not at Sector 0
 * 
 * Tests:
 * - Turn 1 dialer selection with most factions at sector 0
 * - Fallback logic finds two different dialers
 * - Both dial requests created
 * - Correct movement calculated
 */
export async function testEdgeCaseTurn1SingleFaction(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: Turn 1 - Only 1 Faction Not at Sector 0');

  // Build test state for Turn 1
  // Scenario: 4 factions, but 3 are at sector 0, only 1 is not
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.FREMEN],
    phase: Phase.STORM,
    turn: 1,
    advancedRules: true,
  });

  // Set player positions - 3 at sector 0, 1 at sector 1
  state = setPlayerPosition(state, Faction.ATREIDES, 0); // At storm start
  state = setPlayerPosition(state, Faction.HARKONNEN, 0); // At storm start
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 0); // At storm start
  state = setPlayerPosition(state, Faction.FREMEN, 1); // Only one not at sector 0

  // Queue agent responses
  // Expected dialers: Two factions (likely one at 0 and Fremen, or two at 0)
  // Validation should ensure two different factions
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 5);
  responses.queueStormDial(Faction.FREMEN, 8);
  // Total: 13 sectors
  // Storm starts at 0, moves 13 sectors counterclockwise → ends at sector 13

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Edge Case: Turn 1 - Only 1 Faction Not at Sector 0'
  );

  logScenarioResults('Edge Case: Turn 1 - Only 1 Faction Not at Sector 0', result);
  return result;
}

