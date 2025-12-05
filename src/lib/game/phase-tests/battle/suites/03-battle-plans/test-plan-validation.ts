/**
 * Test: Battle Plans Validation
 * Category: 3. Battle Plans Validation and Processing
 * 
 * Tests for battle plan validation (forces, leader, cards).
 */

import { Faction, TerritoryId } from '../../../../types';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import { assertEventOccurred } from '../../assertions';

describe('Battle Plans - Validation', () => {
  it('should validate forces dialed >= 0', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 0, // Valid: can dial 0
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 0,
      });

    const result = await runBattleScenario(state, responses, 'Zero forces dialed');

    expect(result.completed).toBe(true);
    expect(assertEventOccurred('BATTLE_RESOLVED').check(result)).toBe(true);
  });

  it('should validate forces dialed <= forces in territory', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 10, // Valid: matches forces in territory
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 8, // Valid: matches forces in territory
      });

    const result = await runBattleScenario(state, responses, 'Max forces dialed');

    expect(result.completed).toBe(true);
  });

  it('should require leader or Cheap Hero when available', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides', // Valid: leader provided
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha', // Valid: leader provided
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'Leaders required');

    expect(result.completed).toBe(true);
  });

  it('should allow Cheap Hero in lieu of leader', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: null,
        useCheapHero: true, // Valid: Cheap Hero instead of leader
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'Cheap Hero used');

    expect(result.completed).toBe(true);
  });

  it('should emit NO_LEADER_ANNOUNCED when no leader/Cheap Hero available', async () => {
    // Create state where a faction has no leaders available
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    // Move all leaders to tanks (unavailable)
    const atreidesState = state.factions.get(Faction.ATREIDES);
    if (atreidesState) {
      atreidesState.leaders.forEach(leader => {
        leader.location = 'tanks_face_up';
        leader.hasBeenKilled = true;
      });
    }

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: null,
        useCheapHero: false, // No Cheap Hero either
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'No leader available');

    // Should have NO_LEADER_ANNOUNCED event
    expect(assertEventOccurred('NO_LEADER_ANNOUNCED').check(result)).toBe(true);
  });
});

