/**
 * Kwisatz Haderach Revival Scenario
 * 
 * Tests Atreides Kwisatz Haderach revival:
 * - Can revive KH when all leaders have died once or no active leaders
 * - Costs 2 spice (KH strength is +2)
 * - KH can be revived instead of a leader
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testKwisatzHaderachRevival() {
  console.log('Testing Kwisatz Haderach Revival...');

  // Setup: Atreides has KH dead, all leaders have died once
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.REVIVAL,
    turn: 2,
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 5 }],
      [Faction.HARKONNEN, { regular: 5 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 20], // Enough for KH revival (2 spice)
      [Faction.HARKONNEN, 15],
    ]),
    specialStates: {
      atreides: {
        kwisatzHaderachDead: true,
        allLeadersDeadOnce: true,
      },
    },
  });

  const responses = new AgentResponseBuilder();
  // Atreides revives Kwisatz Haderach
  responses.queueKwisatzHaderachRevival(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Kwisatz Haderach Revival',
    'revival'
  );

  logScenarioResults('Kwisatz Haderach Revival', result);
  return result;
}

export async function testKwisatzHaderachCannotRevive() {
  console.log('Testing Kwisatz Haderach Revival (Cannot Revive)...');

  // Setup: Atreides has KH dead, but still has active leaders
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
    specialStates: {
      atreides: {
        kwisatzHaderachDead: true,
        // Not setting allLeadersDeadOnce, so active leaders exist
      },
    },
  });

  const responses = new AgentResponseBuilder();
  // Atreides passes (cannot revive KH while active leaders exist)
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);

  const result = await runPhaseScenario(
    state,
    responses,
    'Kwisatz Haderach Cannot Revive',
    'revival'
  );

  logScenarioResults('Kwisatz Haderach Cannot Revive', result);
  return result;
}

