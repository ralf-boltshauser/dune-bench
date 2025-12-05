/**
 * Two traitors battle resolution.
 */

import { getForceCountInTerritory } from "../../../state";
import type { BattlePlan, Faction, GameState, TerritoryId } from "@/lib/game/types";
import type { BattleResult } from "@/lib/game/types";
import { createTotalLossSideResult } from "./helpers";

/**
 * Resolve a battle where BOTH leaders are traitors (TWO TRAITORS rule).
 * Both players lose everything, neither receives spice.
 *
 * @rule 1.07.06.07.03 - TWO TRAITORS: When both leaders are traitors (each a traitor for the opponent), both players' Forces in the Territory, their cards played, and their leaders, are lost. Neither player receives any spice.
 */
export function resolveTwoTraitorsBattle(
  state: GameState,
  territoryId: TerritoryId,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan
): BattleResult {
  const aggressorForces = getForceCountInTerritory(
    state,
    aggressor,
    territoryId
  );
  const defenderForces = getForceCountInTerritory(state, defender, territoryId);

  // Both sides lose ALL forces
  const aggressorResult = createTotalLossSideResult(
    aggressor,
    aggressorPlan,
    aggressorForces
  );

  const defenderResult = createTotalLossSideResult(
    defender,
    defenderPlan,
    defenderForces
  );

  return {
    winner: null, // Special case - no winner
    loser: null, // Special case - no loser
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: true,
    traitorRevealedBy: null, // Both revealed, so null
    lasgunjShieldExplosion: false,
    twoTraitors: true, // New flag to indicate TWO TRAITORS scenario
    aggressorResult,
    defenderResult,
    spicePayouts: [], // NO spice for anyone
    summary:
      "TWO TRAITORS! Both leaders are traitors. Both sides lose all forces and leaders. No spice paid.",
  };
}

