/**
 * Card type checking utilities.
 * Single source of truth for card type matching logic.
 */

import {
  getTreacheryCardDefinition,
  isCheapHero,
  isWorthless,
} from "../../../data";
import {
  getFactionState,
} from "../../../state";
import {
  TreacheryCardType,
  type BattlePlan,
  type GameState,
  type Faction,
  type TreacheryCardDefinition,
} from "@/lib/game/types";

/**
 * Card type for Voice command and validation purposes.
 */
export type CardType =
  | "poison_weapon"
  | "projectile_weapon"
  | "poison_defense"
  | "projectile_defense"
  | "worthless"
  | "cheap_hero"
  | "specific_weapon"
  | "specific_defense";

/**
 * Check if a card definition matches a card type.
 * Core matching logic - single source of truth.
 */
export function matchCardType(
  cardDef: TreacheryCardDefinition | null,
  cardType: CardType,
  specificCardName?: string
): boolean {
  if (!cardDef) return false;

  switch (cardType) {
    case "poison_weapon":
      return cardDef.type === TreacheryCardType.WEAPON_POISON;
    case "projectile_weapon":
      // Lasgun counts as projectile weapon for Voice purposes
      return (
        cardDef.type === TreacheryCardType.WEAPON_PROJECTILE ||
        cardDef.type === TreacheryCardType.WEAPON_SPECIAL
      );
    case "poison_defense":
      return cardDef.type === TreacheryCardType.DEFENSE_POISON;
    case "projectile_defense":
      return cardDef.type === TreacheryCardType.DEFENSE_PROJECTILE;
    case "worthless":
      return isWorthless(cardDef);
    case "cheap_hero":
      return isCheapHero(cardDef);
    case "specific_weapon":
      if (!specificCardName) return false;
      return (
        cardDef.name.toLowerCase() === specificCardName.toLowerCase() &&
        (cardDef.type === TreacheryCardType.WEAPON_PROJECTILE ||
          cardDef.type === TreacheryCardType.WEAPON_POISON ||
          cardDef.type === TreacheryCardType.WEAPON_SPECIAL)
      );
    case "specific_defense":
      if (!specificCardName) return false;
      return (
        cardDef.name.toLowerCase() === specificCardName.toLowerCase() &&
        (cardDef.type === TreacheryCardType.DEFENSE_PROJECTILE ||
          cardDef.type === TreacheryCardType.DEFENSE_POISON)
      );
    default:
      return false;
  }
}

/**
 * Check if a faction has a card of a specific type in their hand.
 */
export function hasCardTypeInHand(
  state: GameState,
  faction: Faction,
  cardType: CardType,
  specificCardName?: string
): boolean {
  const factionState = getFactionState(state, faction);

  for (const card of factionState.hand) {
    const def = getTreacheryCardDefinition(card.definitionId);
    if (!def) continue;

    if (matchCardType(def, cardType, specificCardName)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a battle plan uses a card of a specific type.
 */
export function planUsesCardType(
  plan: BattlePlan,
  cardType: CardType,
  specificCardName?: string
): boolean {
  // Check weapon card
  if (plan.weaponCardId) {
    const weaponDef = getTreacheryCardDefinition(plan.weaponCardId);
    if (weaponDef && matchCardType(weaponDef, cardType, specificCardName)) {
      return true;
    }
  }

  // Check defense card
  if (plan.defenseCardId) {
    const defenseDef = getTreacheryCardDefinition(plan.defenseCardId);
    if (defenseDef && matchCardType(defenseDef, cardType, specificCardName)) {
      return true;
    }
  }

  // Check cheap hero
  if (cardType === "cheap_hero" && plan.cheapHeroUsed) {
    return true;
  }

  return false;
}

