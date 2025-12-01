/**
 * Storm Utilities
 * 
 * Pure functions for storm-related calculations.
 * These utilities provide a single source of truth for storm logic.
 */

import { GAME_CONSTANTS } from "../data";
import { TerritoryId, TerritoryType, TERRITORY_DEFINITIONS } from "../types";
import type { GameState } from "../types";

/**
 * Get all sectors affected by storm movement.
 * 
 * When movement >= TOTAL_SECTORS, the storm wraps around the entire board
 * and affects ALL sectors. Otherwise, returns sectors from start to end.
 * 
 * This is the single source of truth for calculating affected sectors.
 * 
 * @param fromSector Starting sector (0-17)
 * @param movement Number of sectors the storm moves
 * @returns Array of all affected sector numbers
 * @throws {Error} If fromSector is out of valid range [0, TOTAL_SECTORS-1]
 * @throws {Error} If movement is negative
 */
export function getAffectedSectors(
  fromSector: number,
  movement: number
): number[] {
  // Input validation
  if (fromSector < 0 || fromSector >= GAME_CONSTANTS.TOTAL_SECTORS) {
    throw new Error(
      `Invalid fromSector: ${fromSector}. Must be in range [0, ${GAME_CONSTANTS.TOTAL_SECTORS - 1}]`
    );
  }
  if (movement < 0) {
    throw new Error(`Invalid movement: ${movement}. Must be non-negative`);
  }
  // If movement is >= total sectors, storm wraps around entire board
  // Rule: When storm passes over all sectors, all sectors are affected
  if (movement >= GAME_CONSTANTS.TOTAL_SECTORS) {
    // Return all sectors [0, 1, 2, ..., 17]
    return Array.from(
      { length: GAME_CONSTANTS.TOTAL_SECTORS },
      (_, i) => i
    );
  }

  // Normal case: calculate sectors from start to end
  const sectors: number[] = [];
  const toSector =
    (fromSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
  let current = fromSector;

  // Include starting sector
  sectors.push(current);

  // Add all sectors passed through (including ending sector)
  while (current !== toSector) {
    current = (current + 1) % GAME_CONSTANTS.TOTAL_SECTORS;
    sectors.push(current);
  }

  return sectors;
}

/**
 * Check if a territory loses storm protection due to Family Atomics.
 * 
 * Family Atomics removes protection from Imperial Basin, Arrakeen, and Carthag.
 * This is the single source of truth for this check.
 * 
 * @param state - Game state
 * @param territoryId - Territory to check
 * @returns true if territory loses protection due to Family Atomics
 * 
 * @remarks
 * Rule: When Family Atomics is played (shieldWallDestroyed === true),
 * the following territories lose their storm protection:
 * - Imperial Basin
 * - Arrakeen
 * - Carthag
 */
export function isCityLosingProtection(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  return (
    state.shieldWallDestroyed &&
    (territoryId === TerritoryId.IMPERIAL_BASIN ||
      territoryId === TerritoryId.ARRAKEEN ||
      territoryId === TerritoryId.CARTHAG)
  );
}

/**
 * Check if a territory should be affected by storm destruction.
 * 
 * A territory is affected if:
 * - It's a sand territory (or stronghold if Family Atomics was played)
 * - It's not protected from storm (or protection was removed by Family Atomics)
 * 
 * This is the single source of truth for territory storm protection checks.
 * 
 * @param state - Game state
 * @param territoryId - Territory to check
 * @returns true if territory can be affected by storm, false if protected
 * 
 * @remarks
 * Protected territories:
 * - Imperial Basin (SAND but protectedFromStorm: true)
 * - Arrakeen (STRONGHOLD, protectedFromStorm: true)
 * - Carthag (STRONGHOLD, protectedFromStorm: true)
 * - Rock Territories (not SAND type)
 * 
 * Family Atomics removes protection from Imperial Basin, Arrakeen, and Carthag.
 */
export function isTerritoryAffectedByStorm(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  const losesProtection = isCityLosingProtection(state, territoryId);

  // If this is a protected territory and Family Atomics hasn't removed its protection, skip it
  if (territory.protectedFromStorm && !losesProtection) {
    return false;
  }

  // If this is not a sand territory (rock/stronghold) and Family Atomics hasn't removed its protection, skip it
  // Note: Imperial Basin is SAND but protected, Arrakeen/Carthag are STRONGHOLD and protected
  if (territory.type !== TerritoryType.SAND && !losesProtection) {
    return false;
  }

  return true;
}

