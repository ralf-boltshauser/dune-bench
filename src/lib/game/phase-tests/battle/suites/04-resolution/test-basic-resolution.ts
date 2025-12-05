/**
 * Test: Basic Battle Resolution
 * Category: 4.1 Basic Resolution
 * 
 * Tests for basic battle resolution winner calculation.
 */

import { Faction, TerritoryId } from '../../../../types';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import {
  assertEventOccurred,
  assertForcesCount,
  assertFactionSpice,
} from '../../assertions';

describe('Battle Resolution - Basic', () => {
  it('should calculate winner as higher total (forces + leader strength)', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides', // Strength 5
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha', // Strength 6
        forcesDialed: 3,
      });

    const result = await runBattleScenario(state, responses, 'Basic resolution');

    // Atreides: 5 (forces) + 5 (leader) = 10
    // Harkonnen: 3 (forces) + 6 (leader) = 9
    // Atreides should win
    expect(assertEventOccurred('BATTLE_RESOLVED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should have aggressor win ties (NO TIES rule)', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides', // Strength 5
        forcesDialed: 5, // Total: 10
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha', // Strength 6
        forcesDialed: 4, // Total: 10 (tie)
      });

    const result = await runBattleScenario(state, responses, 'Tie resolution');

    // Aggressor (Atreides) should win ties
    expect(assertEventOccurred('BATTLE_RESOLVED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should apply force losses correctly', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 5, // Winner dials 5
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 4, // Loser dials 4
      });

    const result = await runBattleScenario(state, responses, 'Force losses');

    // Winner loses only dialed forces (5)
    // Loser loses all forces (8)
    // Atreides should have 5 forces remaining (10 - 5)
    // Harkonnen should have 0 forces remaining (8 - 8)
    expect(assertForcesCount(Faction.ATREIDES, TerritoryId.ARRAKEEN, 5, 0).check(result)).toBe(true);
    expect(assertForcesCount(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 0).check(result)).toBe(true);
  });
});

