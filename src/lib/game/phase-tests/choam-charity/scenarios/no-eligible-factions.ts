/**
 * No Eligible Factions Scenario
 * 
 * Tests phase skip when no factions are eligible.
 * Expected: Phase completes immediately, no requests
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testNoEligibleFactions(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up No Eligible Factions: All with 2+ spice');

  // Build test state
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN, Faction.HARKONNEN],
    phase: undefined,
    turn: 1,
    advancedRules: false,
    spice: new Map([
      [Faction.ATREIDES, 5], // Not eligible
      [Faction.FREMEN, 3], // Not eligible
      [Faction.HARKONNEN, 4], // Not eligible
    ]),
  });

  // No responses needed - phase should complete immediately
  const responses = new AgentResponseBuilder();

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'No Eligible Factions'
  );

  logScenarioResults('No Eligible Factions', result);
  return result;
}

