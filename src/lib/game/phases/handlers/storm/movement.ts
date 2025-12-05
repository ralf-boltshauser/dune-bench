/**
 * Storm Movement Application
 *
 * Handles storm movement application, force destruction, and spice destruction.
 */

import { GAME_CONSTANTS } from "../../../data";
import {
  destroySpiceInTerritory,
  getProtectedLeaders,
  logAction,
  moveStorm,
  sendForcesToTanks,
} from "../../../state";
import {
  FACTION_NAMES,
  Faction,
  LeaderLocation,
  Phase,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  type GameState,
} from "../../../types";
import {
  getAffectedSectors,
  isTerritoryAffectedByStorm,
} from "../../../utils/storm-utils";
import {
  type PhaseEvent,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../../types";
import { handleStormDeckAfterMovement } from "./initialization";
import { calculateAndLogStormOrder } from "./order-calculation";
import type { ForceDestructionRecord, SpiceDestructionRecord } from "./types";

/**
 * @rule 1.01.03
 * Destroy forces in storm path.
 * When the Storm Marker moves, any Forces in a Sector of a Sand Territory (except the Imperial Basin)
 * over which the storm Starts, Passes, or Ends are destroyed and Placed in the Tleilaxu Tanks.
 * Forces in protected territories (Rock Territories, Imperial Basin, Polar Sink) are protected.
 * Fremen Forces take only half losses (rounded up).
 */
export function destroyForcesInStorm(
  state: GameState,
  fromSector: number,
  movement: number
): ForceDestructionRecord[] {
  const destroyed: ForceDestructionRecord[] = [];
  // Get all affected sectors based on movement (handles wrapping correctly)
  const affectedSectors = new Set(getAffectedSectors(fromSector, movement));

  // Check each territory
  for (const [territoryId, territory] of Object.entries(
    TERRITORY_DEFINITIONS
  )) {
    // Skip territories that are not affected by storm (protected or wrong type)
    if (!isTerritoryAffectedByStorm(state, territoryId as TerritoryId))
      continue;

    // Check if any sector of this territory is in the storm
    for (const sector of territory.sectors) {
      if (!affectedSectors.has(sector)) continue;

      // Find forces in this sector
      for (const [faction, factionState] of state.factions) {
        // Check for protected leaders in this territory/sector
        // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
        // Territory where they were used. (Game effects do not kill these leaders while there.)"
        const protectedLeaders = getProtectedLeaders(state, faction);
        if (protectedLeaders.length > 0) {
          const leadersInTerritory = factionState.leaders.filter(
            (l) =>
              l.location === LeaderLocation.ON_BOARD &&
              l.usedInTerritoryId === territoryId
          );
          if (leadersInTerritory.length > 0) {
            console.log(
              `   🛡️  ${leadersInTerritory.length} ${FACTION_NAMES[faction]} leader(s) protected from storm in ${territoryId}`
            );
          }
        }

        // @rule 2.04.16 STORM LOSSES: When your Forces are caught in a storm, only half of them there are destroyed (rounded up)
        // Fremen lose half forces (rounded up) in storm
        const forceStack = factionState.forces.onBoard.find(
          (f) => f.territoryId === territoryId && f.sector === sector
        );

        if (forceStack) {
          const totalForces =
            forceStack.forces.regular + forceStack.forces.elite;
          let lostForces = totalForces;

          // @rule 2.04.16: Fremen only lose half (rounded up)
          if (faction === Faction.FREMEN) {
            lostForces = Math.ceil(totalForces / 2);
          }

          if (lostForces > 0) {
            destroyed.push({
              faction,
              territoryId: territoryId as TerritoryId,
              sector,
              count: lostForces,
            });
          }
        }
      }
    }
  }

  return destroyed;
}

/**
 * @rule 1.01.03
 * Identify spice to be destroyed by storm movement.
 *
 * Spice is destroyed in all sectors where the storm starts, passes through, or stops.
 * Protected territories are skipped unless Family Atomics was played.
 *
 * @param state - Current game state
 * @param fromSector - Starting sector (0-17)
 * @param movement - Number of sectors the storm moves
 * @returns Array of spice entries to be destroyed
 *
 * @remarks
 * Rule 1.01.03: "any spice in a Sector which a storm passes over or stops is destroyed"
 * "stops" includes both where it starts and where it ends.
 * When movement >= TOTAL_SECTORS, storm wraps around entire board and affects all sectors.
 */
export function destroySpiceInStorm(
  state: GameState,
  fromSector: number,
  movement: number
): SpiceDestructionRecord[] {
  // Input validation
  if (fromSector < 0 || fromSector >= GAME_CONSTANTS.TOTAL_SECTORS) {
    console.error(
      `⚠️  WARNING: Invalid fromSector in destroySpiceInStorm(): ${fromSector}`
    );
    return [];
  }
  if (movement < 0) {
    console.error(
      `⚠️  WARNING: Invalid movement in destroySpiceInStorm(): ${movement}`
    );
    return [];
  }

  const destroyed: SpiceDestructionRecord[] = [];
  // CRITICAL: Include starting sector, all sectors passed through, and ending sector
  // Rule 1.01.03: "any spice in a Sector which a storm passes over or stops is destroyed"
  // "stops" includes both where it starts and where it ends
  // When movement >= TOTAL_SECTORS, storm wraps around entire board and affects all sectors
  const affectedSectors = new Set(getAffectedSectors(fromSector, movement));

  console.log(`\n  🔍 Checking spice destruction:`);
  console.log(
    `     Storm moved from sector ${fromSector}, movement: ${movement}`
  );
  console.log(
    `     Affected sectors: [${Array.from(affectedSectors)
      .sort((a, b) => a - b)
      .join(", ")}]`
  );
  console.log(`     Total spice on board: ${state.spiceOnBoard.length}`);

  // Log all spice entries for debugging
  if (state.spiceOnBoard.length > 0) {
    console.log(`     Spice entries:`);
    state.spiceOnBoard.forEach((s) => {
      const inAffectedSector = affectedSectors.has(s.sector);
      const isAffected = isTerritoryAffectedByStorm(
        state,
        s.territoryId as TerritoryId
      );
      console.log(
        `       - ${s.territoryId} (sector ${s.sector}): ${s.amount} spice | In affected sector: ${inAffectedSector} | Territory affected: ${isAffected}`
      );
    });
  }

  // Note: Spice is destroyed in sectors where the storm starts, passes through, or stops
  // But spice in protected territories is also protected (unless Family Atomics was played)
  for (const spice of state.spiceOnBoard) {
    if (!affectedSectors.has(spice.sector)) {
      continue;
    }

    // Skip protected territories unless Family Atomics removed their protection
    const territoryAffected = isTerritoryAffectedByStorm(
      state,
      spice.territoryId as TerritoryId
    );
    if (!territoryAffected) {
      console.log(
        `     ⚠️  Skipping protected territory: ${spice.territoryId} (sector ${spice.sector})`
      );
      continue;
    }

    console.log(
      `     ✅ Destroying ${spice.amount} spice in ${spice.territoryId} (sector ${spice.sector})`
    );
    destroyed.push({
      territoryId: spice.territoryId,
      sector: spice.sector,
      amount: spice.amount,
    });
  }

  console.log(`     Total spice destroyed: ${destroyed.length} entries`);
  if (destroyed.length === 0 && state.spiceOnBoard.length > 0) {
    console.log(
      `     ⚠️  WARNING: No spice was destroyed, but there is spice on the board!`
    );
    console.log(`        This might indicate a bug in the destruction logic.`);
  }
  return destroyed;
}

/**
 * Apply storm movement to the game state
 */
export function applyStormMovement(
  state: GameState,
  context: StormPhaseContext
): PhaseStepResult {
  const events: PhaseEvent[] = [];
  let newState = state;

  // Validate that stormMovement is not null before applying
  if (context.stormMovement === null) {
    console.error(
      `\n❌ ERROR: Cannot apply storm movement - stormMovement is null`
    );
    console.error(
      `   This should not happen. Storm movement should be calculated before applying.`
    );
    throw new Error(
      "Cannot apply storm movement - movement value is null. This indicates a bug in the storm phase handler."
    );
  }

  const movement = context.stormMovement;
  const oldSector = state.turn === 1 ? 0 : state.stormSector; // Turn 1 starts from Storm Start Sector (0)

  // Step 5: Validate movement range based on turn and context
  // Note: Weather Control can set movement to 0-10, so check context
  const isWeatherControl = context.weatherControlUsed;

  if (state.turn === 1) {
    // Turn 1: 0-40 valid (two dials of 0-20)
    if (movement < 0 || movement > 40) {
      console.error(
        `\n❌ ERROR: Invalid movement for Turn 1: ${movement} (expected 0-40)`
      );
    }
  } else {
    if (isWeatherControl) {
      // Weather Control: 0-10 valid
      if (movement < 0 || movement > 10) {
        console.error(
          `\n❌ ERROR: Invalid movement from Weather Control: ${movement} (expected 0-10)`
        );
      }
    } else {
      // Normal Turn 2+: 2-6 valid (two dials of 1-3)
      if (movement < 2 || movement > 6) {
        console.error(
          `\n❌ ERROR: Invalid movement for Turn ${state.turn}: ${movement} (expected 2-6)`
        );
        console.error(
          `   This should not happen with valid dials. Check for bugs.`
        );
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("🌪️  STORM MOVEMENT CALCULATION");
  console.log("=".repeat(80));
  console.log(
    `\n  Starting Sector: ${oldSector}${
      state.turn === 1 ? " (Storm Start Sector)" : ""
    }`
  );
  console.log(`  Movement: ${movement} sectors counterclockwise`);

  // Move storm
  // Wrapping logic: (oldSector + movement) % TOTAL_SECTORS
  // This correctly handles:
  // - Normal movement: e.g., (5 + 3) % 18 = 8
  // - Wrapping: e.g., (17 + 3) % 18 = 2
  // - Full wrap: e.g., (0 + 18) % 18 = 0, (0 + 20) % 18 = 2
  // - Multiple wraps: e.g., (0 + 36) % 18 = 0, (5 + 36) % 18 = 5
  const newSector = (oldSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
  console.log(`  Ending Sector: ${newSector}`);

  // Validate wrapping logic
  // Verify that newSector is in valid range [0, TOTAL_SECTORS-1]
  if (newSector < 0 || newSector >= GAME_CONSTANTS.TOTAL_SECTORS) {
    console.error(
      `\n❌ ERROR: Invalid newSector calculated: ${newSector} (expected 0-${
        GAME_CONSTANTS.TOTAL_SECTORS - 1
      })`
    );
    console.error(
      `   oldSector: ${oldSector}, movement: ${movement}, calculation: (${oldSector} + ${movement}) % ${GAME_CONSTANTS.TOTAL_SECTORS}`
    );
    throw new Error(
      `Invalid storm sector calculated: ${newSector}. This indicates a bug in the wrapping logic.`
    );
  }

  // Update state with new sector
  newState = moveStorm(newState, newSector);

  // Validate that moveStorm() correctly updated the state
  if (newState.stormSector !== newSector) {
    console.error(
      `\n❌ ERROR: moveStorm() did not correctly update storm sector`
    );
    console.error(`   Expected: ${newSector}, Actual: ${newState.stormSector}`);
    throw new Error(
      `State mutation failed - storm sector not updated correctly. Expected ${newSector}, got ${newState.stormSector}.`
    );
  }

  // Validate that storm sector actually changed (unless movement is 0, which is valid for Turn 1 or Weather Control)
  // Note: isWeatherControl already declared above
  const isMovementZeroValid =
    state.turn === 1 || (state.turn > 1 && isWeatherControl);

  if (newState.stormSector === oldSector && !isMovementZeroValid) {
    console.error(
      `\n❌ ERROR: Storm sector did not change after movement (${oldSector} → ${newState.stormSector})`
    );
    console.error(
      `   Movement: ${movement}, Turn: ${state.turn}, Weather Control: ${isWeatherControl}`
    );
    console.error(
      `   For Turn ${state.turn} (normal), movement should be 2-6, so storm should always move.`
    );
    // Don't throw error - allow phase to complete, but log the issue
    // This could happen if movement is 0 or wrapping calculation is wrong
  } else if (newState.stormSector === oldSector && isMovementZeroValid) {
    console.log(
      `\n  ℹ️  INFO: Storm did not move (movement = 0, which is valid for ${
        state.turn === 1 ? "Turn 1" : "Weather Control"
      })`
    );
  } else {
    console.log(
      `\n  ✅ Storm moved from sector ${oldSector} to sector ${newState.stormSector}`
    );
  }

  // Calculate affected sectors based on movement amount (handles wrapping correctly)
  const sectorsAffected = getAffectedSectors(oldSector, movement);

  events.push({
    type: "STORM_MOVED",
    data: {
      from: oldSector,
      to: newSector,
      movement,
      sectorsAffected,
    },
    message: `Storm moves ${movement} sectors (${oldSector} → ${newSector})`,
  });

  // Destroy forces and spice in storm path
  // NOTE: Use original state (before storm moved) to check what exists,
  // since moveStorm() only updates stormSector and doesn't affect forces/spice
  const destroyedForces = destroyForcesInStorm(state, oldSector, movement);
  const destroyedSpice = destroySpiceInStorm(state, oldSector, movement);

  // Apply destruction
  for (const destruction of destroyedForces) {
    newState = sendForcesToTanks(
      newState,
      destruction.faction,
      destruction.territoryId,
      destruction.sector,
      destruction.count
    );

    events.push({
      type: "FORCES_KILLED_BY_STORM",
      data: destruction as unknown as Record<string, unknown>,
      message: `${destruction.count} ${destruction.faction} forces destroyed by storm in ${destruction.territoryId}`,
    });
  }

  for (const destruction of destroyedSpice) {
    newState = destroySpiceInTerritory(
      newState,
      destruction.territoryId,
      destruction.sector
    );

    events.push({
      type: "SPICE_DESTROYED_BY_STORM",
      data: destruction as unknown as Record<string, unknown>,
      message: `${destruction.amount} spice destroyed by storm in ${destruction.territoryId}`,
    });
  }

  // Update storm order based on new storm position
  newState = calculateAndLogStormOrder(newState, newSector);

  // If Fremen is in play with advanced rules, handle storm deck
  if (newState.factions.has(Faction.FREMEN) && newState.config.advancedRules) {
    const deckResult = handleStormDeckAfterMovement(newState, events);
    newState = deckResult.state;
    // Events are already added to the events array by handleStormDeckAfterMovement
  }

  // Log the action
  newState = logAction(newState, "STORM_MOVED", null, {
    from: oldSector,
    to: newSector,
    movement,
  });

  return {
    state: newState,
    phaseComplete: true,
    nextPhase: Phase.SPICE_BLOW,
    pendingRequests: [],
    actions: [],
    events,
  };
}
