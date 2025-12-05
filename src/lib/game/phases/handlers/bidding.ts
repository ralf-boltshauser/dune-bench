/**
 * Bidding Phase Handler
 *
 * Phase 1.04: Bidding
 * - Players declare hand size
 * - Cards are auctioned in storm order
 * - Atreides can see the next card (prescience)
 * - Harkonnen gets a free card at end
 * - Bidding money goes to Emperor (or bank)
 */

import { createCardPeekedEvent, isAtreidesPeekAcknowledgment } from "../../faction-abilities";
import { Faction, Phase, type GameState } from "../../types";
import {
  type AgentResponse,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "../types";
import { logAction } from "../../state";
import {
  initializeBiddingPhase,
} from "./bidding/initialization";
import {
  startNextAuction,
} from "./bidding/auction";
import {
  processBid,
  requestNextBid,
} from "./bidding/bid-processing";
import {
  resolveAuction,
} from "./bidding/resolution";
import {
  getActiveBidders,
  shouldResolveAuction,
  endBiddingPhase,
  getRemainingAuctionCards,
  returnCardsToDeckAndShuffle,
} from "./bidding/helpers";
import { logBidPassed } from "./bidding/logging";
import { type BiddingContextWithCards } from "./bidding/types";

// =============================================================================
// BIDDING PHASE HANDLER
// =============================================================================

export class BiddingPhaseHandler implements PhaseHandler {
  readonly phase = Phase.BIDDING;

  private context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesPeekedCards: new Set(), // Track which card indices Atreides has peeked at
    auctionCards: [],
  };

  private currentBidderIndex = 0;
  private biddingOrder: Faction[] = [];

  initialize(state: GameState): PhaseStepResult {
    this.biddingOrder = [...state.stormOrder];

    const initResult = initializeBiddingPhase(
      this.context,
      state,
      this.biddingOrder
    );

    this.context = initResult.context;
    const result = initResult.result;

    // If initialization started an auction without a peek request (no Atreides),
    // we need to immediately proceed to bidding
    if (
      !result.phaseComplete &&
      result.pendingRequests.length === 0 &&
      this.context.cardsForAuction.length > 0
    ) {
      // Start bidding for the first auction
      const bidResult = requestNextBid(
        this.context,
        result.state,
        result.events,
        this.biddingOrder,
        0
      );
      this.context = bidResult.context;
      this.currentBidderIndex = bidResult.currentBidderIndex;
      return bidResult.result;
    }

    return result;
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;
    let atreidesPeeked = false;

    // Process responses
    for (const response of responses) {
      // Handle Atreides PEEK_CARD response (informational - they've seen the card)
      const isAuctionStart =
        this.context.currentBid === 0 && this.context.highBidder === null;
      if (isAtreidesPeekAcknowledgment(response, isAuctionStart)) {
        atreidesPeeked = true;
        events.push(createCardPeekedEvent(this.context.currentCardIndex + 1));
        // Mark that Atreides has peeked at this card (idempotent - Set.add won't duplicate)
        this.context.atreidesPeekedCards.add(this.context.currentCardIndex);
        // Continue to bidding - no state change needed for peek
        continue;
      }

      // Check for bid action (tool is called 'place_bid' -> 'PLACE_BID')
      if (
        response.actionType === "BID" ||
        response.actionType === "PLACE_BID"
      ) {
        const result = processBid(
          this.context,
          newState,
          response,
          this.biddingOrder,
          this.currentBidderIndex
        );
        this.context = result.context;
        newState = result.state;
        this.currentBidderIndex = result.currentBidderIndex;
        events.push(...result.events);
      } else if (
        response.actionType === "PASS" ||
        response.actionType === "PASS_BID" ||
        response.passed
      ) {
        // Only add to passedFactions if this is a bid pass (not a peek acknowledgment)
        // We've already handled peek acknowledgments above
        if (!atreidesPeeked || response.factionId !== Faction.ATREIDES) {
          this.context.passedFactions.add(response.factionId);
          logBidPassed(response.factionId);
          events.push({
            type: "BID_PASSED",
            data: { faction: response.factionId },
            message: `${response.factionId} passes`,
          });
        }
      }
    }

    // If Atreides just peeked, proceed to bidding
    if (atreidesPeeked) {
      return this.continueBidding(newState, events);
    }

    // Check if auction is resolved
    const activeBidders = getActiveBidders(newState, this.context, this.biddingOrder);

    // Auction resolves when high bidder wins
    // IMPORTANT: This must be checked BEFORE checking for no active bidders,
    // because if there's a high bidder and no active bidders, the high bidder wins
    if (shouldResolveAuction(this.context, activeBidders)) {
      return this.resolveCurrentAuction(newState, events);
    }

    // If no active bidders AND no high bidder, continue bidding (BOUGHT-IN is handled in requestNextBid)
    // Note: If there's a high bidder but no active bidders, shouldResolveAuction should have returned true above
    if (activeBidders.length === 0 && this.context.highBidder === null) {
      return this.continueBidding(newState, events);
    }

    // Continue bidding
    return this.continueBidding(newState, events);
  }

  /**
   * Continue bidding process - request next bid or resolve auction.
   */
  private continueBidding(state: GameState, events: PhaseEvent[]): PhaseStepResult {
    const bidResult = requestNextBid(
      this.context,
      state,
      events,
      this.biddingOrder,
      this.currentBidderIndex
    );
    this.context = bidResult.context;
    this.currentBidderIndex = bidResult.currentBidderIndex;

    // Check if Karama free card was triggered
    // When Karama free card is used, highBidder is set and currentBid is 0
    if (
      this.context.highBidder !== null &&
      this.context.currentBid === 0 &&
      bidResult.result.pendingRequests.length === 0
    ) {
      // Karama free card was triggered - resolve immediately
      return this.resolveCurrentAuction(bidResult.result.state, bidResult.result.events);
    }

    return bidResult.result;
  }

  /**
   * Resolve the current auction and proceed to next auction or end phase.
   */
  private resolveCurrentAuction(state: GameState, events: PhaseEvent[]): PhaseStepResult {
    const resolutionResult = resolveAuction(
      this.context,
      state,
      events,
      this.biddingOrder,
      this.currentBidderIndex
    );
    this.context = resolutionResult.context;
    this.currentBidderIndex = resolutionResult.currentBidderIndex;

    // Check if we need to start next auction
    if (!resolutionResult.result.phaseComplete && resolutionResult.result.pendingRequests.length === 0) {
      const auctionResult = startNextAuction(
        this.context,
        resolutionResult.result.state,
        resolutionResult.result.events,
        this.biddingOrder,
        this.currentBidderIndex
      );
      this.context = auctionResult.context;
      this.currentBidderIndex = auctionResult.currentBidderIndex;

      // If no peek request, continue with bidding
      if (auctionResult.result.pendingRequests.length === 0) {
        // Update context and bidder index from auction result
        this.context = auctionResult.context;
        this.currentBidderIndex = auctionResult.currentBidderIndex;
        return this.continueBidding(auctionResult.result.state, auctionResult.result.events);
      }

      return auctionResult.result;
    }

    return resolutionResult.result;
  }

  cleanup(state: GameState): GameState {
    let newState = state;

    // Per rules 1.04.06: Cards that no one bid on are returned to the deck and shuffled
    // Cards were removed from deck during auction, so we need to add unbid cards back
    if (
      this.context.cardsToReturnToDeck &&
      this.context.cardsToReturnToDeck.length > 0
    ) {
      // Find the actual card objects that weren't bid on
      const cardsToReturn =
        this.context.auctionCards?.filter((card) =>
          this.context.cardsToReturnToDeck?.includes(card.definitionId)
        ) ?? [];

      // Add cards back to deck and shuffle
      newState = returnCardsToDeckAndShuffle(newState, cardsToReturn);

      newState = logAction(newState, "CARDS_RETURNED_TO_DECK", null, {
        count: cardsToReturn.length,
        cardIds: this.context.cardsToReturnToDeck,
      });
    }

    // Note: Harkonnen's TOP CARD ability (free card per purchase) is handled
    // in resolveAuction, not here. The old code gave only one free card at
    // the end of bidding, but Rule 2.05.08 says they get one per purchase.
    return newState;
  }
}
