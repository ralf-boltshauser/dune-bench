/**
 * Complex Mixed Scenario
 * 
 * Tests complex scenario with BG advanced ability + standard factions.
 * Some claim, some decline.
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testComplexMixed(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up Complex Mixed: BG (3), Atreides (0), Fremen (1), Harkonnen (5)');

  // Build test state
  const state = buildTestState({
    factions: [
      Faction.BENE_GESSERIT,
      Faction.ATREIDES,
      Faction.FREMEN,
      Faction.HARKONNEN,
    ],
    phase: undefined,
    turn: 1,
    advancedRules: true, // Advanced rules for BG ability
    spice: new Map([
      [Faction.BENE_GESSERIT, 3], // Eligible (advanced ability)
      [Faction.ATREIDES, 0], // Eligible (0 spice)
      [Faction.FREMEN, 1], // Eligible (1 spice)
      [Faction.HARKONNEN, 5], // Not eligible
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.BENE_GESSERIT);
  responses.queuePass(Faction.ATREIDES); // Decline
  responses.queueCharityClaim(Faction.FREMEN);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'Complex Mixed Scenario'
  );

  logScenarioResults('Complex Mixed Scenario', result);
  return result;
}

