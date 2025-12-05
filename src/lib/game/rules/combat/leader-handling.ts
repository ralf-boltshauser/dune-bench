/**
 * Leader-related logic.
 * Handles leader kill/capture logic and spice payouts.
 */

import { getLeaderDefinition } from "../../data";
import type { BattleSideResult, Faction } from "@/lib/game/types";

/**
 * Calculate spice payouts for killed leaders.
 */
export function calculateLeaderSpicePayouts(
  aggressorResult: BattleSideResult,
  defenderResult: BattleSideResult,
  winner: Faction
): { faction: Faction; amount: number; reason: string }[] {
  const payouts: { faction: Faction; amount: number; reason: string }[] = [];

  // Winner receives spice for all killed leaders (including their own)
  if (aggressorResult.leaderKilled && aggressorResult.leaderUsed) {
    const leader = getLeaderDefinition(aggressorResult.leaderUsed);
    if (leader) {
      payouts.push({
        faction: winner,
        amount: leader.strength,
        reason: `${leader.name} killed`,
      });
    }
  }

  if (defenderResult.leaderKilled && defenderResult.leaderUsed) {
    const leader = getLeaderDefinition(defenderResult.leaderUsed);
    if (leader) {
      payouts.push({
        faction: winner,
        amount: leader.strength,
        reason: `${leader.name} killed`,
      });
    }
  }

  return payouts;
}

