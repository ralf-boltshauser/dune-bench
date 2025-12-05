/**
 * Test Fixtures for Bidding Phase
 * 
 * One source of truth for test data.
 */

import { Faction } from "../../../types";

// =============================================================================
// CARD FIXTURES
// =============================================================================

export const TREACHERY_CARDS = {
  KARAMA: "karama_1",
  WORTHLESS: ["baliset", "jubba_cloak", "kulon", "la_la_la", "trip_to_gamont"],
  WEAPON: ["lasgun", "maula_pistol", "crysknife"],
  DEFENSE: ["shield", "snooper"],
  SPECIAL: ["poison_tooth", "thumper"],
} as const;

// =============================================================================
// FACTION PRESETS
// =============================================================================

export const FACTION_PRESETS = {
  ATREIDES: { spice: 10, handSize: 0, maxHand: 4 },
  HARKONNEN: { spice: 10, handSize: 0, maxHand: 8 },
  EMPEROR: { spice: 10, handSize: 0, maxHand: 4 },
  FREMEN: { spice: 10, handSize: 0, maxHand: 4 },
  BENE_GESSERIT: { spice: 10, handSize: 0, maxHand: 4 },
  SPACING_GUILD: { spice: 10, handSize: 0, maxHand: 4 },
} as const;

// =============================================================================
// SCENARIO PRESETS
// =============================================================================

export const SCENARIO_PRESETS = {
  BASIC_3_FACTIONS: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  ALL_6_FACTIONS: [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.BENE_GESSERIT,
    Faction.SPACING_GUILD,
  ],
  WITH_EMPEROR: [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
  ],
  WITH_ATREIDES: [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
  ],
  WITH_HARKONNEN: [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
  ],
} as const;

// =============================================================================
// HAND SIZE PRESETS
// =============================================================================

export const HAND_SIZE_PRESETS = {
  EMPTY: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  FULL: 4, // For most factions
  HARKONNEN_FULL: 8,
  HARKONNEN_HIGH: 7,
  HARKONNEN_MEDIUM: 4,
  HARKONNEN_LOW: 2,
} as const;

// =============================================================================
// SPICE PRESETS
// =============================================================================

export const SPICE_PRESETS = {
  DEFAULT: 10,
  LOW: 1,
  MEDIUM: 5,
  HIGH: 15,
  VERY_HIGH: 25,
  ZERO: 0,
} as const;

// =============================================================================
// BIDDING PRESETS
// =============================================================================

export const BIDDING_PRESETS = {
  OPENING_BID: 1,
  MINIMUM_INCREMENT: 1,
  TYPICAL_BID: 5,
  HIGH_BID: 10,
  VERY_HIGH_BID: 20,
} as const;

