/**
 * Standard Charity - Zero Spice Scenario
 * 
 * Tests standard charity for faction with 0 spice.
 * Expected: Faction receives 2 spice (0 → 2)
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testStandardZeroSpice(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up Standard Charity - Zero Spice: Atreides (0 spice)');

  // Build test state
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: undefined, // Will be set to CHOAM_CHARITY
    turn: 1,
    advancedRules: false,
    spice: new Map([
      [Faction.ATREIDES, 0], // Eligible
      [Faction.HARKONNEN, 5], // Not eligible
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.ATREIDES);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'Standard Charity - Zero Spice'
  );

  logScenarioResults('Standard Charity - Zero Spice', result);
  return result;
}

