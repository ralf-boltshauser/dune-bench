/**
 * Test fixtures and constants for movement rules tests.
 * Single source of truth for common test data.
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '../../../types';

/**
 * Common territory configurations for testing
 */
export const TestTerritories = {
  // Strongholds
  ARRAKEEN: TerritoryId.ARRAKEEN,
  CARTHAG: TerritoryId.CARTHAG,
  TUEKS_SIETCH: TerritoryId.TUEKS_SIETCH,
  SIETCH_TABR: TerritoryId.SIETCH_TABR,
  HABBANYA_SIETCH: TerritoryId.HABBANYA_SIETCH,

  // Non-strongholds
  GREAT_FLAT: TerritoryId.THE_GREAT_FLAT,
  SHIELD_WALL: TerritoryId.SHIELD_WALL,
  PASTY_MESA: TerritoryId.PASTY_MESA,
  IMPERIAL_BASIN: TerritoryId.IMPERIAL_BASIN,
  POLAR_SINK: TerritoryId.POLAR_SINK,
  PLASTIC_BASIN: TerritoryId.PLASTIC_BASIN,

  /**
   * Get first sector for a territory
   */
  getSector: (territory: TerritoryId): number => {
    const def = TERRITORY_DEFINITIONS[territory];
    return def?.sectors[0] ?? 0;
  },
};

/**
 * Common force counts for testing
 */
export const TestForceCounts = {
  SMALL: 3,
  MEDIUM: 5,
  LARGE: 10,
  VERY_LARGE: 20,
};

/**
 * Common spice amounts for testing
 */
export const TestSpiceAmounts = {
  NONE: 0,
  LOW: 5,
  MEDIUM: 10,
  HIGH: 20,
  VERY_HIGH: 50,
};

/**
 * Common storm sectors for testing
 */
export const TestStormSectors = {
  NONE: 0,
  ARRAKEEN: 9,
  CARTHAG: 11,
  SHIELD_WALL: 8,
  GREAT_FLAT: 0,
};

/**
 * Preset faction configurations
 */
export const TestFactions = {
  // Factions that start with ornithopter access
  WITH_ORNITHOPTERS: [Faction.ATREIDES, Faction.HARKONNEN] as const,
  
  // Factions without ornithopter access
  WITHOUT_ORNITHOPTERS: [
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.BENE_GESSERIT,
    Faction.SPACING_GUILD,
  ] as const,

  // All factions
  ALL: [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.BENE_GESSERIT,
    Faction.SPACING_GUILD,
  ] as const,
};

/**
 * Territory pairs for testing pathfinding and distance
 */
export const TestTerritoryPairs = {
  // Adjacent territories (distance 1)
  ADJACENT: [
    [TerritoryId.ARRAKEEN, TerritoryId.SHIELD_WALL],
    [TerritoryId.CARTHAG, TerritoryId.SHIELD_WALL],
    [TerritoryId.SHIELD_WALL, TerritoryId.PASTY_MESA],
    [TerritoryId.PASTY_MESA, TerritoryId.IMPERIAL_BASIN],
    [TerritoryId.TUEKS_SIETCH, TerritoryId.PASTY_MESA],
  ] as Array<[TerritoryId, TerritoryId]>,

  // Two-distance territories (for Fremen or ornithopter testing)
  TWO_DISTANCE: [
    [TerritoryId.TUEKS_SIETCH, TerritoryId.ARRAKEEN],
    [TerritoryId.ARRAKEEN, TerritoryId.PASTY_MESA],
    [TerritoryId.CARTHAG, TerritoryId.PASTY_MESA],
  ] as Array<[TerritoryId, TerritoryId]>,

  // Three-distance territories (for ornithopter testing)
  THREE_DISTANCE: [
    [TerritoryId.TUEKS_SIETCH, TerritoryId.IMPERIAL_BASIN],
    [TerritoryId.ARRAKEEN, TerritoryId.IMPERIAL_BASIN],
    [TerritoryId.CARTHAG, TerritoryId.IMPERIAL_BASIN],
  ] as Array<[TerritoryId, TerritoryId]>,
};

/**
 * Storm configuration helpers
 */
export const TestStormConfigs = {
  /**
   * Create partial storm config (some sectors safe)
   */
  PARTIAL: (territory: TerritoryId, safeSector: number, stormSector: number) => ({
    territory,
    safeSector,
    stormSector,
  }),

  /**
   * Create full storm config (all sectors in storm)
   */
  FULL: (territory: TerritoryId, stormSector: number) => ({
    territory,
    stormSector,
    allSectorsInStorm: true,
  }),
};

/**
 * Bene Gesserit configuration helpers
 */
export const TestBGConfigs = {
  /**
   * Advisors only configuration
   */
  ADVISORS_ONLY: (territory: TerritoryId, sector: number, count: number) => ({
    territory,
    sector,
    advisors: count,
    fighters: 0,
  }),

  /**
   * Fighters only configuration
   */
  FIGHTERS_ONLY: (territory: TerritoryId, sector: number, count: number) => ({
    territory,
    sector,
    advisors: 0,
    fighters: count,
  }),

  /**
   * Mixed advisors and fighters
   */
  MIXED: (
    territory: TerritoryId,
    sector: number,
    advisors: number,
    fighters: number
  ) => ({
    territory,
    sector,
    advisors,
    fighters,
  }),
};

