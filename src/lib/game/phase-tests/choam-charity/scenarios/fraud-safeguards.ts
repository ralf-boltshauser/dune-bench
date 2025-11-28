/**
 * Fraud Safeguards Scenario
 * 
 * Tests that factions can only claim charity once per turn.
 * Expected: Second claim is rejected
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testFraudSafeguards(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up Fraud Safeguards: Atreides (0 spice)');

  // Build test state
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: undefined,
    turn: 1,
    advancedRules: false,
    spice: new Map([
      [Faction.ATREIDES, 0], // Eligible
      [Faction.HARKONNEN, 5], // Not eligible
    ]),
  });

  // Queue agent responses - first claim, then attempt second claim
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.ATREIDES);
  // Note: The handler should prevent second claim via processedFactions Set
  // We'll queue a second response to test the safeguard
  responses.queueCharityClaim(Faction.ATREIDES);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'Fraud Safeguards'
  );

  logScenarioResults('Fraud Safeguards', result);
  return result;
}

