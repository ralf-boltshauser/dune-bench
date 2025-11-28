/**
 * Fremen Alliance Boost Scenario
 * 
 * Tests Fremen's ability to grant 3 free revivals to their ally:
 * - Fremen is asked first if they want to grant the boost
 * - Ally gets 3 free revivals instead of their normal amount
 * - This is at Fremen's discretion each turn
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testFremenAllianceBoost() {
  console.log('Testing Fremen Alliance Boost...');

  // Setup: Fremen allied with Atreides, Atreides has forces in tanks
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.REVIVAL,
    turn: 2,
    alliances: [[Faction.FREMEN, Faction.ATREIDES]],
    forcesInTanks: new Map([
      [Faction.FREMEN, { regular: 3 }],
      [Faction.ATREIDES, { regular: 8 }], // Atreides has forces to revive
    ]),
    spice: new Map([
      [Faction.FREMEN, 10],
      [Faction.ATREIDES, 20],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Fremen grants the boost to Atreides
  responses.queueFremenBoost(Faction.FREMEN, true);
  // Atreides uses the 3 free revivals
  responses.queueForceRevival(Faction.ATREIDES, 0);
  // Fremen revives their own forces
  responses.queueForceRevival(Faction.FREMEN, 0);

  const result = await runPhaseScenario(
    state,
    responses,
    'Fremen Alliance Boost',
    'revival'
  );

  logScenarioResults('Fremen Alliance Boost', result);
  return result;
}

export async function testFremenAllianceBoostDenied() {
  console.log('Testing Fremen Alliance Boost (Denied)...');

  // Setup: Fremen allied with Atreides, but Fremen denies the boost
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.REVIVAL,
    turn: 2,
    alliances: [[Faction.FREMEN, Faction.ATREIDES]],
    forcesInTanks: new Map([
      [Faction.FREMEN, { regular: 3 }],
      [Faction.ATREIDES, { regular: 8 }],
    ]),
    spice: new Map([
      [Faction.FREMEN, 10],
      [Faction.ATREIDES, 20],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Fremen denies the boost
  responses.queueFremenBoost(Faction.FREMEN, false);
  // Atreides uses normal 2 free revivals
  responses.queueForceRevival(Faction.ATREIDES, 0);
  responses.queueForceRevival(Faction.FREMEN, 0);

  const result = await runPhaseScenario(
    state,
    responses,
    'Fremen Alliance Boost Denied',
    'revival'
  );

  logScenarioResults('Fremen Alliance Boost Denied', result);
  return result;
}

