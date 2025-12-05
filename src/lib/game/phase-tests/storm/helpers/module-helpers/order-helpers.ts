/**
 * Order calculation module test helpers
 */

import { Faction } from '../../../../types';
import { getPlayerPositions } from '../../../../state';
import { calculateStormOrder } from '../../../../state/factory';
import { StormTestStateBuilder } from '../test-state-builder';
import type { GameState } from '../../../../types';

export class OrderTestHelpers {
  /**
   * Calculate expected storm order
   */
  static calculateExpectedOrder(
    state: GameState,
    stormSector: number
  ): Faction[] {
    // Use the actual calculation function
    return calculateStormOrder(state);
  }

  /**
   * Assert storm order
   */
  static assertOrder(
    state: GameState,
    expectedFirst: Faction,
    expectedLast?: Faction
  ): void {
    if (state.stormOrder.length === 0) {
      throw new Error('Storm order is empty');
    }

    if (state.stormOrder[0] !== expectedFirst) {
      throw new Error(
        `Expected first player to be ${expectedFirst}, but got ${state.stormOrder[0]}`
      );
    }

    if (expectedLast) {
      const lastIndex = state.stormOrder.length - 1;
      if (state.stormOrder[lastIndex] !== expectedLast) {
        throw new Error(
          `Expected last player to be ${expectedLast}, but got ${state.stormOrder[lastIndex]}`
        );
      }
    }
  }

  /**
   * Create state for order test
   */
  static createOrderTestState(
    factions: Faction[],
    positions: Map<Faction, number>,
    stormSector: number
  ): GameState {
    const builder = StormTestStateBuilder
      .forTurn2(factions, stormSector);

    for (const [faction, sector] of positions.entries()) {
      builder.withPlayerPosition(faction, sector);
    }

    return builder.build();
  }

  /**
   * Assert player on storm goes last
   */
  static assertPlayerOnStormLast(
    state: GameState,
    stormSector: number,
    expectedLast: Faction
  ): void {
    const playerPositions = getPlayerPositions(state);
    const position = playerPositions.get(expectedLast);

    if (position !== stormSector) {
      throw new Error(
        `Expected ${expectedLast} to be on storm sector ${stormSector}, but at ${position}`
      );
    }

    const lastIndex = state.stormOrder.length - 1;
    if (state.stormOrder[lastIndex] !== expectedLast) {
      throw new Error(
        `Expected ${expectedLast} to be last in storm order, but got ${state.stormOrder[lastIndex]}`
      );
    }
  }
}

