/**
 * End Battle Phase Helper
 */

import { Phase } from "../../../../types";
import { setActiveFactions } from "../../../../state";
import type { GameState } from "../../../../types";
import type { PhaseEvent, PhaseStepResult } from "../../../types";

/**
 * End the battle phase.
 */
export function endBattlePhase(
  state: GameState,
  events: PhaseEvent[]
): PhaseStepResult {
  // Note: PhaseManager emits PHASE_ENDED event, so we just signal completion
  events.push({
    type: "BATTLES_COMPLETE",
    data: { phase: Phase.BATTLE },
    message: "All battles resolved",
  });

  const finalState = setActiveFactions(state, []);

  return {
    state: finalState,
    phaseComplete: true,
    nextPhase: Phase.SPICE_COLLECTION,
    pendingRequests: [],
    actions: [],
    events,
  };
}

