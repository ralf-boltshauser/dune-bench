/**
 * Storm Dialing
 * 
 * Handles storm dialer selection and dial response processing.
 */

import { GAME_CONSTANTS } from "../../../data";
import { getPlayerPositions } from "../../../state";
import { calculateStormOrder } from "../../../state/factory";
import { FACTION_NAMES, Faction, type GameState } from "../../../types";
import {
  type AgentResponse,
  type PhaseEvent,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../../types";
import { checkFamilyAtomics } from "./family-atomics";

/**
 * Helper function to ensure two distinct dialers are selected.
 * If dialer1 === dialer2, finds a distinct second faction from available factions.
 */
export function ensureTwoDistinctDialers(
  dialer1: Faction,
  dialer2: Faction,
  availableFactions: Faction[]
): [Faction, Faction] {
  if (dialer1 === dialer2) {
    console.error(
      `\n❌ ERROR: Duplicate dialers detected: ${FACTION_NAMES[dialer1]}`
    );
    console.error(
      `   Attempting to find distinct second dialer from available factions...`
    );

    // Find a distinct faction from available factions
    const distinctFactions = availableFactions.filter((f) => f !== dialer1);

    if (distinctFactions.length === 0) {
      throw new Error(
        `Cannot select two different dialers - only one faction (${FACTION_NAMES[dialer1]}) is available. This should not happen in a valid game state.`
      );
    }

    // Use the first distinct faction as fallback
    dialer2 = distinctFactions[0];
    console.error(
      `   ✅ Fixed: Selected ${FACTION_NAMES[dialer2]} as second dialer`
    );
  }

  return [dialer1, dialer2];
}

/**
 * Get the two factions who should dial the storm
 * @rule 0.16 - First turn: The two players whose player markers are nearest on either side of the Storm Start Sector dial 0-20
 */
export function getStormDialers(state: GameState): [Faction, Faction] {
  const factions = Array.from(state.factions.keys());
  const playerPositions = getPlayerPositions(state);

  if (state.turn === 1) {
    // First turn: two players nearest Storm Start Sector (sector 0) on either side
    const stormStartSector = 0;

    // Find all factions with their distances from storm start
    // We need to find the nearest on EITHER side (before and after sector 0)
    const factionsWithInfo = factions.map((faction) => {
      const position = playerPositions.get(faction) ?? 0;
      // Calculate counterclockwise distance from storm start (forward/after)
      const distanceForward =
        (position - stormStartSector + GAME_CONSTANTS.TOTAL_SECTORS) %
        GAME_CONSTANTS.TOTAL_SECTORS;
      // Calculate clockwise distance (backward/before) - going the other way around
      // If position is 0, backward distance is 0. Otherwise, it's 18 - forward distance
      const distanceBackward =
        position === stormStartSector
          ? GAME_CONSTANTS.TOTAL_SECTORS // At start, treat as far
          : (stormStartSector - position + GAME_CONSTANTS.TOTAL_SECTORS) %
            GAME_CONSTANTS.TOTAL_SECTORS;
      return {
        faction,
        position,
        distanceForward,
        distanceBackward,
        // If at sector 0, treat as very far (not a dialer)
        isAtStart: position === stormStartSector,
      };
    });

    // Filter out faction at sector 0 (if any), then find nearest forward and backward
    const notAtStart = factionsWithInfo.filter((f) => !f.isAtStart);

    // Find nearest forward (after sector 0, counterclockwise)
    const nearestForward = notAtStart.reduce(
      (min, curr) =>
        curr.distanceForward < min.distanceForward ? curr : min,
      notAtStart[0] || factionsWithInfo[0]
    );

    // Find nearest backward (before sector 0, clockwise)
    const nearestBackward = notAtStart.reduce(
      (min, curr) =>
        curr.distanceBackward < min.distanceBackward ? curr : min,
      notAtStart[0] || factionsWithInfo[0]
    );

    // If we have both, use them. Otherwise fall back to two nearest overall
    let dialer1: Faction;
    let dialer2: Faction;

    if (
      nearestForward &&
      nearestBackward &&
      nearestForward.faction !== nearestBackward.faction
    ) {
      dialer1 = nearestForward.faction;
      dialer2 = nearestBackward.faction;
    } else {
      // Fallback: two nearest overall (excluding any at sector 0)
      const sorted =
        notAtStart.length > 0
          ? [...notAtStart].sort(
              (a, b) => a.distanceForward - b.distanceForward
            )
          : [...factionsWithInfo].sort(
              (a, b) => a.distanceForward - b.distanceForward
            );
      dialer1 = sorted[0]?.faction ?? factions[0];
      // Fix: Find distinct second faction, don't fallback to same as dialer1
      dialer2 =
        sorted[1]?.faction ??
        sorted.find((f) => f.faction !== dialer1)?.faction ??
        factions.find((f) => f !== dialer1) ??
        factions[0];
    }

    // Log for debugging
    console.log("\n" + "=".repeat(80));
    console.log("🌪️  INITIAL STORM PLACEMENT (Turn 1)");
    console.log("=".repeat(80));
    console.log(`\n📍 Storm Start Sector: ${stormStartSector}`);
    console.log("\n📊 Player Positions (relative to Storm Start Sector 0):");
    factionsWithInfo.forEach(
      ({
        faction,
        position,
        distanceForward,
        distanceBackward,
        isAtStart,
      }) => {
        if (isAtStart) {
          console.log(
            `  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (AT Storm Start - not a dialer)`
          );
        } else {
          const direction =
            distanceForward < distanceBackward ? "forward" : "backward";
          const dist = Math.min(distanceForward, distanceBackward);
          console.log(
            `  ${
              FACTION_NAMES[faction]
            }: Sector ${position} (${dist} sectors ${
              direction === "forward" ? "after" : "before"
            } storm start)`
          );
        }
      }
    );
    // Validate dialers are distinct before returning
    [dialer1, dialer2] = ensureTwoDistinctDialers(
      dialer1,
      dialer2,
      factions
    );

    console.log(
      `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
    );
    if (dialer1 === dialer2) {
      console.warn(
        `   ⚠️  WARNING: Same faction selected twice! Only ${FACTION_NAMES[dialer1]} will dial.`
      );
    } else {
      // Log reasoning for selection
      const dialer1Info = factionsWithInfo.find((f) => f.faction === dialer1);
      const dialer2Info = factionsWithInfo.find((f) => f.faction === dialer2);
      if (dialer1Info && dialer2Info) {
        const dialer1Reason =
          dialer1Info === nearestForward
            ? "nearest forward (after storm start)"
            : dialer1Info === nearestBackward
            ? "nearest backward (before storm start)"
            : "fallback selection";
        const dialer2Reason =
          dialer2Info === nearestForward
            ? "nearest forward (after storm start)"
            : dialer2Info === nearestBackward
            ? "nearest backward (before storm start)"
            : "fallback selection";
        console.log(
          `   ${FACTION_NAMES[dialer1]}: Selected as ${dialer1Reason}`
        );
        console.log(
          `   ${FACTION_NAMES[dialer2]}: Selected as ${dialer2Reason}`
        );
      }
    }
    console.log(
      "   (Two players nearest to Storm Start Sector on either side)"
    );
    console.log("=".repeat(80) + "\n");

    return [dialer1, dialer2];
  }

  // Later turns: players who last used battle wheels
  // Since we don't track battle participation, we use the two players whose
  // markers are nearest to the storm position on either side:
  // 1. The player marker at or immediately after the storm (counterclockwise)
  // 2. The player marker closest before the storm (clockwise from storm)
  //
  // SPECIAL RULE: If someone is on the storm sector (same sector as storm),
  // they are a dialer AND the next person in storm order is also a dialer.

  const currentStormSector = state.stormSector;

  // Find all factions with their distances from storm
  const factionsWithInfo = factions.map((faction) => {
    const position = playerPositions.get(faction) ?? 0;
    // Calculate counterclockwise distance from storm (after/ahead)
    const distanceForward =
      (position - currentStormSector + GAME_CONSTANTS.TOTAL_SECTORS) %
      GAME_CONSTANTS.TOTAL_SECTORS;
    // Calculate clockwise distance (before/behind)
    const distanceBackward =
      (currentStormSector - position + GAME_CONSTANTS.TOTAL_SECTORS) %
      GAME_CONSTANTS.TOTAL_SECTORS;
    return {
      faction,
      position,
      distanceForward,
      distanceBackward,
      isOnStorm: distanceForward === 0,
    };
  });

  // Check if any faction is on the storm sector
  const factionOnStorm = factionsWithInfo.find((f) => f.isOnStorm);

  let dialer1: Faction;
  let dialer2: Faction;

  if (factionOnStorm) {
    // SPECIAL CASE: Someone is on the storm sector
    // Rule: They are a dialer AND the next person in storm order is also a dialer
    dialer1 = factionOnStorm.faction;

    // Calculate storm order to find who would be "next in storm order"
    // Since the person on the storm is last in storm order, the "next person"
    // is the first person in storm order
    const stormOrder = calculateStormOrder(state);
    // The first person in storm order is the one who comes after the person on the storm
    dialer2 = stormOrder[0]!;

    // Validate that dialer2 is different from dialer1
    if (dialer2 === dialer1) {
      // If same, find next distinct faction in storm order
      dialer2 =
        stormOrder.find((f) => f !== dialer1) ??
        factions.find((f) => f !== dialer1) ??
        dialer1; // Fallback, will be caught by validation
    }

    console.log("\n" + "=".repeat(80));
    console.log("🌪️  STORM MOVEMENT (Turn " + state.turn + ")");
    console.log("=".repeat(80));
    console.log(`\n📍 Current Storm Sector: ${currentStormSector}`);
    console.log("\n📊 Player Positions (relative to Storm):");
    factionsWithInfo.forEach(
      ({
        faction,
        position,
        distanceForward,
        distanceBackward,
        isOnStorm,
      }) => {
        if (isOnStorm) {
          console.log(
            `  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (ON STORM - is a dialer)`
          );
        } else {
          console.log(
            `  ${FACTION_NAMES[faction]}: Sector ${position} (${distanceForward} sectors ahead, ${distanceBackward} sectors behind)`
          );
        }
      }
    );
    console.log(
      `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
    );
    console.log(
      `   ${FACTION_NAMES[dialer1]}: ON STORM SECTOR (is a dialer)`
    );
    // Validate dialers are distinct before returning
    [dialer1, dialer2] = ensureTwoDistinctDialers(
      dialer1,
      dialer2,
      factions
    );

    // After validation, dialers are guaranteed to be distinct
    console.log(
      `   ${FACTION_NAMES[dialer1]}: ON STORM SECTOR (is a dialer)`
    );
    console.log(
      `   ${FACTION_NAMES[dialer2]}: NEXT IN STORM ORDER (also a dialer)`
    );
    console.log(
      "   (Rule: If someone is below the storm, they are a dialer AND the next person in storm order too)"
    );
    console.log("=".repeat(80) + "\n");

    return [dialer1, dialer2];
  }

  // NORMAL CASE: No one is on the storm sector
  // Find nearest forward (at or after storm, counterclockwise)
  // This is the player marker the storm "approaches next" or is on top of
  const nearestForward = factionsWithInfo.reduce((min, curr) =>
    curr.distanceForward < min.distanceForward ? curr : min
  );

  // Find nearest backward (before storm, clockwise)
  // This is the player marker closest to storm going the other direction
  const nearestBackward = factionsWithInfo.reduce((min, curr) =>
    curr.distanceBackward < min.distanceBackward ? curr : min
  );

  dialer1 = nearestForward.faction;
  dialer2 = nearestBackward.faction;

  // Validation: Ensure we have two different factions
  // If both point to the same faction (e.g., all factions clustered on one side),
  // fall back to selecting the two nearest distinct factions
  if (dialer1 === dialer2) {
    console.warn(
      `\n⚠️  WARNING: Nearest forward and backward are the same faction (${FACTION_NAMES[dialer1]}).`
    );
    console.warn(
      "   This usually means all factions are clustered on one side of the storm."
    );
    console.warn(
      "   Falling back to selecting two nearest distinct factions..."
    );

    // Find the two nearest distinct factions
    // Sort by forward distance (counterclockwise from storm)
    const sortedByForward = [...factionsWithInfo].sort(
      (a, b) => a.distanceForward - b.distanceForward
    );
    dialer1 = sortedByForward[0]!.faction;
    // Find second nearest that's different from first
    dialer2 =
      sortedByForward.find((f) => f.faction !== dialer1)?.faction ??
      // If no forward distinct, try backward
      factionsWithInfo
        .filter((f) => f.faction !== dialer1)
        .sort((a, b) => a.distanceBackward - b.distanceBackward)[0]
        ?.faction ??
      // Last resort: any distinct faction
      factions.find((f) => f !== dialer1) ??
      dialer1;

    if (dialer1 === dialer2) {
      console.error(
        `\n❌ ERROR: Only one faction available for storm dialing: ${FACTION_NAMES[dialer1]}`
      );
      console.error(
        "   This should not happen in a valid game state. Will use validation helper."
      );
    } else {
      console.warn(
        `   ✅ Fallback selected: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
      );
    }
  }

  // Final validation using helper function
  [dialer1, dialer2] = ensureTwoDistinctDialers(
    dialer1,
    dialer2,
    factions
  );

  console.log("\n" + "=".repeat(80));
  console.log("🌪️  STORM MOVEMENT (Turn " + state.turn + ")");
  console.log("=".repeat(80));
  console.log(`\n📍 Current Storm Sector: ${currentStormSector}`);
  console.log("\n📊 Player Positions (relative to Storm):");
  factionsWithInfo.forEach(
    ({ faction, position, distanceForward, distanceBackward, isOnStorm }) => {
      if (isOnStorm) {
        console.log(
          `  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (ON STORM)`
        );
      } else {
        console.log(
          `  ${FACTION_NAMES[faction]}: Sector ${position} (${distanceForward} sectors ahead, ${distanceBackward} sectors behind)`
        );
      }
    }
  );
  console.log(
    `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
  );
  if (dialer1 === dialer2) {
    console.warn(
      `   ⚠️  WARNING: Same faction selected twice! Only ${FACTION_NAMES[dialer1]} will dial.`
    );
    console.warn(
      "   This should have been fixed by validation. Please investigate."
    );
  } else {
    // Show detailed reasoning for selection
    const dialer1Info = factionsWithInfo.find((f) => f.faction === dialer1);
    const dialer2Info = factionsWithInfo.find((f) => f.faction === dialer2);

    if (dialer1Info && dialer2Info) {
      if (dialer1 === nearestForward.faction) {
        console.log(
          `   ${FACTION_NAMES[dialer1]}: Nearest at/after storm (${dialer1Info.distanceForward} sectors counterclockwise)`
        );
      } else {
        console.log(
          `   ${FACTION_NAMES[dialer1]}: Selected as fallback (sector ${dialer1Info.position}, ${dialer1Info.distanceForward} sectors ahead)`
        );
      }

      if (dialer2 === nearestBackward.faction) {
        console.log(
          `   ${FACTION_NAMES[dialer2]}: Nearest before storm (${dialer2Info.distanceBackward} sectors clockwise)`
        );
      } else {
        console.log(
          `   ${FACTION_NAMES[dialer2]}: Selected as fallback (sector ${dialer2Info.position}, ${dialer2Info.distanceBackward} sectors behind)`
        );
      }
    }
  }
  console.log(
    "   (Two players whose markers are nearest to storm on either side)"
  );
  console.log("=".repeat(80) + "\n");

  return [dialer1, dialer2];
}

/**
 * @rule 1.01.02
 * Process dial responses and calculate movement
 * Two players dial 1-3, reveal simultaneously, add together, advance storm marker
 */
/**
 * @rule 0.16 - Process dial responses: The two numbers are simultaneously revealed, totaled, and the Storm Marker moved from Storm Start Sector counterclockwise for the sum total of sectors
 */
export function processDialResponses(
  state: GameState,
  responses: AgentResponse[],
  context: StormPhaseContext
): PhaseStepResult {
  const events: PhaseEvent[] = [];
  const maxDial =
    state.turn === 1
      ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
      : GAME_CONSTANTS.MAX_STORM_DIAL;

  console.log("\n" + "=".repeat(80));
  console.log("🎲 STORM DIAL REVEAL");
  console.log("=".repeat(80));

  // Collect dial values
  for (const response of responses) {
    // Tool name 'dial_storm' becomes 'DIAL_STORM' actionType
    if (response.actionType === "DIAL_STORM") {
      // Tool returns 'dial' property
      let dialValue = Number(response.data.dial ?? 0);

      // Clamp to valid range
      if (state.turn === 1) {
        dialValue = Math.max(0, Math.min(maxDial, dialValue));
      } else {
        dialValue = Math.max(1, Math.min(maxDial, dialValue));
      }

      context.dials.set(response.factionId, dialValue);

      console.log(
        `\n  ${FACTION_NAMES[response.factionId]}: ${dialValue} (range: ${
          state.turn === 1 ? "0-20" : "1-3"
        })`
      );

      events.push({
        type: "STORM_DIAL_REVEALED",
        data: { faction: response.factionId, value: dialValue },
        message: `${response.factionId} dials ${dialValue}`,
      });
    }
  }

  // Step 3: Check for missing responses
  const dialResponses = responses.filter(
    (r) => r.actionType === "DIAL_STORM"
  );
  if (dialResponses.length === 0) {
    console.error(`\n❌ ERROR: No storm dial responses received.`);
    console.error(`   Expected 2 dial responses, got 0.`);
    console.error(`   Cannot calculate storm movement.`);
    throw new Error(
      "No storm dial responses received - cannot proceed with storm phase"
    );
  }

  // Check for missing expected dialers
  const expectedDialers = context.dialingFactions;
  if (expectedDialers) {
    const respondedFactions = new Set(Array.from(context.dials.keys()));
    const missingDialers = expectedDialers.filter(
      (f) => !respondedFactions.has(f)
    );

    if (missingDialers.length > 0) {
      console.error(
        `\n❌ ERROR: Missing dial responses from: ${missingDialers
          .map((f) => FACTION_NAMES[f])
          .join(", ")}`
      );
      console.error(
        `   Expected dials from: ${expectedDialers
          .map((f) => FACTION_NAMES[f])
          .join(", ")}`
      );
    }
  }

  // Step 1: Validate dial response count
  const expectedDialCount = 2; // Always expect 2 dials when this method is called (storm deck skips this)
  const actualDialCount = context.dials.size;

  if (actualDialCount !== expectedDialCount) {
    console.error(
      `\n❌ ERROR: Expected ${expectedDialCount} dial responses, got ${actualDialCount}`
    );
    console.error(
      `   Received dials from: ${Array.from(context.dials.keys())
        .map((f) => FACTION_NAMES[f])
        .join(", ")}`
    );

    // If we have at least one dial, continue with warning
    // Note: actualDialCount === 0 case already handled above (lines 985-992 throws error)
    if (actualDialCount === 1) {
      console.warn(
        `   ⚠️  WARNING: Only one dial received. Movement will be incorrect (should be sum of two dials).`
      );
    }
    // actualDialCount === 0 is unreachable here (already thrown error above)
  }

  // Calculate total movement
  let totalMovement = 0;
  for (const value of Array.from(context.dials.values())) {
    totalMovement += value;
  }
  context.stormMovement = totalMovement;

  // Step 2: Validate minimum movement
  if (state.turn === 1) {
    if (totalMovement < 0 || totalMovement > 40) {
      console.error(
        `\n❌ ERROR: Invalid movement for Turn 1: ${totalMovement} (expected 0-40)`
      );
      console.error(
        `   This suggests incorrect dial values or calculation error.`
      );
    }
  } else {
    // Turn 2+: Should be 2-6 (two dials of 1-3)
    if (totalMovement < 2 || totalMovement > 6) {
      console.error(
        `\n❌ ERROR: Invalid movement for Turn ${state.turn}: ${totalMovement} (expected 2-6)`
      );
      console.error(
        `   This suggests incorrect dial values, missing dial, or calculation error.`
      );

      // Check if it's because of missing dial
      if (actualDialCount === 1) {
        console.error(
          `   Root cause: Only one dial received instead of two.`
        );
      }
    }
  }

  console.log(`\n  📊 Total: ${totalMovement} sectors`);

  // Step 4: Enhanced logging for single dial warning
  if (context.dials.size === 1) {
    const dialer = Array.from(context.dials.keys())[0];
    const expectedDialersForLogging = context.dialingFactions;
    const missingDialer = expectedDialersForLogging?.find(
      (f) => f !== dialer
    );

    console.warn(
      `\n  ⚠️  WARNING: Only one dial received (from ${FACTION_NAMES[dialer]})`
    );
    if (missingDialer) {
      console.warn(
        `   Expected dial from ${FACTION_NAMES[missingDialer]} but none received.`
      );
    }
    console.warn(
      `   Movement will be incorrect (single dial value instead of sum of two dials).`
    );
    console.warn(
      `   Expected range: ${
        state.turn === 1 ? "0-40" : "2-6"
      }, Actual: ${totalMovement}`
    );
  }

  console.log("=".repeat(80) + "\n");

  // Lock in the movement (but don't apply yet - need to check for cards)
  // Now check for Family Atomics (after movement calculated, before moved)
  return checkFamilyAtomics(state, context);
}

