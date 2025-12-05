/**
 * Universal Stewards Rule
 * @rule 2.02.21
 *
 * "When advisors are ever alone in a Territory before Battle Phase [1.07],
 * they automatically flip to fighters."
 *
 * Subject to PEACETIME and STORMED IN restrictions.
 */

import { Faction } from "../../../../types";
import {
  convertBGAdvisorsToFighters,
  getFactionState,
  getFactionsInTerritory,
} from "../../../../state";
import { validateAdvisorFlipToFighters } from "../../../../rules";
import type { GameState } from "../../../../types";
import type { PhaseEvent } from "../../../types";

/**
 * Apply UNIVERSAL STEWARDS rule (Rule 2.02.22).
 * Auto-flips BG advisors to fighters when they are alone in a territory.
 */
export function applyUniversalStewards(
  state: GameState,
  events: PhaseEvent[]
): GameState {
  // Only applies if BG is in game and advanced rules are enabled
  if (
    !state.factions.has(Faction.BENE_GESSERIT) ||
    !state.config.advancedRules
  ) {
    return state;
  }

  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  let newState = state;
  const newEvents: PhaseEvent[] = [];

  // Find all territories where BG has advisors
  for (const stack of bgState.forces.onBoard) {
    if (stack.advisors === undefined || stack.advisors === 0) {
      continue; // No advisors in this stack
    }

    const { territoryId, sector } = stack;

    // Check if advisors are alone (no other faction forces in territory)
    // getFactionsInTerritory excludes BG advisors-only, so if it's empty or only BG, advisors are alone
    const occupants = getFactionsInTerritory(newState, territoryId);
    const isAlone =
      occupants.length === 0 ||
      (occupants.length === 1 && occupants[0] === Faction.BENE_GESSERIT);

    if (isAlone) {
      // Validate restrictions
      const validation = validateAdvisorFlipToFighters(
        newState,
        Faction.BENE_GESSERIT,
        territoryId,
        sector
      );

      if (validation.canFlip) {
        // Auto-flip advisors to fighters
        try {
          newState = convertBGAdvisorsToFighters(
            newState,
            territoryId,
            sector,
            stack.advisors
          );

          console.log(
            `   ✅ UNIVERSAL STEWARDS: Auto-flipped ${stack.advisors} advisors to fighters in ${territoryId} (sector ${sector})\n`
          );

          newEvents.push({
            type: "ADVISORS_FLIPPED",
            data: {
              faction: Faction.BENE_GESSERIT,
              territoryId,
              sector,
              count: stack.advisors,
              reason: "universal_stewards",
            },
            message: `Bene Gesserit auto-flips ${stack.advisors} advisors to fighters in ${territoryId} (UNIVERSAL STEWARDS, Rule 2.02.22)`,
          });
        } catch (error) {
          console.error(
            `   ❌ Error in UNIVERSAL STEWARDS for ${territoryId}: ${error}\n`
          );
        }
      } else {
        // Restrictions prevent flipping
        console.log(
          `   ⚠️  UNIVERSAL STEWARDS blocked in ${territoryId} (sector ${sector}): ${validation.reason}\n`
        );
      }
    }
  }

  events.push(...newEvents);
  return newState;
}

