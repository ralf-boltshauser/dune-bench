/**
 * Common Battle Scenario Configurations
 * 
 * Reusable battle setups for testing.
 */

import { Faction, TerritoryId } from '../../../types';
import type { ForcePlacement } from '../helpers/test-state-builder';
import { DEFAULT_SECTOR } from './test-data';

export interface BattleScenarioConfig {
  factions: Faction[];
  forces: ForcePlacement[];
  territory?: TerritoryId;
  sector?: number;
}

/**
 * Common battle scenario configurations
 */
export const BattleScenarios = {
  /**
   * Two-faction battle scenarios
   */
  twoFaction: {
    /**
     * Basic two-faction battle
     */
    basic: (
      faction1: Faction,
      faction2: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      sector: number = DEFAULT_SECTOR
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory, sector, regular: 10 },
        { faction: faction2, territory, sector, regular: 8 },
      ],
      territory,
      sector,
    }),

    /**
     * Stronghold battle
     */
    stronghold: (
      faction1: Faction,
      faction2: Faction,
      stronghold: TerritoryId = TerritoryId.ARRAKEEN
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory: stronghold, sector: DEFAULT_SECTOR, regular: 10 },
        { faction: faction2, territory: stronghold, sector: DEFAULT_SECTOR, regular: 8 },
      ],
      territory: stronghold,
      sector: DEFAULT_SECTOR,
    }),

    /**
     * Battle with storm in same sector (BATTLING BLIND)
     */
    withStorm: (
      faction1: Faction,
      faction2: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      stormSector: number = DEFAULT_SECTOR
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory, sector: stormSector, regular: 10 },
        { faction: faction2, territory, sector: stormSector, regular: 8 },
      ],
      territory,
      sector: stormSector,
    }),

    /**
   * Battle with different sectors (not separated by storm)
   */
    differentSectors: (
      faction1: Faction,
      faction2: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      sector1: number = 1,
      sector2: number = 2
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory, sector: sector1, regular: 10 },
        { faction: faction2, territory, sector: sector2, regular: 8 },
      ],
      territory,
      sector: sector1, // Primary sector
    }),
  },

  /**
   * Three-faction battle scenarios
   */
  threeFaction: {
    /**
     * Basic three-faction battle
     */
    basic: (
      faction1: Faction,
      faction2: Faction,
      faction3: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      sector: number = DEFAULT_SECTOR
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2, faction3],
      forces: [
        { faction: faction1, territory, sector, regular: 10 },
        { faction: faction2, territory, sector, regular: 8 },
        { faction: faction3, territory, sector, regular: 6 },
      ],
      territory,
      sector,
    }),
  },

  /**
   * Special battle scenarios
   */
  special: {
    /**
     * Lasgun-shield explosion scenario
     */
    lasgunShield: (
      faction1: Faction,
      faction2: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      sector: number = DEFAULT_SECTOR
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory, sector, regular: 10 },
        { faction: faction2, territory, sector, regular: 8 },
      ],
      territory,
      sector,
    }),

    /**
     * Traitor scenario (one traitor)
     */
    traitor: (
      aggressor: Faction,
      defender: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      sector: number = DEFAULT_SECTOR
    ): BattleScenarioConfig => ({
      factions: [aggressor, defender],
      forces: [
        { faction: aggressor, territory, sector, regular: 10 },
        { faction: defender, territory, sector, regular: 8 },
      ],
      territory,
      sector,
    }),

    /**
     * Two traitors scenario
     */
    twoTraitors: (
      faction1: Faction,
      faction2: Faction,
      territory: TerritoryId = TerritoryId.ARRAKEEN,
      sector: number = DEFAULT_SECTOR
    ): BattleScenarioConfig => ({
      factions: [faction1, faction2],
      forces: [
        { faction: faction1, territory, sector, regular: 10 },
        { faction: faction2, territory, sector, regular: 8 },
      ],
      territory,
      sector,
    }),
  },
};

