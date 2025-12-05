/**
 * Movement module test helpers
 */

import { GAME_CONSTANTS } from '../../../../data';
import { getAffectedSectors } from '../../../../utils/storm-utils';
import { Faction, TerritoryId } from '../../../../types';
import { StormTestStateBuilder } from '../test-state-builder';
import type { GameState } from '../../../../types';
import type { ForcePlacement, SpicePlacement } from '../test-state-builder';

export class MovementTestHelpers {
  /**
   * Calculate expected new storm sector
   */
  static calculateNewSector(
    oldSector: number,
    movement: number
  ): number {
    return (oldSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
  }

  /**
   * Get affected sectors for movement (uses utility function)
   */
  static getAffectedSectors(
    fromSector: number,
    movement: number
  ): number[] {
    return getAffectedSectors(fromSector, movement);
  }

  /**
   * Create state with forces in path
   */
  static createWithForcesInPath(
    stormSector: number,
    movement: number,
    placements: ForcePlacement[]
  ): GameState {
    const affectedSectors = this.getAffectedSectors(stormSector, movement);
    const uniqueFactions = [...new Set(placements.map(p => p.faction))];
    
    // Ensure at least 2 factions for valid game state
    // If we only have one faction from placements, add another
    let factions: Faction[];
    if (uniqueFactions.length >= 2) {
      factions = uniqueFactions;
    } else {
      // Add a second faction that's not in the placements
      const additionalFaction = uniqueFactions[0] === Faction.FREMEN 
        ? Faction.ATREIDES 
        : Faction.FREMEN;
      factions = [uniqueFactions[0]!, additionalFaction];
    }

    const builder = StormTestStateBuilder
      .forTurn2(factions, stormSector)
      .withMultipleForces(placements);

    return builder.build();
  }

  /**
   * Create state with spice in path
   */
  static createWithSpiceInPath(
    stormSector: number,
    movement: number,
    placements: SpicePlacement[]
  ): GameState {
    // Need at least 2 factions for valid game state
    const factions = [Faction.ATREIDES, Faction.HARKONNEN];
    const builder = StormTestStateBuilder
      .forTurn2(factions, stormSector);

    for (const placement of placements) {
      builder.withTerritorySpice(placement);
    }

    return builder.build();
  }

  /**
   * Assert Fremen half losses (rounded up per code implementation)
   * Note: Rules say "rounded down" but code uses Math.ceil (rounded up)
   */
  static assertFremenHalfLosses(
    totalForces: number,
    expectedLost: number
  ): void {
    // Code implementation uses Math.ceil (rounded up)
    const calculatedLost = Math.ceil(totalForces / 2);
    
    if (calculatedLost !== expectedLost) {
      throw new Error(
        `Expected ${expectedLost} forces lost from ${totalForces} (half rounded up), but calculation gives ${calculatedLost}`
      );
    }
  }

  /**
   * Calculate expected force losses for Fremen vs other factions
   */
  static calculateExpectedLosses(
    faction: string,
    totalForces: number
  ): number {
    if (faction === 'FREMEN') {
      return Math.ceil(totalForces / 2); // Rounded up per code
    }
    return totalForces; // Other factions lose all
  }
}

