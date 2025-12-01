/**
 * Edge Case: Only One Dial Received
 * 
 * Tests validation when only one dial response is received instead of two.
 * Verifies warning is logged and movement is still calculated (but incorrectly).
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: Single Dial Received
 * 
 * Tests:
 * - Only one dial response provided
 * - Warning logged for missing dial
 * - Movement calculated from single dial (incorrect)
 * - Storm still moves (but wrong amount)
 */
export async function testEdgeCaseSingleDial(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: Only One Dial Received');

  // Build test state
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 2);
  state = setPlayerPosition(state, Faction.HARKONNEN, 8);

  // Queue only ONE dial response (simulating missing response)
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 2); // Only one dial
  // Missing: Harkonnen dial
  // Expected: Warning logged, movement = 2 (should be 2-6 from two dials)

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Edge Case: Single Dial Received'
  );

  logScenarioResults('Edge Case: Single Dial Received', result);
  return result;
}

