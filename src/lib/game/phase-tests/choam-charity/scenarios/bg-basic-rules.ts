/**
 * Bene Gesserit Basic Rules Scenario
 * 
 * Tests BG follows standard rules in basic game (no advanced ability).
 * Expected: Only BG with 0-1 spice is eligible
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testBGBasicRules(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up BG Basic Rules: BG (1 spice), BG (5 spice)');

  // Build test state with two BG factions (simulating different spice levels)
  // Note: In actual game, there's only one BG faction, but we can test eligibility
  const state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: undefined,
    turn: 1,
    advancedRules: false, // Basic rules - no BG advanced ability
    spice: new Map([
      [Faction.BENE_GESSERIT, 1], // Eligible (1 spice)
      [Faction.ATREIDES, 5], // Not eligible (5 spice)
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.BENE_GESSERIT);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'BG Basic Rules'
  );

  logScenarioResults('BG Basic Rules', result);
  return result;
}

