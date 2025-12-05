/**
 * Dialing module test helpers
 */

import { Faction, TerritoryId } from '../../../../types';
import { StormTestStateBuilder } from '../test-state-builder';
import type { GameState } from '../../../../types';

export class DialingTestHelpers {
  /**
   * Create state for dialer selection test
   */
  static createDialerSelectionState(
    factions: Faction[],
    positions: Map<Faction, number>,
    turn: number,
    stormSector?: number
  ): GameState {
    const builder = turn === 1
      ? StormTestStateBuilder.forTurn1(factions)
      : StormTestStateBuilder.forTurn2(factions, stormSector || 0);

    for (const [faction, sector] of positions.entries()) {
      builder.withPlayerPosition(faction, sector);
    }

    return builder.build();
  }

  /**
   * Assert correct dialers selected
   */
  static assertDialersSelected(
    dialers: [Faction, Faction],
    expected: [Faction, Faction]
  ): void {
    // Check that both expected dialers are in the result (order may vary)
    const dialerSet = new Set(dialers);
    const expectedSet = new Set(expected);

    if (dialerSet.size !== expectedSet.size) {
      throw new Error(
        `Expected dialers ${expected.join(', ')}, but got ${dialers.join(', ')}`
      );
    }

    for (const expectedDialer of expected) {
      if (!dialerSet.has(expectedDialer)) {
        throw new Error(
          `Expected dialer ${expectedDialer} not found in ${dialers.join(', ')}`
        );
      }
    }

    // Check that dialers are distinct
    if (dialers[0] === dialers[1]) {
      throw new Error(`Dialers are not distinct: ${dialers[0]}`);
    }
  }

  /**
   * Create state with player on storm
   */
  static createPlayerOnStormState(
    faction: Faction,
    stormSector: number,
    otherFactions: Faction[]
  ): GameState {
    const allFactions = [faction, ...otherFactions];
    const builder = StormTestStateBuilder
      .forTurn2(allFactions, stormSector)
      .withPlayerPosition(faction, stormSector);

    // Place other factions at different positions
    for (let i = 0; i < otherFactions.length; i++) {
      builder.withPlayerPosition(otherFactions[i]!, (stormSector + i + 1) % 18);
    }

    return builder.build();
  }

  /**
   * Validate dial response processing
   */
  static validateDialProcessing(
    dials: Map<Faction, number>,
    expectedMovement: number
  ): void {
    let total = 0;
    for (const value of dials.values()) {
      total += value;
    }

    if (total !== expectedMovement) {
      throw new Error(
        `Expected total movement ${expectedMovement}, but got ${total}`
      );
    }
  }
}

