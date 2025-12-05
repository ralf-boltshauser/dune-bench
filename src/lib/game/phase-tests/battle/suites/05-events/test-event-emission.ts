/**
 * Test: Event Emission
 * Category: 5. Battle Events Emission
 * 
 * Tests for correct event emission during battle phase.
 */

import { Faction, TerritoryId } from '../../../../types';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import {
  assertEventOccurred,
  assertEventSequence,
  assertEventCount,
  assertNoEvent,
} from '../../assertions';

describe('Event Emission', () => {
  it('should emit BATTLE_STARTED event when battles exist', async () => {
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

    const result = await runBattleScenario(state, responses, 'Event emission');

    expect(assertEventOccurred('BATTLE_STARTED').check(result)).toBe(true);
  });

  it('should emit NO_BATTLES event when no battles', async () => {
    const state = new BattleStateBuilder()
      .addForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 10)
      .withDefaultSpice()
      .build();

    // Only Atreides has forces - no battles
    const handler = new BattlePhaseHandler();
    const initResult = handler.initialize(state);

    expect(assertEventOccurred('NO_BATTLES').check({
      state,
      events: initResult.events,
      stepCount: 0,
      completed: false,
    })).toBe(true);
  });

  it('should emit events in correct sequence', async () => {
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

    const result = await runBattleScenario(state, responses, 'Event sequence');

    // Verify events occurred in correct order
    expect(assertEventSequence([
      'BATTLE_STARTED',
      'BATTLE_PLANS_REVEALED',
      'BATTLE_RESOLVED',
      'BATTLES_COMPLETE',
    ]).check(result)).toBe(true);
  });

  it('should emit BATTLES_COMPLETE event at phase end', async () => {
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

    const result = await runBattleScenario(state, responses, 'Phase end event');

    expect(assertEventOccurred('BATTLES_COMPLETE').check(result)).toBe(true);
  });
});

