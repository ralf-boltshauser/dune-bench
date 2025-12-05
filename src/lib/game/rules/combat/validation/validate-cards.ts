/**
 * Treachery card validation logic.
 */

import {
  getTreacheryCardDefinition,
  isDefenseCard,
  isWeaponCard,
  isWorthless,
} from "../../../data";
import type { BattlePlan, TreacheryCard } from "../../../types";
import { createError, type ValidationError } from "../../types";

/**
 * Validate a treachery card for battle use.
 * @rule 3.01.01, 3.01.10, 3.01.12, 3.01.13, 3.01.21
 */
export function validateTreacheryCard(
  hand: TreacheryCard[],
  cardId: string,
  expectedType: "weapon" | "defense",
  field: string
): ValidationError | null {
  const card = hand.find((c) => c.definitionId === cardId);

  if (!card) {
    return createError(
      "CARD_NOT_IN_HAND",
      `Card ${cardId} is not in your hand`,
      {
        field,
      }
    );
  }

  const def = getTreacheryCardDefinition(cardId);
  if (!def) {
    return createError("CARD_NOT_IN_HAND", `Unknown card ${cardId}`, { field });
  }

  // Check card type matches expected
  if (expectedType === "weapon") {
    if (!isWeaponCard(def) && !isWorthless(def)) {
      return createError(
        "INVALID_WEAPON_CARD",
        `${def.name} cannot be played as a weapon`,
        {
          field,
          actual: def.type,
          expected: "Weapon or Worthless card",
        }
      );
    }
  } else {
    if (!isDefenseCard(def) && !isWorthless(def)) {
      return createError(
        "INVALID_DEFENSE_CARD",
        `${def.name} cannot be played as a defense`,
        {
          field,
          actual: def.type,
          expected: "Defense or Worthless card",
        }
      );
    }
  }

  return null;
}

/**
 * Validate all treachery cards in battle plan.
 */
export function validateTreacheryCards(
  plan: BattlePlan,
  factionState: { hand: TreacheryCard[] }
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check: Weapon card validity
  if (plan.weaponCardId) {
    const weaponError = validateTreacheryCard(
      factionState.hand,
      plan.weaponCardId,
      "weapon",
      "weaponCardId"
    );
    if (weaponError) errors.push(weaponError);
  }

  // Check: Defense card validity
  if (plan.defenseCardId) {
    const defenseError = validateTreacheryCard(
      factionState.hand,
      plan.defenseCardId,
      "defense",
      "defenseCardId"
    );
    if (defenseError) errors.push(defenseError);
  }

  // Check: Same card used twice
  if (plan.weaponCardId && plan.weaponCardId === plan.defenseCardId) {
    errors.push(
      createError(
        "CARD_NOT_IN_HAND",
        "Cannot use the same card as both weapon and defense",
        { field: "defenseCardId" }
      )
    );
  }

  return errors;
}

