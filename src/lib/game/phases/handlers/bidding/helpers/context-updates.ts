/**
 * Context Update Helpers
 * 
 * Immutable context update functions.
 */

import { Faction, type GameState } from "../../../../types";
import { type BiddingContextWithCards } from "../types";

/**
 * Reset auction context for a new auction.
 * 
 * ARCHITECTURAL NOTE: atreidesPeekedCards Set is preserved (not reset) to maintain
 * peek history across auction restarts. This prevents duplicate peek requests.
 */
export function resetAuctionContext(
  context: BiddingContextWithCards,
  startingBidder: Faction
): BiddingContextWithCards {
  return {
    ...context,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder,
    // Preserve atreidesPeekedCards - don't reset it, as it tracks which cards have been peeked
    // This prevents duplicate peek requests if startNextAuction is called multiple times
  };
}

/**
 * Update context with a new bid.
 */
export function updateBidContext(
  context: BiddingContextWithCards,
  bidder: Faction,
  amount: number
): BiddingContextWithCards {
  return {
    ...context,
    currentBid: amount,
    highBidder: bidder,
  };
}

/**
 * Add a faction to the passed set.
 */
export function addPassedFaction(
  context: BiddingContextWithCards,
  faction: Faction
): BiddingContextWithCards {
  const newPassedFactions = new Set(context.passedFactions);
  newPassedFactions.add(faction);
  return {
    ...context,
    passedFactions: newPassedFactions,
  };
}

/**
 * Increment card index to move to next auction.
 * 
 * ARCHITECTURAL NOTE: atreidesPeekedCards Set is preserved - it tracks all cards
 * that have been peeked at, so we don't reset it when moving to a new card.
 * Each card index is tracked separately, so there's no need to reset.
 */
export function incrementCardIndex(
  context: BiddingContextWithCards
): BiddingContextWithCards {
  return {
    ...context,
    currentCardIndex: context.currentCardIndex + 1,
    // atreidesPeekedCards is preserved - it tracks which specific cards have been peeked
  };
}

/**
 * Mark card for return to deck.
 */
export function markCardForReturn(
  context: BiddingContextWithCards,
  cardDefinitionId: string
): BiddingContextWithCards {
  const cardsToReturn = context.cardsToReturnToDeck ?? [];
  if (!cardsToReturn.includes(cardDefinitionId)) {
    return {
      ...context,
      cardsToReturnToDeck: [...cardsToReturn, cardDefinitionId],
    };
  }
  return context;
}

