/**
 * Bene Gesserit Advanced Ability - One Spice Scenario
 * 
 * Tests BG advanced ability when they have 1 spice.
 * Expected: BG receives 2 spice (1 → 3), not bringing to 2
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testBGAdvancedOneSpice(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up BG Advanced - One Spice: BG (1 spice)');

  // Build test state
  const state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: undefined,
    turn: 1,
    advancedRules: true, // Advanced rules required for BG ability
    spice: new Map([
      [Faction.BENE_GESSERIT, 1], // Eligible due to advanced ability
      [Faction.ATREIDES, 5], // Not eligible
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.BENE_GESSERIT);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'BG Advanced - One Spice'
  );

  logScenarioResults('BG Advanced - One Spice', result);
  return result;
}

