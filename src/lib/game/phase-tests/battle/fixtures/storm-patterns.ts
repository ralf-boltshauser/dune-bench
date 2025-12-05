/**
 * Storm Pattern Configurations
 * 
 * Helper functions to configure storm patterns for testing.
 */

import { TerritoryId } from '../../../types';

export interface StormPattern {
  stormSector: number;
  affectedTerritories?: TerritoryId[];
}

/**
 * Storm pattern configurations for testing
 */
export const StormPatterns = {
  /**
   * No storm
   */
  noStorm: (): StormPattern => ({
    stormSector: 0, // No storm
  }),

  /**
   * Storm in specific sector (forces in same sector battle blind)
   */
  sameSectorStorm: (sector: number): StormPattern => ({
    stormSector: sector,
  }),

  /**
   * Forces separated by storm (cannot battle)
   */
  separatedByStorm: (sector1: number, sector2: number, stormSector: number): StormPattern => ({
    stormSector,
    // Forces in sector1 and sector2 are separated by storm
  }),

  /**
   * Complex storm pattern
   */
  complex: (stormSector: number, affectedTerritories: TerritoryId[]): StormPattern => ({
    stormSector,
    affectedTerritories,
  }),
};

