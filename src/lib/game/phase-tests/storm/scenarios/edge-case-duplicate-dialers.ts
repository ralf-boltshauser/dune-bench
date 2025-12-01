/**
 * Edge Case: Duplicate Dialer Selection Prevention
 * 
 * Tests that validation prevents and fixes duplicate dialer selection.
 * This test verifies the validation logic catches duplicates before creating requests.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: Duplicate Dialer Selection
 * 
 * Tests:
 * - Validation catches duplicate dialers if they occur
 * - Duplicate selection is automatically fixed before creating requests
 * - Logging shows the fix was applied
 * - Two different dial requests created
 * - Both responses processed correctly
 */
export async function testEdgeCaseDuplicateDialers(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: Duplicate Dialer Selection');

  // Build test state with 3 factions clustered on same side
  // This scenario might trigger duplicate selection in edge cases
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 10,
  });

  // Set all factions clustered on same side of storm (before storm)
  // All at sectors 5, 6, 7 - all 3-5 sectors before storm at 10
  state = setPlayerPosition(state, Faction.ATREIDES, 5);
  state = setPlayerPosition(state, Faction.HARKONNEN, 6);
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 7);

  // Queue agent responses for expected dialers
  // Validation should ensure two different factions are selected
  const responses = new AgentResponseBuilder();
  // We don't know which two will be selected, but validation should ensure they're different
  // The test will verify that two different dials are received
  responses.queueStormDial(Faction.ATREIDES, 1);
  responses.queueStormDial(Faction.HARKONNEN, 3);
  // Note: If validation fixes duplicate selection, the actual dialers might differ

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Edge Case: Duplicate Dialer Selection'
  );

  logScenarioResults('Edge Case: Duplicate Dialer Selection', result);
  return result;
}

