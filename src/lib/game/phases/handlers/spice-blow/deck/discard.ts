import { type GameState, type SpiceCard } from "../../../../types";
import { type DeckType } from "../types";

/**
 * Discard a spice card to the appropriate discard pile
 */
export function discardSpiceCard(
  state: GameState,
  card: SpiceCard,
  deckType: DeckType
): GameState {
  if (deckType === "A") {
    return {
      ...state,
      spiceDiscardA: [...state.spiceDiscardA, card],
    };
  } else {
    return {
      ...state,
      spiceDiscardB: [...state.spiceDiscardB, card],
    };
  }
}

