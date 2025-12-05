import { type GameState, type SpiceCard } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type DeckType, type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { handleTurnOneWorm, handleNormalWorm } from "./handling";

/**
 * Handle Shai-Hulud (sandworm) card
 */
export function handleShaiHulud(
  state: GameState,
  card: SpiceCard,
  deckType: DeckType,
  context: SpiceBlowContext,
  events: PhaseEvent[],
  revealSpiceCard: (state: GameState, deckType: DeckType) => SpiceBlowStepResult
): SpiceBlowStepResult {
  // Store the deck type for later use if we need to continue after Fremen protection decision
  // Rule 1.02.02 - FIRST TURN: During the first turn's Spice Blow Phase only,
  // all Shai-Hulud cards Revealed are ignored, Set Aside, then reshuffled
  // back into the Spice deck after this Phase.
  // Rule 1.02.03 - NO NEXUS: There can not be a Nexus on Turn one for any reason.
  if (state.turn === 1) {
    return handleTurnOneWorm(state, card, deckType, context, events, revealSpiceCard);
  }

  // Normal Shai-Hulud handling (turn 2+)
  return handleNormalWorm(state, card, deckType, context, events, revealSpiceCard);
}

