/**
 * Basic Force Revival Scenario
 * 
 * Tests basic force revival mechanics:
 * - Free revival (2 for most factions, 3 for Fremen)
 * - Paid revival (2 spice per force)
 * - Revival limits (max 3 per turn)
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testBasicForceRevival() {
  console.log('Testing Basic Force Revival...');

  // Setup: Atreides has 10 forces in tanks, 20 spice
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.REVIVAL,
    turn: 2,
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 10 }],
      [Faction.HARKONNEN, { regular: 5 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 20],
      [Faction.HARKONNEN, 10],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Atreides: 2 free + 1 paid = 3 total (costs 2 spice)
  responses.queueForceRevival(Faction.ATREIDES, 1);
  // Harkonnen: 2 free only (no paid)
  responses.queueForceRevival(Faction.HARKONNEN, 0);

  const result = await runPhaseScenario(
    state,
    responses,
    'Basic Force Revival',
    'revival'
  );

  logScenarioResults('Basic Force Revival', result);
  return result;
}

