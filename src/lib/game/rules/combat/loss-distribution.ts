/**
 * Force loss and card distribution logic.
 * Handles calculating force losses and determining which cards to keep/discard.
 */

import { getTreacheryCardDefinition } from "../../data";
import type { BattlePlan, BattleSideResult, Faction } from "@/lib/game/types";
import type { WeaponDefenseResult } from "./types";
import { getLeaderStrength } from "./strength-calculation";

/**
 * Build the result for one side of the battle.
 * 
 * @param faction The faction for this side
 * @param plan The battle plan for this side
 * @param myWeaponResult Weapon/defense result for this side's weapon
 * @param opponentWeaponResult Weapon/defense result for opponent's weapon
 * @param isWinner Whether this side won the battle
 * @param total The total battle strength for this side
 * @param territoryForceCount The total number of forces this faction has in the territory (for losers)
 */
export function buildSideResult(
  faction: Faction,
  plan: BattlePlan,
  myWeaponResult: WeaponDefenseResult,
  opponentWeaponResult: WeaponDefenseResult,
  isWinner: boolean,
  total: number,
  territoryForceCount?: number
): BattleSideResult {
  const leaderKilled = opponentWeaponResult.leaderKilled;
  // Winner loses only dialed forces, loser loses ALL forces in territory
  // Rule: "The losing player loses all the Forces they had in the Territory" (battle.md line 24)
  const forcesLost = isWinner 
    ? plan.forcesDialed 
    : (territoryForceCount ?? plan.forcesDialed); // Fallback to dialed if not provided (for backward compatibility)

  // Determine which cards to keep/discard
  const cardsToDiscard: string[] = [];
  const cardsToKeep: string[] = [];

  if (plan.weaponCardId) {
    const weaponDef = getTreacheryCardDefinition(plan.weaponCardId);
    if (!isWinner || weaponDef?.discardAfterUse) {
      cardsToDiscard.push(plan.weaponCardId);
    } else {
      cardsToKeep.push(plan.weaponCardId);
    }
  }

  if (plan.defenseCardId) {
    const defenseDef = getTreacheryCardDefinition(plan.defenseCardId);
    if (!isWinner || defenseDef?.discardAfterUse) {
      cardsToDiscard.push(plan.defenseCardId);
    } else {
      cardsToKeep.push(plan.defenseCardId);
    }
  }

  return {
    faction,
    forcesDialed: plan.forcesDialed,
    forcesLost,
    leaderUsed: plan.leaderId,
    leaderKilled,
    leaderStrength: leaderKilled ? 0 : getLeaderStrength(plan),
    kwisatzHaderachUsed: plan.kwisatzHaderachUsed,
    weaponPlayed: plan.weaponCardId,
    weaponEffective: myWeaponResult.weaponEffective,
    defensePlayed: plan.defenseCardId,
    defenseEffective: opponentWeaponResult.defenseEffective,
    cardsToDiscard,
    cardsToKeep,
    total,
  };
}

