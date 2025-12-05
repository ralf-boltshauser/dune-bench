/**
 * Test Fixtures for Shipment & Movement Phase
 * 
 * Single source of truth for all test data.
 * No hardcoding - all tests use these presets.
 */

import { Faction, TerritoryId } from '../../../types';

// =============================================================================
// TERRITORY PRESETS
// =============================================================================

export const TEST_TERRITORIES = {
  ARRAKEEN: { id: TerritoryId.ARRAKEEN, sector: 9 },
  CARTHAG: { id: TerritoryId.CARTHAG, sector: 9 },
  IMPERIAL_BASIN: { id: TerritoryId.IMPERIAL_BASIN, sector: 9 },
  BASIN: { id: TerritoryId.BASIN, sector: 9 },
  POLAR_SINK: { id: TerritoryId.POLAR_SINK, sector: 9 },
  GREAT_FLAT: { id: TerritoryId.THE_GREAT_FLAT, sector: 9 },
  TUEKS_SIETCH: { id: TerritoryId.TUEKS_SIETCH, sector: 9 },
  HABANNYA_SIETCH: { id: TerritoryId.HABBANYA_SIETCH, sector: 9 },
  SIETCH_TABR: { id: TerritoryId.SIETCH_TABR, sector: 9 },
  FALSE_WALL_SOUTH: { id: TerritoryId.FALSE_WALL_SOUTH, sector: 9 },
  FALSE_WALL_WEST: { id: TerritoryId.FALSE_WALL_WEST, sector: 9 },
  SHIELD_WALL: { id: TerritoryId.SHIELD_WALL, sector: 9 },
  PASTY_MESA: { id: TerritoryId.PASTY_MESA, sector: 9 },
  ROCK_OUTCROPPING: { id: TerritoryId.ROCK_OUTCROPPING, sector: 9 },
  FUNGUS_PLAIN: { id: TerritoryId.FUNGUS_PLAIN, sector: 9 },
  OLD_GAP: { id: TerritoryId.OLD_GAP, sector: 9 },
  CIELAGO_NORTH: { id: TerritoryId.CIELAGO_NORTH, sector: 9 },
  CIELAGO_SOUTH: { id: TerritoryId.CIELAGO_SOUTH, sector: 9 },
} as const;

// =============================================================================
// FACTION PRESETS
// =============================================================================

export const TEST_FACTIONS = {
  BASIC: [Faction.ATREIDES, Faction.HARKONNEN],
  WITH_GUILD: [Faction.ATREIDES, Faction.HARKONNEN, Faction.SPACING_GUILD],
  WITH_BG: [Faction.ATREIDES, Faction.BENE_GESSERIT],
  WITH_FREMEN: [Faction.ATREIDES, Faction.FREMEN],
  WITH_EMPEROR: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  GUILD_BG: [Faction.SPACING_GUILD, Faction.BENE_GESSERIT],
  GUILD_FREMEN: [Faction.SPACING_GUILD, Faction.FREMEN],
  BG_FREMEN: [Faction.BENE_GESSERIT, Faction.FREMEN],
  FULL: [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.SPACING_GUILD,
    Faction.BENE_GESSERIT,
    Faction.FREMEN,
  ],
} as const;

// =============================================================================
// STORM ORDER PRESETS
// =============================================================================

export const STORM_ORDERS = {
  ATREIDES_FIRST: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  GUILD_FIRST: [Faction.SPACING_GUILD, Faction.ATREIDES, Faction.HARKONNEN],
  BG_FIRST: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
  FREMEN_FIRST: [Faction.FREMEN, Faction.ATREIDES, Faction.HARKONNEN],
} as const;

// =============================================================================
// FORCE PRESETS
// =============================================================================

export const FORCE_PRESETS = {
  SMALL: { regular: 3, elite: 0 },
  MEDIUM: { regular: 5, elite: 0 },
  LARGE: { regular: 10, elite: 0 },
  WITH_ELITE: { regular: 5, elite: 2 },
  HUGE: { regular: 20, elite: 0 },
} as const;

// =============================================================================
// SPICE PRESETS
// =============================================================================

export const SPICE_PRESETS = {
  NONE: 0,
  LOW: 2,
  MEDIUM: 5,
  HIGH: 10,
  RICH: 20,
  VERY_RICH: 50,
} as const;

// =============================================================================
// ALLIANCE PRESETS
// =============================================================================

export const ALLIANCE_PRESETS = {
  ATREIDES_HARKONNEN: [[Faction.ATREIDES, Faction.HARKONNEN]],
  ATREIDES_GUILD: [[Faction.ATREIDES, Faction.SPACING_GUILD]],
  ATREIDES_BG: [[Faction.ATREIDES, Faction.BENE_GESSERIT]],
  HARKONNEN_GUILD: [[Faction.HARKONNEN, Faction.SPACING_GUILD]],
  BG_GUILD: [[Faction.BENE_GESSERIT, Faction.SPACING_GUILD]],
  TRIPLE: [
    [Faction.ATREIDES, Faction.HARKONNEN],
    [Faction.EMPEROR, Faction.SPACING_GUILD],
  ],
} as const;

// =============================================================================
// BG PRESETS
// =============================================================================

export const BG_PRESETS = {
  ADVISORS_ONLY: { advisors: 3, fighters: 0 },
  FIGHTERS_ONLY: { advisors: 0, fighters: 3 },
  MIXED: { advisors: 2, fighters: 1 },
  MANY_ADVISORS: { advisors: 5, fighters: 0 },
  MANY_FIGHTERS: { advisors: 0, fighters: 5 },
} as const;

// =============================================================================
// STORM SECTOR PRESETS
// =============================================================================

export const STORM_PRESETS = {
  SAFE: 1, // Sector not in storm
  IN_STORM: 5, // Sector in storm
} as const;

// =============================================================================
// RESERVE PRESETS
// =============================================================================

export const RESERVE_PRESETS = {
  NONE: 0,
  SMALL: 5,
  MEDIUM: 10,
  LARGE: 20,
} as const;

