/**
 * Auction Event Creation
 * 
 * Centralized event creation for auction-related events.
 */

import { Faction, type GameState } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type BiddingContextWithCards } from "../types";

/**
 * Create an AUCTION_STARTED event.
 */
export function createAuctionStartedEvent(
  context: BiddingContextWithCards
): PhaseEvent {
  return {
    type: "AUCTION_STARTED",
    data: {
      cardIndex: context.currentCardIndex + 1,
      totalCards: context.cardsForAuction.length,
      startingBidder: context.startingBidder,
      // Card identity is secret - only Atreides can see it
    },
    message: `Auction ${context.currentCardIndex + 1}/${
      context.cardsForAuction.length
    }: Treachery Card (starting bidder: ${context.startingBidder})`,
  };
}

/**
 * Create a CARD_RETURNED_TO_DECK event.
 */
export function createCardReturnedEvent(
  cardIndex: number,
  reason: string,
  cardsReturned?: number
): PhaseEvent {
  return {
    type: "CARD_RETURNED_TO_DECK",
    data: {
      cardIndex,
      reason,
      cardsReturned,
    },
    message: reason === "no_eligible_bidders"
      ? `No eligible bidders - returning ${cardsReturned ?? 1} remaining card(s) to deck`
      : `Card returned to deck (${reason})`,
  };
}

/**
 * Create a CARD_BOUGHT_IN event.
 */
export function createBoughtInEvent(
  cardsReturned: number,
  cardIds: string[]
): PhaseEvent {
  return {
    type: "CARD_BOUGHT_IN",
    data: {
      cardsReturned,
      cardIds,
    },
    message: `BOUGHT-IN: All ${cardsReturned} remaining card(s) returned to deck. Bidding ends.`,
  };
}

