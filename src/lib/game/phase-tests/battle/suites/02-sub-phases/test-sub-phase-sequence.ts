/**
 * Test: Sub-Phase Execution Order
 * Category: 2.1 Standard Sub-Phase Sequence
 * 
 * Tests for correct sub-phase transitions and execution order.
 */

import { Faction, TerritoryId, BattleSubPhase } from '../../../../types';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { runBattleScenario } from '../../scenarios/base-scenario';
import {
  assertEventOccurred,
  assertEventSequence,
} from '../../assertions';

describe('Sub-Phase Execution - Sequence', () => {
  it('should execute sub-phases in correct order: Voice → Prescience → Battle Plans → Reveal → Resolution', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.BENE_GESSERIT, Faction.ATREIDES)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, Faction.ATREIDES)
      .queueVoice(Faction.BENE_GESSERIT, {
        type: 'not_play',
        cardType: 'poison_weapon',
      })
      .queuePrescience(Faction.ATREIDES, 'weapon')
      .queuePrescienceReveal(Faction.BENE_GESSERIT, {
        weaponCardId: null,
      })
      .queueBattlePlan(Faction.BENE_GESSERIT, {
        leaderId: 'lady_jessica',
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'Sub-phase sequence');

    // Verify events occurred in correct order
    expect(assertEventSequence([
      'BATTLE_STARTED',
      'VOICE_USED',
      'PRESCIENCE_USED',
      'BATTLE_PLANS_REVEALED',
      'BATTLE_RESOLVED',
    ]).check(result)).toBe(true);

    expect(result.completed).toBe(true);
  });

  it('should skip Voice when BG not in battle', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN)
      .queuePrescience(Faction.ATREIDES, 'weapon')
      .queuePrescienceReveal(Faction.HARKONNEN, {
        weaponCardId: null,
      })
      .queueBattlePlan(Faction.ATREIDES, {
        leaderId: 'paul_atreides',
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'No Voice sub-phase');

    // Should NOT have VOICE_USED event
    expect(assertEventOccurred('VOICE_USED').check(result)).toBe(false);
    // Should have PRESCIENCE_USED
    expect(assertEventOccurred('PRESCIENCE_USED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should skip Prescience when Atreides not in battle', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.HARKONNEN, Faction.FREMEN)
      .withDefaultSpice()
      .build();

    const responses = new AgentResponseBuilder()
      .queueBattleChoice(Faction.HARKONNEN, TerritoryId.ARRAKEEN, Faction.FREMEN)
      .queueBattlePlan(Faction.HARKONNEN, {
        leaderId: 'feyd_rautha',
        forcesDialed: 5,
      })
      .queueBattlePlan(Faction.FREMEN, {
        leaderId: 'stilgar',
        forcesDialed: 4,
      });

    const result = await runBattleScenario(state, responses, 'No Prescience sub-phase');

    // Should NOT have PRESCIENCE_USED event
    expect(assertEventOccurred('PRESCIENCE_USED').check(result)).toBe(false);
    // Should go directly to battle plans
    expect(assertEventOccurred('BATTLE_PLANS_REVEALED').check(result)).toBe(true);
    expect(result.completed).toBe(true);
  });
});

