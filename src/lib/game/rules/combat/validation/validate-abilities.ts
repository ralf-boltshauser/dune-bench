/**
 * Ability validation logic (Kwisatz Haderach, spice dialing).
 */

import { Faction, TerritoryId, type BattlePlan, type GameState } from "../../../types";
import { getFactionState } from "../../../state";
import { createError, type ValidationError } from "../../types";

/**
 * Validate Kwisatz Haderach usage (Atreides only).
 */
export function validateKwisatzHaderach(
  plan: BattlePlan,
  faction: Faction,
  factionState: ReturnType<typeof getFactionState>,
  territoryId: TerritoryId
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!plan.kwisatzHaderachUsed) return errors;

  if (faction !== Faction.ATREIDES) {
    errors.push(
      createError(
        "ABILITY_NOT_AVAILABLE",
        "Only Atreides can use the Kwisatz Haderach",
        { field: "kwisatzHaderachUsed" }
      )
    );
  } else {
    const kh = factionState.kwisatzHaderach;
    if (!kh) {
      errors.push(
        createError(
          "ABILITY_NOT_AVAILABLE",
          "Kwisatz Haderach not initialized",
          { field: "kwisatzHaderachUsed" }
        )
      );
    } else if (!kh.isActive) {
      errors.push(
        createError(
          "KH_NOT_ACTIVE",
          "Kwisatz Haderach is not active yet (need 7+ forces lost)",
          {
            field: "kwisatzHaderachUsed",
            actual: kh.forcesLostCount,
            expected: "7+",
          }
        )
      );
    } else if (kh.isDead) {
      errors.push(
        createError("KH_NOT_ACTIVE", "Kwisatz Haderach is dead", {
          field: "kwisatzHaderachUsed",
        })
      );
    } else if (
      kh.usedInTerritoryThisTurn &&
      kh.usedInTerritoryThisTurn !== territoryId
    ) {
      errors.push(
        createError(
          "KH_ALREADY_USED",
          `Kwisatz Haderach already used in ${kh.usedInTerritoryThisTurn} this turn`,
          {
            field: "kwisatzHaderachUsed",
            suggestion: "Can only use Kwisatz Haderach once per turn",
          }
        )
      );
    }
    // If usedInTerritoryThisTurn === territoryId, allow it (re-battle in same territory)
  }

  return errors;
}

/**
 * Validate spice dialing (advanced rules only).
 */
export function validateSpiceDialing(
  plan: BattlePlan,
  state: GameState,
  factionState: ReturnType<typeof getFactionState>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!plan.spiceDialed || plan.spiceDialed <= 0) return errors;

  if (!state.config.advancedRules) {
    errors.push(
      createError(
        "ABILITY_NOT_AVAILABLE",
        "Spice dialing is only available in advanced rules",
        { field: "spiceDialed" }
      )
    );
  } else if (plan.spiceDialed > plan.forcesDialed) {
    errors.push(
      createError(
        "INVALID_SPICE_DIALING",
        `Cannot dial ${plan.spiceDialed} spice for ${plan.forcesDialed} forces`,
        {
          field: "spiceDialed",
          actual: plan.spiceDialed,
          expected: `0-${plan.forcesDialed}`,
          suggestion: `Dial at most ${plan.forcesDialed} spice (1 spice per force)`,
        }
      )
    );
  } else if (plan.spiceDialed > factionState.spice) {
    errors.push(
      createError(
        "INSUFFICIENT_SPICE",
        `Cannot dial ${plan.spiceDialed} spice, only have ${factionState.spice}`,
        {
          field: "spiceDialed",
          actual: plan.spiceDialed,
          expected: `0-${factionState.spice}`,
          suggestion: `Dial at most ${factionState.spice} spice`,
        }
      )
    );
  }
  // Note: Fremen don't need spice due to BATTLE HARDENED, but they can still dial if they want

  return errors;
}

