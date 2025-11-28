/**
 * Bene Gesserit Advanced Ability - High Spice Scenario
 * 
 * Tests BG advanced ability when they have high spice (5 spice).
 * Expected: BG receives 2 spice (5 → 7), not bringing to 2
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testBGAdvancedHighSpice(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up BG Advanced - High Spice: BG (5 spice), Atreides (0 spice)');

  // Build test state
  const state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    phase: undefined,
    turn: 1,
    advancedRules: true, // Advanced rules required for BG ability
    spice: new Map([
      [Faction.BENE_GESSERIT, 5], // Eligible due to advanced ability
      [Faction.ATREIDES, 0], // Eligible due to 0 spice
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.BENE_GESSERIT);
  responses.queueCharityClaim(Faction.ATREIDES);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'BG Advanced - High Spice'
  );

  logScenarioResults('BG Advanced - High Spice', result);
  return result;
}

