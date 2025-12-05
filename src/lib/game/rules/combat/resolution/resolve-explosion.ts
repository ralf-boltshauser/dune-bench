/**
 * Lasgun/shield explosion battle resolution.
 */

import { getForceCountInTerritory } from "../../../state";
import type { BattlePlan, Faction, GameState, TerritoryId } from "@/lib/game/types";
import type { BattleResult } from "@/lib/game/types";
import { createTotalLossSideResult } from "./helpers";

/**
 * Resolve a lasgun/shield explosion - both sides lose everything.
 */
export function resolveLasgunShieldExplosion(
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
    winner: aggressor, // Technically no winner, but aggressor listed
    loser: defender,
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: false,
    traitorRevealedBy: null,
    lasgunjShieldExplosion: true,
    aggressorResult,
    defenderResult,
    spicePayouts: [], // No spice paid for leaders in explosion
    summary:
      "LASGUN/SHIELD EXPLOSION! Both sides lose all forces and leaders. No spice paid.",
  };
}

