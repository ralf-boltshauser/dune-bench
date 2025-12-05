/**
 * Battle Phase Cleanup
 *
 * Handles cleanup after battle phase completes.
 */

import { Faction, LeaderLocation } from "../../../../types";
import {
  getFactionState,
  resetLeaderTurnState,
  returnAllCapturedLeaders,
  returnCapturedLeader,
  shouldTriggerPrisonBreak,
} from "../../../../state";
import type { GameState } from "../../../../types";

/**
 * Cleanup the battle phase.
 *
 * @rule 1.07.07 - LEADER RETURN: After all battles have been fought, players collect any of their leaders used in battle still in Territories adding them to their Leader Pool.
 */
export function cleanupBattlePhase(state: GameState): GameState {
  // Reset all leaders' used state
  let newState = state;
  for (const faction of Array.from(state.factions.keys())) {
    newState = resetLeaderTurnState(newState, faction);
  }

  // @rule 2.05.10.03 - Return captured leaders that were used in battle this turn
  // Per rules: "After it is used in a battle, if it wasn't killed during that battle,
  // the leader is returned to the Active Leader Pool of the player who last had it."
  if (newState.factions.has(Faction.HARKONNEN)) {
    const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
    const capturedLeadersUsed = harkonnenState.leaders.filter(
      (l) =>
        l.capturedBy !== null &&
        l.usedThisTurn &&
        l.location !== LeaderLocation.TANKS_FACE_UP &&
        l.location !== LeaderLocation.TANKS_FACE_DOWN
    );

    for (const leader of capturedLeadersUsed) {
      newState = returnCapturedLeader(newState, leader.definitionId);
    }
  }

  // @rule 2.05.11 - Check for Prison Break
  // Per rules: "When all your own leaders have been killed, you must return all
  // captured leaders immediately to the players who last had them as an Active Leader."
  if (newState.factions.has(Faction.HARKONNEN)) {
    if (shouldTriggerPrisonBreak(newState, Faction.HARKONNEN)) {
      newState = returnAllCapturedLeaders(newState, Faction.HARKONNEN);
    }
  }

  return newState;
}

