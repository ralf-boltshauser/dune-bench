/**
 * Test Fixtures for Spice Blow Phase
 * 
 * Reusable test data - single source of truth for all test configurations
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { buildTestState, type TestStateConfig } from './test-state-builder';

// =============================================================================
// CARD DEFINITIONS
// =============================================================================

export const TEST_CARDS = {
  // Territory Cards
  TERRITORY_CIELAGO_NORTH: 'spice_cielago_north',
  TERRITORY_CIELAGO_SOUTH: 'spice_cielago_south',
  TERRITORY_SOUTH_MESA: 'spice_south_mesa',
  TERRITORY_RED_CHASM: 'spice_red_chasm',
  TERRITORY_SIHAYA_RIDGE: 'spice_sihaya_ridge',
  TERRITORY_HOLE_IN_THE_ROCK: 'spice_hole_in_the_rock',
  TERRITORY_BASIN: 'spice_basin',
  TERRITORY_OLD_GAP: 'spice_old_gap',
  TERRITORY_BROKEN_LAND: 'spice_broken_land',
  TERRITORY_HAGGA_BASIN: 'spice_hagga_basin',
  TERRITORY_ROCK_OUTCROPPINGS: 'spice_rock_outcroppings',
  TERRITORY_WIND_PASS: 'spice_wind_pass',
  TERRITORY_THE_MINOR_ERG: 'spice_the_minor_erg',
  TERRITORY_HABBANYA_ERG: 'spice_habbanya_erg',
  TERRITORY_THE_GREAT_FLAT: 'spice_the_great_flat',
  TERRITORY_FUNERAL_PLAIN: 'spice_funeral_plain',
  
  // Shai-Hulud Cards
  SHAI_HULUD_1: 'shai_hulud_1',
  SHAI_HULUD_2: 'shai_hulud_2',
  SHAI_HULUD_3: 'shai_hulud_3',
  SHAI_HULUD_4: 'shai_hulud_4',
  SHAI_HULUD_5: 'shai_hulud_5',
  SHAI_HULUD_6: 'shai_hulud_6',
} as const;

// =============================================================================
// TERRITORY CONFIGURATIONS
// =============================================================================

export const TEST_TERRITORIES = {
  CIELAGO_NORTH: { id: TerritoryId.CIELAGO_NORTH, sectors: [0, 1, 2] },
  CIELAGO_SOUTH: { id: TerritoryId.CIELAGO_SOUTH, sector: 1 },
  SOUTH_MESA: { id: TerritoryId.SOUTH_MESA, sector: 2 },
  RED_CHASM: { id: TerritoryId.RED_CHASM, sector: 3 },
  SIHAYA_RIDGE: { id: TerritoryId.SIHAYA_RIDGE, sector: 4 },
  HOLE_IN_THE_ROCK: { id: TerritoryId.HOLE_IN_THE_ROCK, sector: 8 },
  BASIN: { id: TerritoryId.BASIN, sector: 9 },
  OLD_GAP: { id: TerritoryId.OLD_GAP, sector: 8 },
  BROKEN_LAND: { id: TerritoryId.BROKEN_LAND, sector: 7 },
  HAGGA_BASIN: { id: TerritoryId.HAGGA_BASIN, sector: 11 },
  ROCK_OUTCROPPINGS: { id: TerritoryId.ROCK_OUTCROPPINGS, sector: 5 },
  WIND_PASS: { id: TerritoryId.WIND_PASS, sector: 13 },
  THE_MINOR_ERG: { id: TerritoryId.THE_MINOR_ERG, sector: 12 },
  HABBANYA_ERG: { id: TerritoryId.HABBANYA_ERG, sector: 14 },
  THE_GREAT_FLAT: { id: TerritoryId.THE_GREAT_FLAT, sector: 14 },
  FUNERAL_PLAIN: { id: TerritoryId.FUNERAL_PLAIN, sector: 1 },
} as const;

// =============================================================================
// DECK PRESETS
// =============================================================================

export const DECK_PRESETS = {
  // Single cards
  SINGLE_TERRITORY: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
  SINGLE_WORM: [TEST_CARDS.SHAI_HULUD_1],
  
  // Simple sequences
  TERRITORY_THEN_WORM: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH, TEST_CARDS.SHAI_HULUD_1],
  WORM_THEN_TERRITORY: [TEST_CARDS.SHAI_HULUD_1, TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
  
  // Multiple worms
  MULTIPLE_WORMS: [
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.SHAI_HULUD_2,
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
  ],
  THREE_WORMS: [
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.SHAI_HULUD_2,
    TEST_CARDS.SHAI_HULUD_3,
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
  ],
  
  // Complex sequences
  WORM_TERRITORY_WORM_TERRITORY: [
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    TEST_CARDS.SHAI_HULUD_2,
    TEST_CARDS.TERRITORY_SOUTH_MESA,
  ],
  
  // Empty deck
  EMPTY: [],
} as const;

// =============================================================================
// DECK COMBINATIONS (Two-Pile System)
// =============================================================================

export const DECK_COMBINATIONS = {
  // Two-pile system tests
  DECK_A_TERRITORY_DECK_B_WORM: {
    deckA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
    deckB: [TEST_CARDS.SHAI_HULUD_1],
  },
  DECK_A_WORM_DECK_B_TERRITORY: {
    deckA: [TEST_CARDS.SHAI_HULUD_1],
    deckB: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
  },
  DECK_A_TERRITORY_DECK_B_TERRITORY: {
    deckA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
    deckB: [TEST_CARDS.TERRITORY_SOUTH_MESA],
  },
  DECK_A_WORM_DECK_B_WORM: {
    deckA: [TEST_CARDS.SHAI_HULUD_1],
    deckB: [TEST_CARDS.SHAI_HULUD_2],
  },
} as const;

// =============================================================================
// DISCARD PILE PRESETS (For Topmost Territory Card Tests)
// =============================================================================

export const DISCARD_PRESETS = {
  // Topmost Territory Card tests
  MULTIPLE_TERRITORY_CARDS: [
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    TEST_CARDS.TERRITORY_SOUTH_MESA,
    TEST_CARDS.TERRITORY_RED_CHASM,
  ],
  MIXED_WORMS_AND_TERRITORIES: [
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.TERRITORY_SOUTH_MESA,
    TEST_CARDS.SHAI_HULUD_2,
    TEST_CARDS.TERRITORY_RED_CHASM,
  ],
  TERRITORY_WORM_TERRITORY: [
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.TERRITORY_SOUTH_MESA,
  ],
  WORM_TERRITORY_WORM_TERRITORY: [
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    TEST_CARDS.SHAI_HULUD_2,
    TEST_CARDS.TERRITORY_SOUTH_MESA,
  ],
  // Empty discard
  EMPTY: [],
} as const;

// =============================================================================
// CONTEXT PRESETS
// =============================================================================

import { createInitialContext } from '../../../phases/handlers/spice-blow/context';
import { type SpiceBlowContext } from '../../../phases/handlers/spice-blow/types';

export const CONTEXT_PRESETS: Record<string, SpiceBlowContext> = {
  INITIAL: createInitialContext(),
  CARD_A_REVEALED: {
    ...createInitialContext(),
    cardARevealed: true,
  },
  CARD_B_REVEALED: {
    ...createInitialContext(),
    cardBRevealed: true,
  },
  BOTH_CARDS_REVEALED: {
    ...createInitialContext(),
    cardARevealed: true,
    cardBRevealed: true,
  },
  NEXUS_TRIGGERED: {
    ...createInitialContext(),
    nexusTriggered: true,
  },
  NEXUS_RESOLVED: {
    ...createInitialContext(),
    nexusTriggered: true,
    nexusResolved: true,
  },
  WORM_COUNT_1: {
    ...createInitialContext(),
    shaiHuludCount: 1,
  },
  WORM_COUNT_2: {
    ...createInitialContext(),
    shaiHuludCount: 2,
  },
} as const;

// =============================================================================
// STATE PRESETS
// =============================================================================

export const STATE_PRESETS = {
  TURN_1_BASIC: {
    turn: 1,
    advancedRules: false,
  },
  TURN_2_BASIC: {
    turn: 2,
    advancedRules: false,
  },
  TURN_2_ADVANCED: {
    turn: 2,
    advancedRules: true,
  },
  TURN_3_BASIC: {
    turn: 3,
    advancedRules: false,
  },
  STORM_AT_SECTOR_0: {
    stormSector: 0,
  },
  STORM_AT_SECTOR_3: {
    stormSector: 3,
  },
  STORM_AT_SECTOR_5: {
    stormSector: 5,
  },
} as const;

// =============================================================================
// FACTION PRESETS
// =============================================================================

export const FACTION_PRESETS = {
  TWO_FACTIONS: [Faction.ATREIDES, Faction.HARKONNEN],
  THREE_FACTIONS: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
  WITH_FREMEN: [Faction.ATREIDES, Faction.FREMEN],
  ALL_FACTIONS: [
    Faction.ATREIDES,
    Faction.BENE_GESSERIT,
    Faction.FREMEN,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.SPACING_GUILD,
  ],
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a quick test state with common configuration
 */
export function createQuickTestState(
  overrides: Partial<TestStateConfig> = {}
): GameState {
  return buildTestState({
    factions: FACTION_PRESETS.TWO_FACTIONS,
    turn: 2,
    advancedRules: false,
    stormSector: 5,
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
    ...overrides,
  });
}

/**
 * Get a Shai-Hulud card ID by index
 */
export function getWormCard(index: number = 0): string {
  const worms = [
    TEST_CARDS.SHAI_HULUD_1,
    TEST_CARDS.SHAI_HULUD_2,
    TEST_CARDS.SHAI_HULUD_3,
    TEST_CARDS.SHAI_HULUD_4,
    TEST_CARDS.SHAI_HULUD_5,
    TEST_CARDS.SHAI_HULUD_6,
  ];
  return worms[index % worms.length];
}

/**
 * Get a territory card ID by territory
 */
export function getTerritoryCard(territoryId: TerritoryId): string | undefined {
  const mapping: Record<TerritoryId, string> = {
    [TerritoryId.CIELAGO_NORTH]: TEST_CARDS.TERRITORY_CIELAGO_NORTH,
    [TerritoryId.CIELAGO_SOUTH]: TEST_CARDS.TERRITORY_CIELAGO_SOUTH,
    [TerritoryId.SOUTH_MESA]: TEST_CARDS.TERRITORY_SOUTH_MESA,
    [TerritoryId.RED_CHASM]: TEST_CARDS.TERRITORY_RED_CHASM,
    [TerritoryId.SIHAYA_RIDGE]: TEST_CARDS.TERRITORY_SIHAYA_RIDGE,
    [TerritoryId.HOLE_IN_THE_ROCK]: TEST_CARDS.TERRITORY_HOLE_IN_THE_ROCK,
    [TerritoryId.BASIN]: TEST_CARDS.TERRITORY_BASIN,
    [TerritoryId.OLD_GAP]: TEST_CARDS.TERRITORY_OLD_GAP,
    [TerritoryId.BROKEN_LAND]: TEST_CARDS.TERRITORY_BROKEN_LAND,
    [TerritoryId.HAGGA_BASIN]: TEST_CARDS.TERRITORY_HAGGA_BASIN,
    [TerritoryId.ROCK_OUTCROPPINGS]: TEST_CARDS.TERRITORY_ROCK_OUTCROPPINGS,
    [TerritoryId.WIND_PASS]: TEST_CARDS.TERRITORY_WIND_PASS,
    [TerritoryId.THE_MINOR_ERG]: TEST_CARDS.TERRITORY_THE_MINOR_ERG,
    [TerritoryId.HABBANYA_ERG]: TEST_CARDS.TERRITORY_HABBANYA_ERG,
    [TerritoryId.THE_GREAT_FLAT]: TEST_CARDS.TERRITORY_THE_GREAT_FLAT,
    [TerritoryId.FUNERAL_PLAIN]: TEST_CARDS.TERRITORY_FUNERAL_PLAIN,
  };
  return mapping[territoryId];
}

