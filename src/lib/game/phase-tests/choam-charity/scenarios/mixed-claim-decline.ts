/**
 * Mixed Claim and Decline Scenario
 * 
 * Tests some factions claiming charity, others declining.
 * Expected: Only claiming factions receive spice
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testMixedClaimDecline(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up Mixed Claim/Decline: Atreides (0), Fremen (1), Harkonnen (0)');

  // Build test state
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN, Faction.HARKONNEN],
    phase: undefined,
    turn: 1,
    advancedRules: false,
    spice: new Map([
      [Faction.ATREIDES, 0], // Eligible - will claim
      [Faction.FREMEN, 1], // Eligible - will decline
      [Faction.HARKONNEN, 0], // Eligible - will claim
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.ATREIDES);
  responses.queuePass(Faction.FREMEN); // Decline
  responses.queueCharityClaim(Faction.HARKONNEN);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'Mixed Claim and Decline'
  );

  logScenarioResults('Mixed Claim and Decline', result);
  return result;
}

