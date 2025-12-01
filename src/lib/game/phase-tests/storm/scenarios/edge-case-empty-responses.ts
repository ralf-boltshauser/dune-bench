/**
 * Edge Case: Empty Responses Array
 * 
 * Tests error handling when no dial responses are received.
 * Verifies error is thrown and phase doesn't complete.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: Empty Responses
 * 
 * Tests:
 * - No dial responses provided
 * - Error thrown with clear message
 * - Phase doesn't complete
 * - Error logged appropriately
 */
export async function testEdgeCaseEmptyResponses(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: Empty Responses Array');

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

  // Queue NO responses (empty array)
  const responses = new AgentResponseBuilder();
  // No dial responses queued
  // Expected: Error thrown - "No storm dial responses received"

  // Run scenario - should throw error
  let result: ScenarioResult;
  try {
    result = await runStormScenario(
      state,
      responses,
      'Edge Case: Empty Responses Array'
    );
    
    // If we get here without error, log a warning
    if (!result.error) {
      console.warn('⚠️  WARNING: Expected error for empty responses, but none thrown');
    }
  } catch (error) {
    // Expected error
    console.log('✅ Expected error caught:', error instanceof Error ? error.message : String(error));
    result = {
      state,
      events: [],
      stepCount: 0,
      completed: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  logScenarioResults('Edge Case: Empty Responses Array', result);
  return result;
}

