/**
 * Storm Order Calculation
 * 
 * Handles storm order determination and logging.
 */

import { GAME_CONSTANTS } from "../../../data";
import { calculateStormOrder } from "../../../state/factory";
import { getPlayerPositions, updateStormOrder } from "../../../state";
import { FACTION_NAMES, Faction, type GameState } from "../../../types";

/**
 * Calculate and update storm order, then log the results
 */
export function calculateAndLogStormOrder(
  state: GameState,
  newSector: number
): GameState {
  // Calculate storm order based on new storm position
  const newOrder = calculateStormOrder(state);
  const newState = updateStormOrder(state, newOrder);

  // Log storm order calculation
  logStormOrderDetermination(newState, newSector, newOrder);

  return newState;
}

/**
 * Log storm order determination with player positions and distances
 */
export function logStormOrderDetermination(
  state: GameState,
  newSector: number,
  order: Faction[]
): void {
  console.log("\n" + "=".repeat(80));
  console.log("📋 STORM ORDER DETERMINATION");
  console.log("=".repeat(80));
  console.log(`\n  Storm Position: Sector ${newSector}`);
  console.log("\n  Player Positions:");
  const playerPositions = getPlayerPositions(state);
  const factions = Array.from(state.factions.keys());
  factions.forEach((faction) => {
    const position = playerPositions.get(faction) ?? 0;
    const distance =
      (position - newSector + GAME_CONSTANTS.TOTAL_SECTORS) %
      GAME_CONSTANTS.TOTAL_SECTORS;
    const isOnStorm = distance === 0;
    const marker = isOnStorm ? " ⚠️  (ON STORM - goes last)" : "";
    console.log(
      `    ${FACTION_NAMES[faction]}: Sector ${position} (distance: ${distance}${marker})`
    );
  });
  console.log("\n  Storm Order (First → Last):");
  order.forEach((faction, index) => {
    const position = playerPositions.get(faction) ?? 0;
    const distance =
      (position - newSector + GAME_CONSTANTS.TOTAL_SECTORS) %
      GAME_CONSTANTS.TOTAL_SECTORS;
    console.log(
      `    ${index + 1}. ${
        FACTION_NAMES[faction]
      } (Sector ${position}, distance: ${distance})`
    );
  });
  console.log(`\n  ✅ First Player: ${FACTION_NAMES[order[0]]}`);
  console.log("=".repeat(80) + "\n");
}

