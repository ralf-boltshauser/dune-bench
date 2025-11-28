/**
 * Complex Multi-Faction Revival Scenario
 * 
 * Tests complex interactions with multiple factions:
 * - Multiple factions reviving simultaneously (no storm order)
 * - Different revival amounts and costs
 * - Mix of force and leader revivals
 * - Edge cases with insufficient spice
 */

import { Faction, Phase } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testComplexMultiFactionRevival() {
  console.log('Testing Complex Multi-Faction Revival...');

  // Setup: Multiple factions with different situations
  const state = buildTestState({
    factions: [
      Faction.ATREIDES,
      Faction.FREMEN,
      Faction.EMPEROR,
      Faction.HARKONNEN,
    ],
    phase: Phase.REVIVAL,
    turn: 3,
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 8 }],
      [Faction.FREMEN, { regular: 5, elite: 2 }], // Has Fedaykin
      [Faction.EMPEROR, { regular: 6, elite: 1 }], // Has Sardaukar
      [Faction.HARKONNEN, { regular: 4 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 15], // Can afford 1 paid
      [Faction.FREMEN, 5], // Low spice, only free
      [Faction.EMPEROR, 30], // Rich, can afford max
      [Faction.HARKONNEN, 1], // Very low spice, only free
    ]),
    leadersInTanks: new Map([
      [Faction.ATREIDES, ['atreides_duke_leto']],
    ]),
    specialStates: {
      atreides: {
        allLeadersDeadOnce: true,
      },
    },
  });

  const responses = new AgentResponseBuilder();
  // Atreides: 2 free + 1 paid + leader revival
  responses.queueForceRevival(Faction.ATREIDES, 1);
  responses.queueLeaderRevival(Faction.ATREIDES, 'atreides_duke_leto');
  // Fremen: 3 free (including 1 Fedaykin)
  responses.queueForceRevival(Faction.FREMEN, 0);
  // Emperor: 1 free + 2 paid (max revival)
  responses.queueForceRevival(Faction.EMPEROR, 2);
  // Harkonnen: 2 free only (low spice)
  responses.queueForceRevival(Faction.HARKONNEN, 0);

  const result = await runPhaseScenario(
    state,
    responses,
    'Complex Multi-Faction Revival',
    'revival'
  );

  logScenarioResults('Complex Multi-Faction Revival', result);
  return result;
}

export async function testInsufficientSpiceRevival() {
  console.log('Testing Insufficient Spice Revival...');

  // Setup: Faction wants to revive but doesn't have enough spice
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.REVIVAL,
    turn: 2,
    forcesInTanks: new Map([
      [Faction.ATREIDES, { regular: 10 }],
      [Faction.HARKONNEN, { regular: 5 }],
    ]),
    spice: new Map([
      [Faction.ATREIDES, 1], // Only 1 spice - can't afford paid revival
      [Faction.HARKONNEN, 15],
    ]),
  });

  const responses = new AgentResponseBuilder();
  // Atreides tries to revive 3 (2 free + 1 paid), but only has 1 spice
  // Handler should clamp to what they can afford
  responses.queueForceRevival(Faction.ATREIDES, 1); // Request 1 additional
  responses.queueForceRevival(Faction.HARKONNEN, 1);

  const result = await runPhaseScenario(
    state,
    responses,
    'Insufficient Spice Revival',
    'revival'
  );

  logScenarioResults('Insufficient Spice Revival', result);
  return result;
}

