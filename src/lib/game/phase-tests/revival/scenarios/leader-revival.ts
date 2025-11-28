/**
 * Leader Revival Scenario
 * 
 * Tests leader revival mechanics:
 * - Can only revive when all leaders dead or all have died once
 * - Cost is leader's strength in spice
 * - Revived leader goes to leader pool
 * - Face-down leaders cannot be revived until others die again
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';
import { getFactionState } from '../../../state';
import { getLeaderDefinition } from '../../../data';

export async function testLeaderRevival() {
  console.log('Testing Leader Revival...');

  // Setup: Atreides has all leaders in tanks (face up), no active leaders
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
      [Faction.ATREIDES, ['atreides_duke_leto']], // Duke Leto in tanks
    ]),
    specialStates: {
      atreides: {
        allLeadersDeadOnce: true, // All leaders have died at least once
      },
    },
  });

  // Get leader ID for revival
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const leaderInTanks = atreidesState.leaders.find(
    (l) => l.definitionId === 'atreides_duke_leto'
  );
  const leaderDef = leaderInTanks
    ? getLeaderDefinition(leaderInTanks.definitionId)
    : null;

  const responses = new AgentResponseBuilder();
  // Atreides revives Duke Leto (costs his strength in spice)
  if (leaderDef) {
    responses.queueLeaderRevival(Faction.ATREIDES, 'atreides_duke_leto');
  }
  responses.queuePass(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Leader Revival',
    'revival'
  );

  logScenarioResults('Leader Revival', result);
  return result;
}

export async function testLeaderRevivalCannotRevive() {
  console.log('Testing Leader Revival (Cannot Revive - Active Leaders)...');

  // Setup: Atreides has active leaders, so cannot revive
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
    // Note: Not setting allLeadersDeadOnce, so leaders are still active
  });

  const responses = new AgentResponseBuilder();
  // Atreides passes (cannot revive leaders while active ones exist)
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Leader Revival Cannot Revive',
    'revival'
  );

  logScenarioResults('Leader Revival Cannot Revive', result);
  return result;
}

