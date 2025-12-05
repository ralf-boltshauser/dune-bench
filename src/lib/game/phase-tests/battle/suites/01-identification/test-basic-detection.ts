/**
 * Test: Basic Battle Detection
 * Category: 1.1 Basic Battle Detection
 * 
 * Tests for identifying battles in territories with multiple factions.
 */

import { Faction, TerritoryId } from '../../../../types';
import { BattlePhaseHandler } from '../../../../phases/handlers/battle';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import {
  assertEventOccurred,
  assertNoEvent,
  assertNoBattles,
} from '../../assertions';

describe('Battle Identification - Basic Detection', () => {
  it('should identify battles in territories with 2+ factions', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'Two-faction battle detection');

    expect(assertEventOccurred('BATTLE_STARTED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should exclude territories with only one faction', async () => {
    const state = new BattleStateBuilder()
      .addForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 10)
      .withDefaultSpice()
      .build();

    // Only Atreides has forces - no battles
    const handler = new BattlePhaseHandler();
    const initResult = handler.initialize(state);

    expect(assertNoBattles().check({ state, events: initResult.events, stepCount: 0, completed: false })).toBe(true);
    expect(initResult.phaseComplete).toBe(true);
  });

  it('should exclude Polar Sink even with multiple factions', async () => {
    const state = new BattleStateBuilder()
      .addForces(Faction.ATREIDES, TerritoryId.POLAR_SINK, 9, 10)
      .addForces(Faction.HARKONNEN, TerritoryId.POLAR_SINK, 9, 8)
      .withDefaultSpice()
      .build();

    const handler = new BattlePhaseHandler();
    const initResult = handler.initialize(state);

    // Polar Sink is neutral - no battles should be identified
    expect(assertNoBattles().check({ state, events: initResult.events, stepCount: 0, completed: false })).toBe(true);
  });

  it('should identify battles in same sector under storm (BATTLING BLIND)', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9)
      .withDefaultSpice()
      .build();

    // Set storm to sector 9 (same as forces)
    state.stormMarker = 9;

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'Battling blind');

    // Forces in same sector under storm still battle
    expect(assertEventOccurred('BATTLE_STARTED').check(result)).toBe(true);
  });
});

