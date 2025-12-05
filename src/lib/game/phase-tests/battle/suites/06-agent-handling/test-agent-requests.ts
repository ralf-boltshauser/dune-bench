/**
 * Test: Agent Request/Response Handling
 * Category: 6. Agent Requests/Responses Handling
 * 
 * Tests for agent request creation and response processing.
 */

import { Faction, TerritoryId } from '../../../../types';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import { assertEventOccurred } from '../../assertions';

describe('Agent Request/Response Handling', () => {
  it('should send battle choice request to current aggressor', async () => {
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

    const result = await runBattleScenario(state, responses, 'Battle choice request');

    // Should process battle choice and continue
    expect(assertEventOccurred('BATTLE_STARTED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should send battle plans request to both factions simultaneously', async () => {
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

    const result = await runBattleScenario(state, responses, 'Battle plans request');

    // Both factions should have provided plans
    expect(assertEventOccurred('BATTLE_PLANS_REVEALED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should use default plans when agent does not respond', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN);
    // No battle plan responses - should use defaults

    const result = await runBattleScenario(state, responses, 'Default plans');

    // Should still complete with default plans
    expect(result.completed).toBe(true);
  });
});

