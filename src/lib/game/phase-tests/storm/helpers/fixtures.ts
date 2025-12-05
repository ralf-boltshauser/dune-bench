/**
 * Pre-built test fixtures for common scenarios
 */

import { Faction, TerritoryId, Phase } from '../../../types';
import { getFactionState } from '../../../state';
import { StormTestStateBuilder } from './test-state-builder';
import type { GameState } from '../../../types';

export class StormTestFixtures {
  /**
   * Standard 2-faction setup for Turn 1
   */
  static turn1TwoFactions(): {
    state: GameState;
    expectedDialers: [Faction, Faction];
  } {
    const state = StormTestStateBuilder
      .forTurn1([Faction.ATREIDES, Faction.HARKONNEN])
      .withPlayerPosition(Faction.ATREIDES, 1)
      .withPlayerPosition(Faction.HARKONNEN, 17)
      .build();

    return {
      state,
      expectedDialers: [Faction.ATREIDES, Faction.HARKONNEN],
    };
  }

  /**
   * Standard 2-faction setup for Turn 2+
   */
  static turn2TwoFactions(stormSector: number): {
    state: GameState;
    expectedDialers: [Faction, Faction];
  } {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], stormSector)
      .withPlayerPosition(Faction.ATREIDES, 2)
      .withPlayerPosition(Faction.HARKONNEN, 4)
      .build();

    return {
      state,
      expectedDialers: [Faction.ATREIDES, Faction.HARKONNEN],
    };
  }

  /**
   * Fremen with storm deck (Turn 2+)
   */
  static fremenWithStormDeck(storedCard: string): {
    state: GameState;
    expectedMovement: number;
  } {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withStormSector(10)
      .withFremenStormCard(storedCard)
      .build();

    return {
      state,
      expectedMovement: parseInt(storedCard, 10),
    };
  }

  /**
   * Forces in storm path
   */
  static forcesInStormPath(
    stormSector: number,
    movement: number,
    territory: TerritoryId,
    factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]
  ): {
    state: GameState;
    affectedSectors: number[];
    expectedDestructions: Array<{ faction: Faction; count: number }>;
  } {
    // Calculate affected sectors
    const affectedSectors: number[] = [];
    for (let i = 0; i <= movement; i++) {
      affectedSectors.push((stormSector + i) % 18);
    }

    const placements = factions.map(faction => ({
      faction,
      territory,
      sector: affectedSectors[1] || affectedSectors[0], // Place in first affected sector
      regular: 5,
    }));

    const state = StormTestStateBuilder
      .forTurn2(factions, stormSector)
      .withMultipleForces(placements)
      .build();

    const expectedDestructions = factions.map(faction => ({
      faction,
      count: faction === Faction.FREMEN ? 3 : 5, // Fremen lose half (rounded up)
    }));

    return {
      state,
      affectedSectors,
      expectedDestructions,
    };
  }

  /**
   * Spice in storm path
   */
  static spiceInStormPath(
    stormSector: number,
    movement: number,
    territory: TerritoryId
  ): {
    state: GameState;
    affectedSectors: number[];
    expectedDestructions: Array<{ territory: TerritoryId; amount: number }>;
  } {
    // Calculate affected sectors
    const affectedSectors: number[] = [];
    for (let i = 0; i <= movement; i++) {
      affectedSectors.push((stormSector + i) % 18);
    }

    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], stormSector)
      .withTerritorySpice({
        territory,
        sector: affectedSectors[1] || affectedSectors[0],
        amount: 5,
      })
      .build();

    return {
      state,
      affectedSectors,
      expectedDestructions: [{
        territory,
        amount: 5,
      }],
    };
  }

  /**
   * Player on storm sector
   */
  static playerOnStormSector(
    faction: Faction,
    stormSector: number,
    otherFactions: Faction[] = [Faction.HARKONNEN, Faction.BENE_GESSERIT]
  ): {
    state: GameState;
    expectedDialers: [Faction, Faction];
  } {
    const allFactions = [faction, ...otherFactions];
    const state = StormTestStateBuilder
      .forTurn2(allFactions, stormSector)
      .withPlayerPosition(faction, stormSector)
      .withPlayerPosition(otherFactions[0]!, (stormSector + 1) % 18)
      .withPlayerPosition(otherFactions[1]!, (stormSector + 2) % 18)
      .build();

    // When player is on storm, they are dialer1, and first in storm order is dialer2
    // For simplicity, we'll use the first other faction as expected dialer2
    return {
      state,
      expectedDialers: [faction, otherFactions[0]!],
    };
  }

  /**
   * Family Atomics eligible
   */
  static familyAtomicsEligible(
    faction: Faction,
    hasForcesOnWall: boolean
  ): {
    state: GameState;
    canPlay: boolean;
  } {
    const forces = hasForcesOnWall
      ? [{
          faction,
          territory: TerritoryId.SHIELD_WALL,
          sector: 7,
          regular: 5,
        }]
      : [{
          faction,
          territory: TerritoryId.CIELAGO_NORTH, // Adjacent to Shield Wall
          sector: 6,
          regular: 5,
        }];

    const state = StormTestStateBuilder
      .forTurn2([faction, Faction.HARKONNEN], 5) // Storm not between
      .withMultipleForces(forces)
      .withCard(faction, 'family_atomics')
      .build();

    return {
      state,
      canPlay: true,
    };
  }

  /**
   * Weather Control available
   */
  static weatherControlAvailable(
    faction: Faction
  ): {
    state: GameState;
    hasCard: boolean;
  } {
    const state = StormTestStateBuilder
      .forTurn2([faction, Faction.HARKONNEN], 10)
      .withCard(faction, 'weather_control')
      .build();

    return {
      state,
      hasCard: true,
    };
  }
}

