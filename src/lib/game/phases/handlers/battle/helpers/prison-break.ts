/**
 * Prison Break Helper
 *
 * Per rules: "When all your own leaders have been killed, you must return all
 * captured leaders immediately to the players who last had them as an Active Leader."
 */

import { returnAllCapturedLeaders, shouldTriggerPrisonBreak } from "../../../../state";
import type { GameState, Faction } from "../../../../types";
import type { PhaseEvent } from "../../../types";

/**
 * Check if a faction should trigger Prison Break after a leader death.
 */
export function checkPrisonBreak(
  state: GameState,
  faction: Faction,
  events: PhaseEvent[]
): GameState {
  // Only check if this faction is in the game
  if (!state.factions.has(faction)) {
    return state;
  }

  // Check if Prison Break should trigger
  if (!shouldTriggerPrisonBreak(state, faction)) {
    return state;
  }

  // Trigger Prison Break - return all captured leaders
  const newState = returnAllCapturedLeaders(state, faction);

  events.push({
    type: "PRISON_BREAK",
    data: { faction },
    message: `Prison Break! All of ${faction}'s own leaders are dead. All captured leaders are returned to their original owners.`,
  });

  return newState;
}

