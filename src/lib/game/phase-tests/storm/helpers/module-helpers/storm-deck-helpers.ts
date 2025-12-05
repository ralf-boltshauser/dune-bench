/**
 * Storm deck module test helpers
 */

import { Faction } from '../../../../types';
import { getFactionState } from '../../../../state';
import { StormTestStateBuilder } from '../test-state-builder';
import type { GameState } from '../../../../types';

export class StormDeckTestHelpers {
  /**
   * Create state with Fremen storm card
   */
  static createWithStoredCard(
    state: GameState,
    cardValue: string
  ): GameState {
    if (!state.factions.has(Faction.FREMEN)) {
      throw new Error('Fremen is not in the game');
    }

    const fremenState = getFactionState(state, Faction.FREMEN);
    const updatedFremenState = {
      ...fremenState,
      fremenStormCard: cardValue,
    };
    const updatedFactions = new Map(state.factions);
    updatedFactions.set(Faction.FREMEN, updatedFremenState);
    return { ...state, factions: updatedFactions };
  }

  /**
   * Assert storm deck operations
   */
  static assertDeckOperation(
    beforeState: GameState,
    afterState: GameState,
    operation: 'draw' | 'return' | 'shuffle'
  ): void {
    const beforeSize = beforeState.stormDeck.length;
    const afterSize = afterState.stormDeck.length;

    switch (operation) {
      case 'draw':
        if (afterSize !== beforeSize - 1) {
          throw new Error(
            `Expected deck size to decrease by 1 (${beforeSize} -> ${beforeSize - 1}), but got ${afterSize}`
          );
        }
        break;
      case 'return':
        // Return should increase size by 1
        if (afterSize !== beforeSize + 1) {
          throw new Error(
            `Expected deck size to increase by 1 (${beforeSize} -> ${beforeSize + 1}), but got ${afterSize}`
          );
        }
        break;
      case 'shuffle':
        // Shuffle maintains size but changes order
        if (afterSize !== beforeSize) {
          throw new Error(
            `Expected deck size to remain ${beforeSize} after shuffle, but got ${afterSize}`
          );
        }
        break;
    }
  }

  /**
   * Create state for Turn 1 card draw
   */
  static createTurn1DrawState(
    factions: Faction[]
  ): GameState {
    return StormTestStateBuilder
      .forTurn1(factions)
      .build();
  }

  /**
   * Create state for Turn 2+ reveal
   */
  static createTurn2RevealState(
    factions: Faction[],
    storedCard: string,
    stormSector: number
  ): GameState {
    return StormTestStateBuilder
      .withFremen(factions, 2)
      .withStormSector(stormSector)
      .withFremenStormCard(storedCard)
      .build();
  }

  /**
   * Assert Fremen has stored card
   */
  static assertStoredCard(
    state: GameState,
    expectedValue: string | null
  ): void {
    if (!state.factions.has(Faction.FREMEN)) {
      throw new Error('Fremen is not in the game');
    }

    const fremenState = getFactionState(state, Faction.FREMEN);
    const actualValue = fremenState.fremenStormCard || null;

    if (actualValue !== expectedValue) {
      throw new Error(
        `Expected Fremen storm card to be ${expectedValue}, but got ${actualValue}`
      );
    }
  }
}

