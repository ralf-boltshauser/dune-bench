/**
 * Bid Processing
 * 
 * Handles bid requests, validation, and processing.
 * 
 * Rules:
 * - 1.04.06.01: Opening bid must be at least 1 spice
 * - 1.04.11: BOUGHT-IN rule (all pass)
 * - Karama free card short-circuit
 */

import { getTreacheryCardDefinition } from "../../../data";
import {
  canAtreidesSeeCard,
  getCardDescriptionForBidding,
} from "../../../faction-abilities";
import { validateBid } from "../../../rules/bidding";
import { canUseKarama } from "../../../rules/karama";
import { getFactionState, setActiveFactions } from "../../../state";
import { Faction, FACTION_NAMES, type GameState } from "../../../types";
import { type AgentRequest, type PhaseEvent, type PhaseStepResult } from "../../types";
import { type BiddingContextWithCards } from "./types";
import {
  getEligibleBidders,
  isEligibleToBid,
  calculateMinimumBid,
  isOpeningBid,
  hasKaramaFreeCard,
  hasKaramaBidding,
  addPassedFaction,
  updateBidContext,
} from "./helpers";
import { handleBoughtIn } from "./helpers";
import {
  createBidPlacedEvent,
  createBidPassedEvent,
  createBidRejectedEvent,
  createKaramaFreeCardEvent,
} from "./events";
import {
  logBoughtIn,
  logAutoSkip,
  logBidPlaced,
  logBidPassed,
  logBidRejected,
  logBidValidation,
  logKaramaFreeCard,
  logNoActiveBidders,
} from "./logging";

/**
 * Request the next bid from the current bidder.
 * 
 * Handles:
 * - BOUGHT-IN rule detection
 * - Finding next eligible bidder
 * - Karama free card short-circuit
 * - Auto-skip for insufficient spice
 * - Creating bid request
 */
export function requestNextBid(
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
  // Check if all ELIGIBLE bidders have passed on this card
  // (those who started eligible for this auction, not those who became ineligible mid-auction)
  // NOTE: BOUGHT-IN only applies when there's NO high bidder.
  // If there's a high bidder and everyone else passed, the auction should resolve
  // (handled by shouldResolveAuction in the main handler), not trigger BOUGHT-IN.
  const eligibleBidders = getEligibleBidders(state, context, biddingOrder);
  const eligibleWhoHaventPassed = eligibleBidders.filter(
    (f) => !context.passedFactions.has(f)
  );

  // If all eligible bidders have passed AND there's no high bidder, trigger BOUGHT-IN rule
  // Rule 1.04.11 BOUGHT-IN: "When a face down Treachery card is passed on by everyone,
  // all remaining cards are returned to the top of the Treachery Deck in the order they
  // were dealt out and bidding on face down Treachery Cards is over."
  if (eligibleWhoHaventPassed.length === 0 && eligibleBidders.length > 0 && context.highBidder === null) {
    logBoughtIn();

    return {
      context,
      result: handleBoughtIn(context, state, events),
      currentBidderIndex: 0,
    };
  }

  // Find next bidder who can still bid
  let attempts = 0;
  let newCurrentBidderIndex = currentBidderIndex;
  while (attempts < biddingOrder.length) {
    const bidder = biddingOrder[newCurrentBidderIndex];

    if (
      !context.passedFactions.has(bidder) &&
      isEligibleToBid(state, bidder, context)
    ) {
      break;
    }

    newCurrentBidderIndex =
      (newCurrentBidderIndex + 1) % biddingOrder.length;
    attempts++;
  }

  if (attempts >= biddingOrder.length) {
    // No active bidders left (shouldn't reach here due to check above, but just in case)
    logNoActiveBidders();
    return {
      context,
      result: handleBoughtIn(context, state, events),
      currentBidderIndex: 0,
    };
  }

  const bidder = biddingOrder[newCurrentBidderIndex];
  const stateWithActive = setActiveFactions(state, [bidder]);
  const factionState = getFactionState(stateWithActive, bidder);
  const cardId = context.cardsForAuction[context.currentCardIndex];
  const cardDef = getTreacheryCardDefinition(cardId);

  // -------------------------------------------------------------------------
  // KARAMA FREE CARD SHORT-CIRCUIT
  // -------------------------------------------------------------------------
  // Rules text: "Bid more spice than you have ... and/or Buy a Treachery Card
  // without paying spice for it". When a player has used the
  // trade_karama_for_treachery_card tool, we mark karamaFreeCardActive.
  //
  // At that point, as soon as it becomes their turn to act on this auction,
  // they should immediately take the current card for free and the auction
  // for this card ends — no further bidding on this card is allowed.
  //
  // We model this by short-circuiting here and resolving the auction with
  // them as the winner (payment is skipped in resolveAuction when the flag
  // is active).
  if (hasKaramaFreeCard(state, bidder)) {
    logKaramaFreeCard(bidder);

    // Set winner context and resolve immediately; resolveAuction will:
    // - Skip payment due to karamaFreeCardActive
    // - Clear Karama flags
    // - Grant the specific auction card
    const updatedContext = updateBidContext(context, bidder, 0);

    events.push(
      createKaramaFreeCardEvent(
        bidder,
        updatedContext.currentCardIndex,
        cardId,
        cardDef?.name
      )
    );

    // Karama free card: highBidder is set and currentBid is 0
    // Main handler will detect this and resolve auction
    return {
      context: updatedContext,
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

  // -------------------------------------------------------------------------
  // NORMAL BIDDING FLOW
  // -------------------------------------------------------------------------

  // Rule 1.04.06.01: "The player who bids first must bid 1 spice or more otherwise they must pass."
  const openingBid = isOpeningBid(context);
  const minimumBid = calculateMinimumBid(context);

  // Auto-skip logic: If faction can't afford minimum bid and doesn't have karama, auto-skip them
  const hasKarama = canUseKarama(state, bidder);
  const canAffordMinimumBid = factionState.spice >= minimumBid;

  if (!canAffordMinimumBid && !hasKarama) {
    // Auto-skip: Add to passedFactions without requesting a bid
    const updatedContext = addPassedFaction(context, bidder);
    events.push(
      createBidPassedEvent(
        bidder,
        "auto_skip_insufficient_spice",
        `${FACTION_NAMES[bidder]} auto-skipped (insufficient spice: ${factionState.spice} < ${minimumBid}, no karama)`
      )
    );
    logAutoSkip(bidder, factionState.spice, minimumBid);

    // Move to next bidder and try again
    newCurrentBidderIndex =
      (newCurrentBidderIndex + 1) % biddingOrder.length;
    return requestNextBid(updatedContext, state, events, biddingOrder, newCurrentBidderIndex);
  }

  // Atreides can see the card (they already peeked at auction start via PEEK_CARD request)
  // Rule 2.01.05: Atreides sees cards before any faction bids on it
  const canSeeCard = canAtreidesSeeCard(bidder);

  // Only Atreides can see the card (Prescience ability)
  // Note: Atreides already saw this card when the auction started (via PEEK_CARD request),
  // but we include it here again for consistency and to ensure they have the info when bidding
  const cardDescription = getCardDescriptionForBidding(cardDef, canSeeCard);

  const prompt = openingBid
    ? `Opening bid on ${cardDescription}. You must bid at least 1 spice or pass. You have ${factionState.spice} spice.`
    : `Bidding on ${cardDescription}. Current bid: ${
        context.currentBid
      } by ${
        context.highBidder
          ? FACTION_NAMES[context.highBidder]
          : "none"
      }. Minimum bid: ${minimumBid}. You have ${factionState.spice} spice.`;

  const pendingRequests: AgentRequest[] = [
    {
      factionId: bidder,
      requestType: "BID_OR_PASS",
      prompt,
      context: {
        currentBid: context.currentBid,
        highBidder: context.highBidder,
        spiceAvailable: factionState.spice,
        minimumBid,
        isOpeningBid: openingBid,
        // Only Atreides sees card info (Prescience ability per rule 2.01.05)
        // Atreides already saw this card at auction start, but we include it here for reference
        cardInfo: canSeeCard
          ? { id: cardId, name: cardDef?.name, type: cardDef?.type }
          : null,
        isAtreides: bidder === Faction.ATREIDES,
        passedFactions: Array.from(context.passedFactions),
        auctionNumber: context.currentCardIndex + 1,
        totalAuctions: context.cardsForAuction.length,
      },
      availableActions: ["BID", "PASS"],
    },
  ];

  return {
    context,
    result: {
      state: stateWithActive,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    },
    currentBidderIndex: newCurrentBidderIndex,
  };
}

/**
 * Process a bid response from an agent.
 * Uses validateBid() as the SINGLE SOURCE OF TRUTH for validation.
 */
export function processBid(
  context: BiddingContextWithCards,
  state: GameState,
  response: { factionId: Faction; data: { amount?: number | string } },
  biddingOrder: Faction[],
  currentBidderIndex: number
): {
  context: BiddingContextWithCards;
  state: GameState;
  events: PhaseEvent[];
  currentBidderIndex: number;
} {
  const newEvents: PhaseEvent[] = [];
  const bidAmount = Number(response.data.amount ?? 0);
  const faction = response.factionId;
  const factionState = getFactionState(state, faction);

  // Determine bid context
  const openingBid = isOpeningBid(context);
  const isCurrentHighBidder =
    !openingBid && context.highBidder === faction;
  const karamaFreeCardActive = hasKaramaFreeCard(state, faction);
  const karamaBiddingActive = hasKaramaBidding(state, faction);

  // Log validation attempt for debugging
  const minimumBid = calculateMinimumBid(context);
  logBidValidation(faction, bidAmount, context.currentBid, minimumBid, openingBid);

  // SINGLE SOURCE OF TRUTH: Use centralized validateBid() function
  // This handles all validation including Karama exceptions
  const validation = validateBid(
    state,
    faction,
    bidAmount,
    context.currentBid,
    openingBid,
    {
      karamaFreeCardActive,
      karamaBiddingActive,
      isCurrentHighBidder,
    }
  );

  // If validation fails, reject the bid
  if (!validation.valid) {
    const primaryError = validation.errors[0];
    const errorCode = primaryError?.code || "validation_failed";
    const errorMessage = primaryError?.message || "Invalid bid";

    // Create rejection event
    const updatedContext = addPassedFaction(context, faction);
    const passedEvent = createBidRejectedEvent(
      updatedContext,
      faction,
      errorCode,
      errorMessage
    );
    newEvents.push(passedEvent);

    logBidRejected(faction, errorMessage);
    return { context: updatedContext, state, events: newEvents, currentBidderIndex };
  }

  // Valid bid - accept it
  const updatedContext = updateBidContext(context, faction, bidAmount);

  logBidPlaced(faction, bidAmount);

  newEvents.push(createBidPlacedEvent(faction, bidAmount));

  // Move to next bidder
  const newCurrentBidderIndex =
    (currentBidderIndex + 1) % biddingOrder.length;

  return { context: updatedContext, state, events: newEvents, currentBidderIndex: newCurrentBidderIndex };
}

