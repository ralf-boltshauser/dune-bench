/**
 * Edge Case: Only 2 Factions Exist
 * 
 * Tests dialer selection when only 2 factions are in the game.
 * Verifies that two different dialers are always selected.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: Only 2 Factions
 * 
 * Tests:
 * - Two different dialers selected when only 2 factions exist
 * - Both dial requests created correctly
 * - Both responses processed
 * - Correct movement calculated
 */
export async function testEdgeCaseOnlyTwoFactions(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: Only 2 Factions');

  // Build test state with only 2 factions
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
  });

  // Set player positions on opposite sides of storm
  // Atreides at 2 (3 sectors before storm), Harkonnen at 8 (3 sectors after storm)
  state = setPlayerPosition(state, Faction.ATREIDES, 2);
  state = setPlayerPosition(state, Faction.HARKONNEN, 8);

  // Queue agent responses for both factions
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 2); // One dial
  responses.queueStormDial(Faction.HARKONNEN, 3); // Other dial
  // Total: 5 sectors
  // Storm at 5, moves 5 sectors counterclockwise → ends at sector 10

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Edge Case: Only 2 Factions'
  );

  logScenarioResults('Edge Case: Only 2 Factions', result);
  return result;
}

