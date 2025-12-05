/**
 * State-specific assertion utilities
 */

import { GameState, Faction, TerritoryId } from '../../../types';
import { getFactionState } from '../../../state';

export class StateAssertions {
  /**
   * Assert storm sector
   */
  static assertStormSector(
    state: GameState,
    expectedSector: number
  ): void {
    if (state.stormSector !== expectedSector) {
      throw new Error(
        `Expected storm sector ${expectedSector}, but got ${state.stormSector}`
      );
    }
  }

  /**
   * Assert player position
   */
  static assertPlayerPosition(
    state: GameState,
    faction: Faction,
    expectedSector: number
  ): void {
    const actualSector = state.playerPositions.get(faction);
    if (actualSector !== expectedSector) {
      throw new Error(
        `Expected ${faction} at sector ${expectedSector}, but got ${actualSector}`
      );
    }
  }

  /**
   * Assert forces in territory
   */
  static assertForcesInTerritory(
    state: GameState,
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    expectedCount: number
  ): void {
    const factionState = getFactionState(state, faction);
    const stack = factionState.forces.onBoard.find(
      f => f.territoryId === territory && f.sector === sector
    );

    const actualCount = stack
      ? (stack.forces.regular || 0) + (stack.forces.elite || 0)
      : 0;

    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${faction} to have ${expectedCount} forces in ${territory} sector ${sector}, but got ${actualCount}`
      );
    }
  }

  /**
   * Assert spice in territory
   */
  static assertSpiceInTerritory(
    state: GameState,
    territory: TerritoryId,
    sector: number,
    expectedAmount: number
  ): void {
    const spice = state.spiceOnBoard.find(
      s => s.territoryId === territory && s.sector === sector
    );

    const actualAmount = spice ? spice.amount : 0;

    if (actualAmount !== expectedAmount) {
      throw new Error(
        `Expected ${expectedAmount} spice in ${territory} sector ${sector}, but got ${actualAmount}`
      );
    }
  }

  /**
   * Assert card in hand
   */
  static assertCardInHand(
    state: GameState,
    faction: Faction,
    cardId: string,
    shouldExist: boolean = true
  ): void {
    const factionState = getFactionState(state, faction);
    const hasCard = factionState.hand.some(card => {
      // Check if card definition ID matches
      return card.definitionId === cardId || card.definitionId.includes(cardId);
    });

    if (shouldExist && !hasCard) {
      throw new Error(
        `Expected ${faction} to have card ${cardId} in hand, but it does not`
      );
    }
    if (!shouldExist && hasCard) {
      throw new Error(
        `Expected ${faction} to not have card ${cardId} in hand, but it does`
      );
    }
  }

  /**
   * Assert Fremen storm card
   */
  static assertFremenStormCard(
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

  /**
   * Assert storm deck size
   */
  static assertStormDeckSize(
    state: GameState,
    expectedSize: number
  ): void {
    const actualSize = state.stormDeck.length;
    if (actualSize !== expectedSize) {
      throw new Error(
        `Expected storm deck size ${expectedSize}, but got ${actualSize}`
      );
    }
  }

  /**
   * Assert shield wall destroyed
   */
  static assertShieldWallDestroyed(
    state: GameState,
    expected: boolean
  ): void {
    if (state.shieldWallDestroyed !== expected) {
      throw new Error(
        `Expected shield wall destroyed to be ${expected}, but got ${state.shieldWallDestroyed}`
      );
    }
  }

  /**
   * Assert forces in tanks
   */
  static assertForcesInTanks(
    state: GameState,
    faction: Faction,
    expectedCount: number
  ): void {
    const factionState = getFactionState(state, faction);
    const actualCount =
      (factionState.forces.tanks.regular || 0) +
      (factionState.forces.tanks.elite || 0);

    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${faction} to have ${expectedCount} forces in tanks, but got ${actualCount}`
      );
    }
  }
}

