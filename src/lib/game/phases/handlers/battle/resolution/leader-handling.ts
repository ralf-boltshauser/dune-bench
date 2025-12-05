/**
 * Leader Handling
 *
 * Handles leader deaths from weapons, leader usage, and Kwisatz Haderach usage.
 */

import { Faction } from "../../../../types";
import {
  getTargetFactionForLeaderKill,
  killLeader,
  markKwisatzHaderachUsed,
  markLeaderUsed,
  returnLeaderToPool,
} from "../../../../state";
import { checkPrisonBreak } from "../helpers/prison-break";
import type { GameState } from "../../../../types";
import type { CurrentBattle, PhaseEvent } from "../../../types";
import type { BattleResult } from "../../../../rules/types";

/**
 * Apply leader handling (deaths, usage, returns).
 *
 * @rule 1.07.06.03 - KILLED LEADERS: Any leaders killed are immediately Placed face up in the Tleilaxu Tanks. The winner immediately receives their value (including their own leader, if killed) in spice from the Spice Bank.
 * @rule 1.07.06.04 - SURVIVING LEADERS: Leaders who survive remain in the Territory where they were used. (Game effects do not kill these leaders while there.) These are not part of the Leader Pool until Leader Return [1.07.07].
 */
export function applyLeaderHandling(
  state: GameState,
  battle: CurrentBattle,
  result: BattleResult,
  events: PhaseEvent[]
): GameState {
  let newState = state;

  // ===========================================================================
  // LEADER DEATHS FROM WEAPONS
  // ===========================================================================
  // IMPORTANT: Leaders can ONLY die from weapons (or lasgun-shield explosion), NOT from losing the battle.
  // The resolveBattle function in combat.ts correctly calculates leaderKilled flags based on
  // weapon/defense resolution. We handle both sides' leader deaths here, regardless of who won.
  // Dead leaders don't contribute to battle strength (already accounted for in resolveBattle).

  // Handle aggressor's leader death from weapons
  if (result.aggressorResult.leaderKilled && battle.aggressorPlan?.leaderId) {
    // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
    const targetFaction = getTargetFactionForLeaderKill(
      newState,
      battle.aggressor,
      battle.aggressorPlan.leaderId
    );
    newState = killLeader(
      newState,
      targetFaction,
      battle.aggressorPlan.leaderId,
      true // allowProtected: true for weapon kills
    );
    events.push({
      type: "LEADER_KILLED",
      data: {
        faction: battle.aggressor,
        leaderId: battle.aggressorPlan.leaderId,
        killedBy: "weapon",
      },
      message: `${battle.aggressor}'s leader ${battle.aggressorPlan.leaderId} killed by weapon`,
    });

    // Check for Prison Break after leader death
    newState = checkPrisonBreak(newState, battle.aggressor, events);
  }

  // Handle defender's leader death from weapons
  if (result.defenderResult.leaderKilled && battle.defenderPlan?.leaderId) {
    // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
    const targetFaction = getTargetFactionForLeaderKill(
      newState,
      battle.defender,
      battle.defenderPlan.leaderId
    );
    newState = killLeader(
      newState,
      targetFaction,
      battle.defenderPlan.leaderId,
      true // allowProtected: true for weapon kills
    );
    events.push({
      type: "LEADER_KILLED",
      data: {
        faction: battle.defender,
        leaderId: battle.defenderPlan.leaderId,
        killedBy: "weapon",
      },
      message: `${battle.defender}'s leader ${battle.defenderPlan.leaderId} killed by weapon`,
    });

    // Check for Prison Break after leader death
    newState = checkPrisonBreak(newState, battle.defender, events);
  }

  // Mark leaders as used (unless traitor was revealed - winner's leader returns to pool)
  const winner = result.winner;
  if (!winner) {
    return newState;
  }
  const winnerPlan =
    winner === battle.aggressor ? battle.aggressorPlan : battle.defenderPlan;
  if (winnerPlan?.leaderId) {
    if (result.traitorRevealed) {
      // Winner's leader returns to pool immediately per traitor rules
      newState = returnLeaderToPool(newState, winner, winnerPlan.leaderId);
      events.push({
        type: "LEADER_RETURNED",
        data: { faction: winner, leaderId: winnerPlan.leaderId },
        message: `${winner}'s leader returns to pool after traitor reveal`,
      });
    } else {
      newState = markLeaderUsed(
        newState,
        winner,
        winnerPlan.leaderId,
        battle.territoryId
      );
    }
  }

  // Mark Kwisatz Haderach as used if applicable
  // Rule: "One time use abilities may be considered not used for this instance (Ex: Kwisatz Haderach, Captured leaders)."
  // When traitor is revealed, one-time abilities are NOT used.
  if (
    winnerPlan?.kwisatzHaderachUsed &&
    winner === Faction.ATREIDES &&
    !result.traitorRevealed
  ) {
    newState = markKwisatzHaderachUsed(newState, battle.territoryId);
    events.push({
      type: "KWISATZ_HADERACH_USED",
      data: { territory: battle.territoryId },
      message: "Atreides uses Kwisatz Haderach (+2 strength)",
    });
  }

  return newState;
}

