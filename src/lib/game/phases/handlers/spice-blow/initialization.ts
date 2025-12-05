import { type GameState } from "../../../types";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "./types";
import { createInitialContext } from "./context";
import { SpiceBlowLogger } from "./utils/logger";

/**
 * Log phase start information
 */
export function logPhaseStart(state: GameState): void {
  SpiceBlowLogger.phaseStart(state);
}

/**
 * Check if Card B should be revealed (Advanced Rules - Double Spice Blow)
 */
export function shouldRevealCardB(state: GameState, context: SpiceBlowContext): boolean {
  // Double Spice Blow (Rule 1.13.02): In Advanced Rules, reveal a second card
  // "DOUBLE SPICE BLOW: After 1.02.01 another Spice Card will be Revealed
  // creating a second Spice Card discard pile"
  return state.config.advancedRules && !context.cardBRevealed;
}

/**
 * Initialize the spice blow phase
 */
export function initializePhase(
  state: GameState,
  revealSpiceCardFn: (state: GameState, deckType: "A" | "B") => SpiceBlowStepResult
): SpiceBlowStepResult {
  const context = createInitialContext();
  logPhaseStart(state);

  // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

  // Start by revealing Card A
  const cardResult = revealSpiceCardFn(state, "A");
  return {
    ...cardResult,
    events: cardResult.events || [],
  };
}

