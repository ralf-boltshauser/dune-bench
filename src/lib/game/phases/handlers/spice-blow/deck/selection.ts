import { type GameState } from "../../../../types";
import { type DeckType } from "../types";

/**
 * Get the deck for the specified deck type
 */
export function getDeck(state: GameState, deckType: DeckType): typeof state.spiceDeckA {
  return deckType === "A" ? state.spiceDeckA : state.spiceDeckB;
}

/**
 * Get the discard pile for the specified deck type
 */
export function getDiscardPile(
  state: GameState,
  deckType: DeckType
): typeof state.spiceDiscardA {
  return deckType === "A" ? state.spiceDiscardA : state.spiceDiscardB;
}

