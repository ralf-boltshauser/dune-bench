/**
 * Fremen Fedaykin Revival Scenario
 * 
 * Tests Fremen Fedaykin elite force revival:
 * - Fedaykin count as 1 force in revival (not 2x)
 * - Only 1 Fedaykin can be revived per turn
 * - Fremen gets 3 free revivals (not 2)
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testFremenFedaykinRevival() {
  console.log('Testing Fremen Fedaykin Revival...');

  // Setup: Fremen has 5 regular + 3 Fedaykin in tanks
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.REVIVAL,
    turn: 2,
    forcesInTanks: new Map([
      [Faction.FREMEN, { regular: 5, elite: 3 }], // 3 Fedaykin
      [Faction.ATREIDES, { regular: 5 }],
    ]),
    spice: new Map([
      [Faction.FREMEN, 15],
      [Faction.ATREIDES, 20],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Fremen: 3 free (including 1 Fedaykin) - tests elite limit
  // Note: The handler processes regular + elite, but only 1 elite per turn
  responses.queueForceRevival(Faction.FREMEN, 0); // Just free revival
  responses.queuePass(Faction.ATREIDES);

  const result = await runPhaseScenario(
    state,
    responses,
    'Fremen Fedaykin Revival',
    'revival'
  );

  logScenarioResults('Fremen Fedaykin Revival', result);
  return result;
}

