/**
 * Card Management Helpers
 * 
 * Functions for managing auction cards and deck operations.
 */

import { shuffle } from "../../../../state/factory";
import { type GameState, type TreacheryCard } from "../../../../types";
import { type BiddingContextWithCards } from "../types";

/**
 * Get all remaining auction cards from the current index onwards.
 * Used when returning cards to deck (BOUGHT-IN rule or no eligible bidders).
 */
export function getRemainingAuctionCards(
  context: BiddingContextWithCards
): TreacheryCard[] {
  const remainingCards: TreacheryCard[] = [];
  for (
    let i = context.currentCardIndex;
    i < (context.auctionCards?.length ?? 0);
    i++
  ) {
    const card = context.auctionCards?.[i];
    if (card) {
      remainingCards.push(card);
    }
  }
  return remainingCards;
}

/**
 * Add cards to the treachery deck and shuffle the entire deck.
 * Returns the updated game state with shuffled deck.
 */
export function returnCardsToDeckAndShuffle(
  state: GameState,
  cards: TreacheryCard[]
): GameState {
  const newDeck = [...state.treacheryDeck, ...cards];
  const shuffledDeck = shuffle(newDeck);
  return { ...state, treacheryDeck: shuffledDeck };
}

