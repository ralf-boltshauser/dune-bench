/**
 * Shared helpers for battle resolution.
 */

import type { BattlePlan, BattleSideResult, Faction } from "@/lib/game/types";

/**
 * Create a side result where all forces and leader are lost.
 */
export function createTotalLossSideResult(
  faction: Faction,
  plan: BattlePlan,
  forcesLost: number
): BattleSideResult {
  return {
    faction,
    forcesDialed: plan.forcesDialed,
    forcesLost,
    leaderUsed: plan.leaderId,
    leaderKilled: !!plan.leaderId,
    leaderStrength: 0,
    kwisatzHaderachUsed: plan.kwisatzHaderachUsed,
    weaponPlayed: plan.weaponCardId,
    weaponEffective: false,
    defensePlayed: plan.defenseCardId,
    defenseEffective: false,
    cardsToDiscard: [
      plan.weaponCardId,
      plan.defenseCardId,
    ].filter((c): c is string => !!c),
    cardsToKeep: [],
    total: 0,
  };
}

