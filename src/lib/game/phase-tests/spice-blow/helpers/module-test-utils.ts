/**
 * Module Test Utilities for Spice Blow Phase
 * 
 * Utilities for testing specific modules in isolation
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { buildTestState, type ForcePlacement, type SpicePlacement } from './test-state-builder';
import { TEST_CARDS } from './fixtures';

// =============================================================================
// VALIDATION MODULE UTILITIES
// =============================================================================

export const ValidationTestUtils = {
  /**
   * Create a state with storm at specific sector
   */
  createStormState(
    sector: number,
    territory?: TerritoryId
  ): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      stormSector: sector,
    });
  },

  /**
   * Create a state with protected territory (Fremen forces)
   */
  createProtectedTerritoryState(
    territory: TerritoryId,
    sector: number
  ): GameState {
    return buildTestState({
      factions: [Faction.FREMEN, Faction.ATREIDES],
      turn: 2,
      forces: [
        {
          faction: Faction.FREMEN,
          territory,
          sector,
          regular: 5,
        },
      ],
    });
  },
};

// =============================================================================
// PLACEMENT MODULE UTILITIES
// =============================================================================

export const PlacementTestUtils = {
  /**
   * Create a state for testing spice placement
   */
  createPlacementState(
    territory: TerritoryId,
    sector: number,
    stormSector?: number
  ): GameState {
    const cardId = TEST_CARDS.TERRITORY_CIELAGO_SOUTH; // Default card
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      stormSector: stormSector ?? 5, // Default: not in storm
      spiceDeckA: [cardId],
    });
  },
};

// =============================================================================
// REVEAL MODULE UTILITIES
// =============================================================================

export const RevealTestUtils = {
  /**
   * Create a state for testing card revelation
   */
  createRevealState(
    deckA: string[],
    deckB: string[] = []
  ): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      spiceDeckA: deckA,
      spiceDeckB: deckB,
    });
  },
};

// =============================================================================
// DECK MODULE UTILITIES
// =============================================================================

export const DeckTestUtils = {
  /**
   * Create a state with specific deck configuration
   */
  createDeckState(
    deckA: string[],
    discardA: string[] = [],
    deckB: string[] = [],
    discardB: string[] = []
  ): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 2,
      spiceDeckA: deckA,
      spiceDiscardA: discardA,
      spiceDeckB: deckB,
      spiceDiscardB: discardB,
    });
  },
};

// =============================================================================
// SHAI-HULUD MODULE UTILITIES
// =============================================================================

export const ShaiHuludTestUtils = {
  /**
   * Create a state with forces in a territory (for devouring tests)
   */
  createWormState(
    location: { territoryId: TerritoryId; sector: number },
    forces: Array<{ faction: Faction; regular: number; elite?: number }>
  ): GameState {
    const forcePlacements: ForcePlacement[] = forces.map((f) => ({
      faction: f.faction,
      territory: location.territoryId,
      sector: location.sector,
      regular: f.regular,
      elite: f.elite,
    }));

    // Add a territory card to discard so worm has something to devour
    return buildTestState({
      factions: forces.map((f) => f.faction),
      turn: 2,
      forces: forcePlacements,
      spiceDiscardA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH], // Topmost territory card
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1], // Worm to reveal
    });
  },

  /**
   * Create a state for Turn 1 worm testing
   */
  createTurnOneWormState(): GameState {
    return buildTestState({
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
      turn: 1,
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1, TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
    });
  },
};

// =============================================================================
// NEXUS MODULE UTILITIES
// =============================================================================

export const NexusTestUtils = {
  /**
   * Create a state for testing Nexus
   */
  createNexusState(
    factions: Faction[],
    alliances: Array<[Faction, Faction]> = []
  ): GameState {
    return buildTestState({
      factions,
      turn: 2, // Nexus only on turn 2+
      alliances,
    });
  },

  /**
   * Create a state with worm that triggers Nexus
   */
  createNexusTriggerState(factions: Faction[]): GameState {
    return buildTestState({
      factions,
      turn: 2,
      spiceDiscardA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH], // Territory card for devour location
      spiceDeckA: [TEST_CARDS.SHAI_HULUD_1, TEST_CARDS.TERRITORY_CIELAGO_SOUTH], // Worm then territory
    });
  },
};

