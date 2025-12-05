/**
 * Phase Transition Helpers
 * 
 * Functions for phase lifecycle management.
 */

import { logAction, setActiveFactions } from "../../../../state";
import { Phase, type GameState } from "../../../../types";
import { type PhaseEvent, type PhaseStepResult } from "../../../types";
import { createBiddingCompleteEvent } from "../events";

/**
 * End the bidding phase and transition to next phase.
 */
export function endBiddingPhase(
  state: GameState,
  events: PhaseEvent[]
): PhaseStepResult {
  // Note: PhaseManager emits PHASE_ENDED event, so we just emit our own completion marker
  events.push(createBiddingCompleteEvent());

  const finalState = logAction(setActiveFactions(state, []), "BIDDING_ENDED", null, {});
  return {
    state: finalState,
    phaseComplete: true,
    nextPhase: Phase.REVIVAL,
    pendingRequests: [],
    actions: [],
    events,
  };
}

