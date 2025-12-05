import { type GameState } from "../../../../types";
import { type DeckType, type SpiceBlowContext } from "../types";
import { getDiscardPile } from "./selection";

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Reshuffle discard pile back into deck
 */
export function reshuffleSpiceDeck(
  state: GameState,
  deckType: DeckType
): GameState {
  const discardPile = getDiscardPile(state, deckType);

  if (discardPile.length === 0) {
    return state;
  }

  const newDeck = shuffleDeck(discardPile);

  if (deckType === "A") {
    return {
      ...state,
      spiceDeckA: newDeck,
      spiceDiscardA: [],
    };
  } else {
    return {
      ...state,
      spiceDeckB: newDeck,
      spiceDiscardB: [],
    };
  }
}

/**
 * Split worms evenly between two decks for Turn 1 reshuffle
 */
export function splitWormsEvenly<T>(worms: T[]): { wormsForA: T[]; wormsForB: T[] } {
  const wormsForA = worms.filter((_, i) => i % 2 === 0);
  const wormsForB = worms.filter((_, i) => i % 2 === 1);
  return { wormsForA, wormsForB };
}

/**
 * Reshuffle Turn 1 set-aside worms back into both decks
 */
export function reshuffleTurnOneWorms(
  state: GameState,
  context: SpiceBlowContext
): GameState {
  if (context.turnOneWormsSetAside.length === 0) {
    return state;
  }

  const { wormsForA, wormsForB } = splitWormsEvenly(context.turnOneWormsSetAside);

  const newDeckA = shuffleDeck([...state.spiceDeckA, ...wormsForA]);
  const newDeckB = shuffleDeck([...state.spiceDeckB, ...wormsForB]);

  return {
    ...state,
    spiceDeckA: newDeckA,
    spiceDeckB: newDeckB,
  };
}

