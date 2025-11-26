/**
 * Faction configuration data.
 * Starting resources, force counts, revival limits, and other faction-specific constants.
 * Based on GF9 Dune rules section 2.XX.
 */

import { Faction, TerritoryId } from '../types';

// =============================================================================
// FACTION CONFIGURATION
// =============================================================================

export interface FactionConfig {
  factionId: Faction;
  // Starting resources (rule 0.12)
  startingSpice: number;
  // Force counts
  totalForces: number;
  eliteForces: number; // Sardaukar (Emperor) or Fedaykin (Fremen)
  // Starting positions (rule 0.13)
  startingForces: StartingForce[];
  // Revival (rule 1.05)
  freeRevival: number;
  // Hand size (rule 1.04.02)
  maxHandSize: number;
  // Starting treachery cards (rule 0.14)
  startingTreacheryCards: number;
  // Traitor cards kept (rule 0.11)
  traitorCardsKept: number;
}

export interface StartingForce {
  territoryId: TerritoryId | 'reserves' | 'reserves_local'; // reserves_local for Fremen
  count: number;
  isElite?: boolean;
}

// =============================================================================
// ATREIDES CONFIGURATION
// =============================================================================

export const ATREIDES_CONFIG: FactionConfig = {
  factionId: Faction.ATREIDES,
  startingSpice: 10,
  totalForces: 20,
  eliteForces: 0,
  startingForces: [
    { territoryId: TerritoryId.ARRAKEEN, count: 10 },
    { territoryId: 'reserves', count: 10 },
  ],
  freeRevival: 2,
  maxHandSize: 4,
  startingTreacheryCards: 1,
  traitorCardsKept: 1,
};

// =============================================================================
// BENE GESSERIT CONFIGURATION
// =============================================================================

export const BENE_GESSERIT_CONFIG: FactionConfig = {
  factionId: Faction.BENE_GESSERIT,
  startingSpice: 5,
  totalForces: 20,
  eliteForces: 0,
  startingForces: [
    { territoryId: TerritoryId.POLAR_SINK, count: 1 },
    { territoryId: 'reserves', count: 19 },
  ],
  freeRevival: 1,
  maxHandSize: 4,
  startingTreacheryCards: 1,
  traitorCardsKept: 1,
};

// =============================================================================
// EMPEROR CONFIGURATION
// =============================================================================

export const EMPEROR_CONFIG: FactionConfig = {
  factionId: Faction.EMPEROR,
  startingSpice: 10,
  totalForces: 20,
  eliteForces: 5, // 5 Sardaukar
  startingForces: [{ territoryId: 'reserves', count: 20 }],
  freeRevival: 1,
  maxHandSize: 4,
  startingTreacheryCards: 1,
  traitorCardsKept: 1,
};

// =============================================================================
// FREMEN CONFIGURATION
// =============================================================================

export const FREMEN_CONFIG: FactionConfig = {
  factionId: Faction.FREMEN,
  startingSpice: 3,
  totalForces: 20,
  eliteForces: 3, // 3 Fedaykin
  startingForces: [
    // Per rule 2.04.02: "Place 10 Forces distributed as you like on Sietch Tabr,
    // False Wall South, and False Wall West; and 10 Forces in reserves."
    // Distribution is handled in setup phase by agent choice.
    // All 20 start in reserves, then 10 are distributed by the agent during setup.
    { territoryId: 'reserves_local', count: 20 }, // Fremen reserves are local, not off-planet
  ],
  freeRevival: 3,
  maxHandSize: 4,
  startingTreacheryCards: 1,
  traitorCardsKept: 1,
};

// =============================================================================
// HARKONNEN CONFIGURATION
// =============================================================================

export const HARKONNEN_CONFIG: FactionConfig = {
  factionId: Faction.HARKONNEN,
  startingSpice: 10,
  totalForces: 20,
  eliteForces: 0,
  startingForces: [
    { territoryId: TerritoryId.CARTHAG, count: 10 },
    { territoryId: 'reserves', count: 10 },
  ],
  freeRevival: 2,
  maxHandSize: 8, // Harkonnen can hold 8 cards
  startingTreacheryCards: 2, // Harkonnen draws 2 starting cards
  traitorCardsKept: 4, // Harkonnen keeps all 4 traitor cards
};

// =============================================================================
// SPACING GUILD CONFIGURATION
// =============================================================================

export const SPACING_GUILD_CONFIG: FactionConfig = {
  factionId: Faction.SPACING_GUILD,
  startingSpice: 5,
  totalForces: 20,
  eliteForces: 0,
  startingForces: [
    { territoryId: TerritoryId.TUEKS_SIETCH, count: 5 },
    { territoryId: 'reserves', count: 15 },
  ],
  freeRevival: 1,
  maxHandSize: 4,
  startingTreacheryCards: 1,
  traitorCardsKept: 1,
};

// =============================================================================
// ALL FACTION CONFIGS
// =============================================================================

export const FACTION_CONFIGS: Record<Faction, FactionConfig> = {
  [Faction.ATREIDES]: ATREIDES_CONFIG,
  [Faction.BENE_GESSERIT]: BENE_GESSERIT_CONFIG,
  [Faction.EMPEROR]: EMPEROR_CONFIG,
  [Faction.FREMEN]: FREMEN_CONFIG,
  [Faction.HARKONNEN]: HARKONNEN_CONFIG,
  [Faction.SPACING_GUILD]: SPACING_GUILD_CONFIG,
};

// Get faction config
export function getFactionConfig(faction: Faction): FactionConfig {
  return FACTION_CONFIGS[faction];
}

// =============================================================================
// GAME CONSTANTS
// =============================================================================

export const GAME_CONSTANTS = {
  // Storm
  TOTAL_SECTORS: 18,
  MAX_STORM_DIAL: 3,
  FIRST_STORM_MAX_DIAL: 20,

  // Combat
  SPICE_PER_FORCE: 2, // Spice collection rate
  SPICE_PER_FORCE_WITH_CITY: 3, // Collection rate with Arrakeen/Carthag

  // Revival
  MAX_FORCE_REVIVAL_PER_TURN: 3,
  COST_PER_FORCE_REVIVAL: 2,
  PAID_REVIVAL_COST: 2, // Same as COST_PER_FORCE_REVIVAL

  // Shipment
  COST_SHIP_TO_STRONGHOLD: 1,
  COST_SHIP_TO_TERRITORY: 2,
  SHIPMENT_COST: 1, // Base shipment cost per force

  // Victory
  STRONGHOLDS_TO_WIN_SOLO: 3,
  STRONGHOLDS_TO_WIN_ALLIED: 4,
  STRONGHOLDS_FOR_WIN: 3, // Alias for solo
  ALLIED_STRONGHOLDS_FOR_WIN: 4, // Alias for allied

  // CHOAM Charity
  CHOAM_CHARITY_THRESHOLD: 1, // Spice threshold for charity eligibility
  CHOAM_CHARITY_AMOUNT: 2, // Amount received from charity

  // Spice Blow
  WORMS_TO_DESTROY_SHIELD_WALL: 3, // Variant rule

  // Turns
  DEFAULT_MAX_TURNS: 10,

  // Advanced rules
  ADVANCED_SPICE_DIAL_COST: 1, // Cost per force for full strength in advanced

  // Fremen setup
  FREMEN_STARTING_DISTRIBUTION_TOTAL: 10, // Forces Fremen distributes at setup

  // Bidding
  CARDS_FOR_AUCTION: 9, // Cards drawn for auction each turn (rule 1.04.01)

  // Traitors
  TRAITOR_CARDS_DEALT: 4, // Traitor cards dealt to each player
} as const;

// Helper function to get faction max hand size
export function getFactionMaxHandSize(faction: Faction): number {
  return FACTION_CONFIGS[faction].maxHandSize;
}
