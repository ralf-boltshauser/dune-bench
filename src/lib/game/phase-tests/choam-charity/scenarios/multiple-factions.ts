/**
 * Multiple Factions Simultaneous Scenario
 * 
 * Tests multiple factions claiming charity simultaneously.
 * Expected: All eligible factions receive correct amounts
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testMultipleFactions(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up Multiple Factions: Atreides (0), Fremen (1), Harkonnen (0), Emperor (4)');

  // Build test state
  const state = buildTestState({
    factions: [
      Faction.ATREIDES,
      Faction.FREMEN,
      Faction.HARKONNEN,
      Faction.EMPEROR,
    ],
    phase: undefined,
    turn: 1,
    advancedRules: false,
    spice: new Map([
      [Faction.ATREIDES, 0], // Eligible
      [Faction.FREMEN, 1], // Eligible
      [Faction.HARKONNEN, 0], // Eligible
      [Faction.EMPEROR, 4], // Not eligible
    ]),
  });

  // Queue agent responses (all claim simultaneously)
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.ATREIDES);
  responses.queueCharityClaim(Faction.FREMEN);
  responses.queueCharityClaim(Faction.HARKONNEN);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'Multiple Factions Simultaneous'
  );

  logScenarioResults('Multiple Factions Simultaneous', result);
  return result;
}

