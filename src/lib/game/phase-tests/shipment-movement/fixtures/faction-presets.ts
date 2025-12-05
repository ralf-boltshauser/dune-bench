/**
 * Faction-Specific Presets
 * 
 * Reusable presets for faction configurations.
 */

import { Faction } from '../../../types';

export interface FactionPreset {
  startingForces: {
    regular: number;
    elite: number;
  };
  startingSpice: number;
  reserves: {
    regular: number;
    elite: number;
  };
}

export const FACTION_PRESETS: Record<Faction, FactionPreset> = {
  [Faction.ATREIDES]: {
    startingForces: { regular: 10, elite: 5 },
    startingSpice: 10,
    reserves: { regular: 15, elite: 5 },
  },
  [Faction.HARKONNEN]: {
    startingForces: { regular: 10, elite: 5 },
    startingSpice: 10,
    reserves: { regular: 15, elite: 5 },
  },
  [Faction.EMPEROR]: {
    startingForces: { regular: 10, elite: 5 },
    startingSpice: 10,
    reserves: { regular: 15, elite: 5 },
  },
  [Faction.SPACING_GUILD]: {
    startingForces: { regular: 5, elite: 0 },
    startingSpice: 5,
    reserves: { regular: 15, elite: 0 },
  },
  [Faction.BENE_GESSERIT]: {
    startingForces: { regular: 1, elite: 0 }, // 1 in Polar Sink
    startingSpice: 5,
    reserves: { regular: 19, elite: 0 },
  },
  [Faction.FREMEN]: {
    startingForces: { regular: 10, elite: 0 }, // On-planet reserves
    startingSpice: 3,
    reserves: { regular: 10, elite: 0 }, // Native reserves (on-planet)
  },
};

/**
 * Get preset for a faction
 */
export function getFactionPreset(faction: Faction): FactionPreset {
  return FACTION_PRESETS[faction];
}

