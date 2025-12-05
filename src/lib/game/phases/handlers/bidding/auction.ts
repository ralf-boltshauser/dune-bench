/**
 * Auction Management
 * 
 * Handles starting auctions, eligibility checking, and Atreides prescience.
 * 
 * Rules:
 * - 1.04.06: Starting bidder determination
 * - 1.04.07: Subsequent auction starting bidder
 * - 2.01.05: Atreides prescience (peek before bidding)
 */

import { getTreacheryCardDefinition } from "../../../data";
import { createAtreidesBiddingPeekRequest } from "../../../faction-abilities";
import { getFactionMaxHandSize, getFactionState } from "../../../state";
import { Faction, type GameState } from "../../../types";
import { type AgentRequest, type PhaseEvent, type PhaseStepResult } from "../../types";
import { type BiddingContextWithCards } from "./types";
import {
  getEligibleBidders,
  isEligibleToBid,
  getIneligibilityReason,
  getRemainingAuctionCards,
  returnCardsToDeckAndShuffle,
  endBiddingPhase,
  resetAuctionContext,
} from "./helpers";
import { createAuctionStartedEvent, createCardReturnedEvent } from "./events";
import {
  logEligibilityCheck,
  logAuctionStart,
  logAtreidesPeek,
  logNoEligibleBidders,
  logError,
} from "./logging";

/**
 * Start the next auction for the current card.
 * 
 * Handles:
 * - Resetting auction state
 * - Checking eligibility
 * - Determining starting bidder (Rules 1.04.06, 1.04.07)
 * - Atreides prescience peek request (Rule 2.01.05)
 */
export function startNextAuction(
  context: BiddingContextWithCards,
  state: GameState,
  events: PhaseEvent[],
  biddingOrder: Faction[],
  currentBidderIndex: number
): {
  context: BiddingContextWithCards;
  result: PhaseStepResult;
  currentBidderIndex: number;
} {
  // Reset auction state
  // Note: We need to determine starting bidder first, then reset context
  // So we'll reset after determining starting bidder

  // Check who is eligible to bid on this card (hand not full)
  const eligibleBidders = getEligibleBidders(state, context, biddingOrder);

  // Build eligibility map for logging
  const eligibilityMap = new Map<
    Faction,
    { handSize: number; maxHand: number; isEligible: boolean; reason?: "full_hand" | "insufficient_spice" }
  >();
  for (const faction of biddingOrder) {
    const factionState = getFactionState(state, faction);
    const maxHand = getFactionMaxHandSize(faction);
    const isEligible = isEligibleToBid(state, faction, context);
    const reason = isEligible ? undefined : getIneligibilityReason(state, faction, context);
    eligibilityMap.set(faction, {
      handSize: factionState.hand.length,
      maxHand,
      isEligible,
      reason,
    });
  }
  logEligibilityCheck(context, biddingOrder, eligibilityMap);

  if (eligibleBidders.length === 0) {
    // No one can bid - all hands are full
    logNoEligibleBidders();

    // Return all remaining cards to deck (including current card)
    const remainingCards = getRemainingAuctionCards(context);

    if (remainingCards.length > 0) {
      const newState = returnCardsToDeckAndShuffle(state, remainingCards);

      events.push(
        createCardReturnedEvent(
          context.currentCardIndex,
          "no_eligible_bidders",
          remainingCards.length
        )
      );

      return {
        context,
        result: endBiddingPhase(newState, events),
        currentBidderIndex: 0,
      };
    }

    return {
      context,
      result: endBiddingPhase(state, events),
      currentBidderIndex: 0,
    };
  }

  // Rule 1.04.06: "The bidding is started by the First Player. If that player is not eligible to bid
  // the next player to the right who is eligible opens the bidding."
  // Rule 1.04.07: "In subsequent bidding during this Phase, the first eligible player, to the right
  // of the player who opened the bid for the previous card, begins the bidding for the next card."

  // For first card: Start with First Player (stormOrder[0])
  // For subsequent cards: Start with first eligible to the right of previous opener
  let startIdx: number;
  if (context.currentCardIndex === 0) {
    // @rule 1.04.06
    // First card: Start with First Player
    startIdx = biddingOrder.findIndex((f) => isEligibleToBid(state, f, context));
  } else {
    // @rule 1.04.07
    // Subsequent cards: Start with first eligible to the right of previous opener
    const previousOpener = context.startingBidder;
    const previousOpenerIdx = biddingOrder.indexOf(previousOpener);

    // Find first eligible starting from the right of previous opener
    startIdx = -1;
    for (let i = 1; i <= biddingOrder.length; i++) {
      const idx = (previousOpenerIdx + i) % biddingOrder.length;
      if (isEligibleToBid(state, biddingOrder[idx], context)) {
        startIdx = idx;
        break;
      }
    }
  }

  if (startIdx === -1) {
    // This shouldn't happen since we checked eligibleBidders.length above,
    // but handle it just in case
    logError("startIdx is -1 but eligibleBidders.length > 0", {
      eligibleBidders: eligibleBidders.length,
      currentCardIndex: context.currentCardIndex,
    });
    context.currentCardIndex++;
    if (context.currentCardIndex >= context.cardsForAuction.length) {
      return {
        context,
        result: endBiddingPhase(state, events),
        currentBidderIndex: 0,
      };
    }
    return startNextAuction(context, state, events, biddingOrder, 0);
  }

  const newCurrentBidderIndex = startIdx;
  const startingBidder = biddingOrder[startIdx]; // Track who opens this auction

  // Reset auction context with new starting bidder
  // Note: atreidesPeekedCards Set is preserved (not reset) to maintain peek history
  const resetContext = resetAuctionContext(context, startingBidder);

  const cardId = resetContext.cardsForAuction[resetContext.currentCardIndex];
  const cardDef = getTreacheryCardDefinition(cardId);

  logAuctionStart(resetContext, cardDef?.name);

  // @rule 1.04.05
  // Don't reveal card name publicly - only Atreides knows via Prescience
  events.push(createAuctionStartedEvent(resetContext));

  // Rule 2.01.05: Atreides BIDDING ability - "During the Bidding Phase when a Treachery Card
  // comes up for purchase, you may look at it before any faction bids on it."
  // Notify Atreides of the card BEFORE bidding starts, regardless of bidding order
  const pendingRequests: AgentRequest[] = [];
  
  // ARCHITECTURAL SAFEGUARD: createAtreidesBiddingPeekRequest is now idempotent
  // It checks internally if the card was already peeked, preventing duplicate requests
  const peekResult = createAtreidesBiddingPeekRequest(
    {
      state,
      cardId,
      auctionNumber: resetContext.currentCardIndex + 1,
      totalAuctions: resetContext.cardsForAuction.length,
      startingBidder: startingBidder, // Use the newly calculated startingBidder, not context.startingBidder
    },
    resetContext.currentCardIndex,
    resetContext.atreidesPeekedCards
  );

  if (peekResult.shouldTrigger && peekResult.request) {
    pendingRequests.push(peekResult.request);

    logAtreidesPeek(cardDef?.name);

    // Mark that Atreides has seen this card (idempotent - Set.add won't duplicate)
    resetContext.atreidesPeekedCards.add(resetContext.currentCardIndex);
  }

  // If Atreides needs to peek, return with the peek request first
  // The orchestrator will handle the response, then we'll proceed with bidding
  if (pendingRequests.length > 0) {
    return {
      context: resetContext,
      result: {
        state,
        phaseComplete: false,
        pendingRequests,
        actions: [],
        events,
      },
      currentBidderIndex: newCurrentBidderIndex,
    };
  }

  // No Atreides in game, return to main handler to proceed with bidding
  // The main handler will call requestNextBid to avoid circular dependency
  return {
    context: resetContext,
    result: {
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    },
    currentBidderIndex: newCurrentBidderIndex,
  };
}

