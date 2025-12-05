/**
 * Bidding Phase Helpers
 * 
 * Re-exports helper functions from the helpers subdirectory.
 * This file maintains backward compatibility.
 */

// Re-export all helper functions from the helpers subdirectory
export {
  isEligibleToBid,
  getEligibleBidders,
  getIneligibilityReason,
  isOpeningBid,
  calculateMinimumBid,
  getActiveBidders,
  shouldResolveAuction,
  getKaramaFlags,
  hasKaramaFreeCard,
  hasKaramaBidding,
  clearKaramaFlags,
  resetAuctionContext,
  updateBidContext,
  addPassedFaction,
  incrementCardIndex,
  markCardForReturn,
  getRemainingAuctionCards,
  returnCardsToDeckAndShuffle,
  endBiddingPhase,
} from "./helpers/index";

// Legacy exports for backward compatibility
export { isEligibleToBid as canBid } from "./helpers/index";

// BOUGHT-IN handling
import { logAction } from "../../../state";
import { type GameState } from "../../../types";
import { type PhaseEvent, type PhaseStepResult } from "../../types";
import { type BiddingContextWithCards } from "./types";
import {
  getRemainingAuctionCards,
  returnCardsToDeckAndShuffle,
  endBiddingPhase,
} from "./helpers/index";
import { createBoughtInEvent } from "./events";
import { logCardsReturned } from "./logging";

/**
 * Handle BOUGHT-IN rule: When all players pass on a card, return ALL remaining
 * cards to deck and end bidding immediately.
 * @rule 1.04.09
 * Rule 1.04.09: "When a face down Treachery card is passed on by everyone, all
 * remaining cards are returned to the top of the Treachery Deck in the order they
 * were dealt out and bidding on face down Treachery Cards is over."
 */
export function handleBoughtIn(
  context: BiddingContextWithCards,
  state: GameState,
  events: PhaseEvent[]
): PhaseStepResult {
  // Get all remaining cards (current card + all cards after it)
  const remainingCards = getRemainingAuctionCards(context);

  logCardsReturned(remainingCards.length, "BOUGHT-IN rule");

  // Return all remaining cards to deck in the order they were dealt
  // Rule says "in the order they were dealt out"
  // Note: Despite the rule saying "to the top", we shuffle the entire deck for gameplay balance
  let newState = returnCardsToDeckAndShuffle(state, remainingCards);

  events.push(
    createBoughtInEvent(
      remainingCards.length,
      remainingCards.map((c) => c.definitionId)
    )
  );

  newState = logAction(newState, "CARDS_RETURNED_TO_DECK", null, {
    cardsReturned: remainingCards.length,
  });

  // End bidding phase immediately
  return endBiddingPhase(newState, events);
}

