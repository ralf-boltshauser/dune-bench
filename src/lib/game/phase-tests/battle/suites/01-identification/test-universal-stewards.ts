/**
 * Test: Universal Stewards Rule
 * Category: 1.6 Universal Stewards Rule (Rule 2.02.22)
 * 
 * Tests for the Universal Stewards rule: advisors alone in territory
 * automatically flip to fighters before battle phase.
 */

import { Faction, TerritoryId } from '../../../../types';
import { BattlePhaseHandler } from '../../../../phases/handlers/battle';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import {
  assertAdvisorsFlipped,
  assertNoEvent,
} from '../../assertions';
import { getFactionState } from '../../../../state';

describe('Battle Identification - Universal Stewards', () => {
  it('should auto-flip advisors to fighters when alone in territory', async () => {
    // Create state with BG advisors alone in territory
    const state = new BattleStateBuilder()
      .withAdvancedRules(true)
      .build();

    // Manually add BG advisors (test-state-builder doesn't support advisors directly)
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    if (bgState.forces.onBoard.length === 0) {
      bgState.forces.onBoard.push({
        territoryId: TerritoryId.ARRAKEEN,
        sector: 9,
        forces: { regular: 0, elite: 0 },
        advisors: 5, // Advisors alone
      });
    }

    const handler = new BattlePhaseHandler();
    const initResult = handler.initialize(state);

    // Should have ADVISORS_FLIPPED event
    expect(assertAdvisorsFlipped(Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 5).check({
      state: initResult.state,
      events: initResult.events,
      stepCount: 0,
      completed: false,
    })).toBe(true);
  });

  it('should only apply when advanced rules enabled', async () => {
    const state = new BattleStateBuilder()
      .withAdvancedRules(false) // Basic rules
      .build();

    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    if (bgState.forces.onBoard.length === 0) {
      bgState.forces.onBoard.push({
        territoryId: TerritoryId.ARRAKEEN,
        sector: 9,
        forces: { regular: 0, elite: 0 },
        advisors: 5,
      });
    }

    const handler = new BattlePhaseHandler();
    const initResult = handler.initialize(state);

    // Should NOT have ADVISORS_FLIPPED event in basic rules
    expect(assertNoEvent('ADVISORS_FLIPPED').check({
      state: initResult.state,
      events: initResult.events,
      stepCount: 0,
      completed: false,
    })).toBe(true);
  });

  it('should respect PEACETIME restriction (ally present)', async () => {
    const state = new BattleStateBuilder()
      .twoFactionBattle(Faction.BENE_GESSERIT, Faction.ATREIDES)
      .withAlliance(Faction.BENE_GESSERIT, Faction.ATREIDES)
      .withAdvancedRules(true)
      .build();

    // BG has advisors, but ally (Atreides) is present
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const stack = bgState.forces.onBoard.find(s => s.territoryId === TerritoryId.ARRAKEEN);
    if (stack) {
      stack.advisors = 5;
      stack.forces.regular = 0;
    }

    const handler = new BattlePhaseHandler();
    const initResult = handler.initialize(state);

    // PEACETIME: advisors cannot flip with ally present
    expect(assertNoEvent('ADVISORS_FLIPPED').check({
      state: initResult.state,
      events: initResult.events,
      stepCount: 0,
      completed: false,
    })).toBe(true);
  });
});

