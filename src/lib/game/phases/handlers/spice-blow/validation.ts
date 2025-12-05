import { GAME_CONSTANTS } from "../../../data";
import { isTerritoryInStorm } from "../../../state/queries";
import { type GameState, TerritoryId } from "../../../types";
import { SpiceBlowLogger } from "./utils/logger";

/**
 * Check if spice placement location is in storm.
 *
 * Rule 1.02.04: "If the Spice Blow icon is currently in storm, no spice is Placed"
 *
 * This checks:
 * 1. If the exact sector matches the storm sector
 * 2. If the storm is in any sector of the territory (for multi-sector territories)
 *
 * For multi-sector territories (e.g., Cielago North spans sectors [0,1,2]), if the storm
 * is in any sector of the territory, spice placement is blocked. This prevents the bug
 * where spice could be placed in sector 0 while storm is at sector 2 in the same territory.
 *
 * Protected territories (like Imperial Basin) can still have spice placed even if storm
 * passes through, as they are protected from storm effects.
 *
 * @param state - Current game state
 * @param sector - Sector where spice would be placed (0-17)
 * @param territoryId - Territory ID (optional, but required for multi-sector territory check)
 * @returns true if spice placement should be blocked due to storm
 */
export function isInStorm(
  state: GameState,
  sector: number,
  territoryId?: TerritoryId
): boolean {
  // Input validation
  if (sector < 0 || sector >= GAME_CONSTANTS.TOTAL_SECTORS) {
    console.error(
      `⚠️  WARNING: Invalid sector number in isInStorm(): ${sector}`
    );
    // Fail safe: don't block placement if sector is invalid (data corruption case)
    return false;
  }
  if (
    state.stormSector < 0 ||
    state.stormSector >= GAME_CONSTANTS.TOTAL_SECTORS
  ) {
    console.error(
      `⚠️  WARNING: Invalid stormSector in state: ${state.stormSector}`
    );
    return false;
  }

  // Check 1: Exact sector match - if storm is at the exact sector where spice would be placed
  if (state.stormSector === sector) {
    return true;
  }

  // Check 2: If territoryId is provided, check if storm is in any sector of the territory
  // This handles multi-sector territories where storm might be in a different sector
  // of the same territory (e.g., Cielago North spans sectors [0,1,2])
  if (territoryId) {
    // Use the existing utility function which handles protected territories correctly
    // Protected territories (like Imperial Basin) return false even if storm is present
    return isTerritoryInStorm(state, territoryId);
  }

  return false;
}

/**
 * Validate that no spice was placed in storm sectors after phase completion
 */
export function validateNoSpiceInStorm(state: GameState): void {
  // Check both exact sector match AND if storm is in any sector of multi-sector territories
  const spiceInStorm = state.spiceOnBoard.filter((s) => {
    // Check exact sector match
    if (s.sector === state.stormSector) {
      return true;
    }
    // Check if storm is in any sector of the territory (for multi-sector territories)
    return isTerritoryInStorm(state, s.territoryId);
  });

  if (spiceInStorm.length > 0) {
    SpiceBlowLogger.validationFailed(state.stormSector, spiceInStorm);
    // Don't throw error - allow phase to complete, but log the issue
    // This helps identify bugs in production
  } else {
    SpiceBlowLogger.validationPassed(state.stormSector);
  }
}

