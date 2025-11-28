/**
 * Tleilaxu Ghola Card Scenario
 * 
 * Tests Tleilaxu Ghola special card:
 * - Can revive 1 leader regardless of leader status
 * - Can revive up to 5 forces for free
 * - This is in addition to normal revival
 * - Card is discarded after use
 * 
 * Note: Tleilaxu Ghola is used via tool, not phase handler directly,
 * but we test the phase context where it would be used.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testTleilaxuGholaForceRevival() {
  console.log('Testing Tleilaxu Ghola Force Revival...');

  // Setup: Atreides has Tleilaxu Ghola card and forces in tanks
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.REVIVAL,
    turn: 2,
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 10 }], // Many forces to revive
      [Faction.HARKONNEN, { regular: 5 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 20],
      [Faction.HARKONNEN, 15],
    ]),
    cardsInHand: new Map([
      [Faction.ATREIDES, ['tleilaxu_ghola']],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Atreides uses normal revival (Ghola would be used via tool separately)
  responses.queueForceRevival(Faction.ATREIDES, 1); // 2 free + 1 paid
  responses.queuePass(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Tleilaxu Ghola Force Revival Context',
    'revival'
  );

  logScenarioResults('Tleilaxu Ghola Force Revival Context', result);
  return result;
}

export async function testTleilaxuGholaLeaderRevival() {
  console.log('Testing Tleilaxu Ghola Leader Revival...');

  // Setup: Atreides has Tleilaxu Ghola and a leader in tanks
  // Even though they have active leaders, Ghola allows revival
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.REVIVAL,
    turn: 2,
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 5 }],
      [Faction.HARKONNEN, { regular: 5 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 20],
      [Faction.HARKONNEN, 15],
    ]),
    leadersInTanks: new Map([
      [Faction.ATREIDES, ['atreides_duke_leto']],
    ]),
    cardsInHand: new Map([
      [Faction.ATREIDES, ['tleilaxu_ghola']],
    ]),
    // Note: Not setting allLeadersDeadOnce - Ghola bypasses this
  });

  const responses = new AgentResponseBuilder();
  // Atreides passes (Ghola would be used via tool separately)
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Tleilaxu Ghola Leader Revival Context',
    'revival'
  );

  logScenarioResults('Tleilaxu Ghola Leader Revival Context', result);
  return result;
}

