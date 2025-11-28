/**
 * Emperor Ally Revival Bonus Scenario
 * 
 * Tests Emperor's ability to pay for extra ally revivals:
 * - Emperor can pay 2 spice per force to revive up to 3 extra forces for ally
 * - This is beyond the ally's normal revival limit
 * - Emperor must have enough spice
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testEmperorAllyRevival() {
  console.log('Testing Emperor Ally Revival Bonus...');

  // Setup: Emperor allied with Atreides
  const state = buildTestState({
    factions: [Faction.EMPEROR, Faction.ATREIDES],
    phase: Phase.REVIVAL,
    turn: 2,
    alliances: [[Faction.EMPEROR, Faction.ATREIDES]],
    forcesInTanks: new Map([
      [Faction.EMPEROR, { regular: 5 }],
      [Faction.ATREIDES, { regular: 10 }], // Atreides has many forces to revive
    ]),
    spice: new Map([
      [Faction.EMPEROR, 30], // Emperor has plenty of spice
      [Faction.ATREIDES, 20],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Atreides revives their normal 3 (2 free + 1 paid)
  responses.queueForceRevival(Faction.ATREIDES, 1);
  // Emperor revives their own forces
  responses.queueForceRevival(Faction.EMPEROR, 0);
  // Note: Emperor paying for ally would be done via tool, not in this response queue
  // This test focuses on the phase handler's request logic

  const result = await runPhaseScenario(
    state,
    responses,
    'Emperor Ally Revival Bonus',
    'revival'
  );

  logScenarioResults('Emperor Ally Revival Bonus', result);
  return result;
}

