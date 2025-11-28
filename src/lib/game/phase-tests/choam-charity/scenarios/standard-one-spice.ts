/**
 * Standard Charity - One Spice Scenario
 * 
 * Tests standard charity for faction with 1 spice.
 * Expected: Faction receives 1 spice (1 → 2)
 */

import { Faction } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runCharityScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testStandardOneSpice(): Promise<ScenarioResult> {
  console.log('\n💰 Setting up Standard Charity - One Spice: Fremen (1 spice)');

  // Build test state
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.EMPEROR],
    phase: undefined,
    turn: 1,
    advancedRules: false,
    spice: new Map([
      [Faction.FREMEN, 1], // Eligible
      [Faction.EMPEROR, 3], // Not eligible
    ]),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueCharityClaim(Faction.FREMEN);

  // Run scenario
  const result = await runCharityScenario(
    state,
    responses,
    'Standard Charity - One Spice'
  );

  logScenarioResults('Standard Charity - One Spice', result);
  return result;
}

