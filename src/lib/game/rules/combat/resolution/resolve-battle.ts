/**
 * Main battle resolution orchestration.
 */

import { getForceCountInTerritory } from "../../../state";
import type { BattlePlan, Faction, GameState, TerritoryId } from "@/lib/game/types";
import type { BattleResult } from "@/lib/game/types";
import {
  calculateForcesDialedStrength,
  calculateSpicedForceStrength,
  getLeaderStrength,
} from "../strength-calculation";
import { checkLasgunShieldExplosion, resolveWeaponDefense } from "../weapon-defense";
import { calculateLeaderSpicePayouts } from "../leader-handling";
import { buildSideResult } from "../loss-distribution";
import { resolveTraitorBattle } from "./resolve-traitor";
import { resolveLasgunShieldExplosion } from "./resolve-explosion";

/**
 * Resolve a complete battle between two factions.
 * Returns detailed results including winner, casualties, and card effects.
 *
 * @rule 1.07.06 - BATTLE RESOLUTION: The winner is the player with the higher total of number dialed on the Battle Wheel, plus their leader's fighting strength if applicable.
 * @rule 1.07.06.01 - NO TIES: In the case of a tie, the Aggressor wins the battle.
 */
export function resolveBattle(
  state: GameState,
  territoryId: TerritoryId,
  // NEW: sector is required for correct elite-force lookup in multi-sector territories
  sector: number,
  aggressor: Faction,
  defender: Faction,
  aggressorPlan: BattlePlan,
  defenderPlan: BattlePlan,
  traitorCalledBy: Faction | null = null,
  traitorTarget: string | null = null
): BattleResult {
  // Check for traitor first - this overrides everything
  if (traitorCalledBy && traitorTarget) {
    return resolveTraitorBattle(
      state,
      territoryId,
      aggressor,
      defender,
      aggressorPlan,
      defenderPlan,
      traitorCalledBy,
      traitorTarget
    );
  }

  // Resolve weapon/defense for each side
  const aggressorWeaponResult = resolveWeaponDefense(
    aggressorPlan.weaponCardId,
    defenderPlan.defenseCardId,
    defenderPlan.leaderId
  );
  const defenderWeaponResult = resolveWeaponDefense(
    defenderPlan.weaponCardId,
    aggressorPlan.defenseCardId,
    aggressorPlan.leaderId
  );

  // Check for lasgun/shield explosion
  const explosion = checkLasgunShieldExplosion(aggressorPlan, defenderPlan);
  if (explosion) {
    return resolveLasgunShieldExplosion(
      state,
      territoryId,
      aggressor,
      defender,
      aggressorPlan,
      defenderPlan
    );
  }

  // Calculate totals
  const aggressorLeaderStrength = aggressorWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(aggressorPlan);
  const defenderLeaderStrength = defenderWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(defenderPlan);

  // Calculate effective force strength (accounts for elite forces worth 2x)
  const aggressorBaseForceStrength = calculateForcesDialedStrength(
    state,
    aggressor,
    territoryId,
    sector,
    aggressorPlan.forcesDialed,
    defender
  );
  const defenderBaseForceStrength = calculateForcesDialedStrength(
    state,
    defender,
    territoryId,
    sector,
    defenderPlan.forcesDialed,
    aggressor
  );

  // Apply spice dialing (advanced rules) - Fremen always get full strength
  const aggressorForceStrength = calculateSpicedForceStrength(
    aggressor,
    aggressorBaseForceStrength,
    aggressorPlan.forcesDialed,
    aggressorPlan.spiceDialed,
    state.config.advancedRules
  );
  const defenderForceStrength = calculateSpicedForceStrength(
    defender,
    defenderBaseForceStrength,
    defenderPlan.forcesDialed,
    defenderPlan.spiceDialed,
    state.config.advancedRules
  );

  // Normalize totals defensively so downstream logic never sees NaN
  let aggressorTotal =
    aggressorForceStrength +
    aggressorLeaderStrength +
    (aggressorPlan.kwisatzHaderachUsed && !aggressorWeaponResult.leaderKilled
      ? 2
      : 0);
  let defenderTotal = defenderForceStrength + defenderLeaderStrength;

  if (!Number.isFinite(aggressorTotal)) {
    console.error(
      "[Battle] Non-finite aggressor total detected, normalizing to 0"
    );
    aggressorTotal = 0;
  }
  if (!Number.isFinite(defenderTotal)) {
    console.error(
      "[Battle] Non-finite defender total detected, normalizing to 0"
    );
    defenderTotal = 0;
  }

  // Determine winner (aggressor wins ties)
  const aggressorWins = aggressorTotal >= defenderTotal;
  const winner = aggressorWins ? aggressor : defender;
  const loser = aggressorWins ? defender : aggressor;

  // Get territory force counts for losers (they lose ALL forces)
  const aggressorForcesInTerritory = getForceCountInTerritory(state, aggressor, territoryId);
  const defenderForcesInTerritory = getForceCountInTerritory(state, defender, territoryId);

  // Build results
  const aggressorResult = buildSideResult(
    aggressor,
    aggressorPlan,
    aggressorWeaponResult,
    defenderWeaponResult,
    aggressorWins,
    aggressorTotal,
    aggressorForcesInTerritory
  );
  const defenderResult = buildSideResult(
    defender,
    defenderPlan,
    defenderWeaponResult,
    aggressorWeaponResult,
    !aggressorWins,
    defenderTotal,
    defenderForcesInTerritory
  );

  // Calculate spice payouts for killed leaders
  const spicePayouts = calculateLeaderSpicePayouts(
    aggressorResult,
    defenderResult,
    winner
  );

  const winnerTotal = aggressorWins ? aggressorTotal : defenderTotal;
  const loserTotal = aggressorWins ? defenderTotal : aggressorTotal;

  return {
    winner,
    loser,
    winnerTotal,
    loserTotal,
    traitorRevealed: false,
    traitorRevealedBy: null,
    lasgunjShieldExplosion: false,
    aggressorResult,
    defenderResult,
    spicePayouts,
    summary: `${winner} defeats ${loser} (${winnerTotal} vs ${loserTotal})`,
  };
}

