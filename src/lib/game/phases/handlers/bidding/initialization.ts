/**
 * Bidding Phase Initialization
 *
 * Handles phase setup:
 * - Hand size declarations (Rule 1.04.01)
 * - Card dealing for eligible bidders (Rule 1.04.04)
 */

import { getFactionMaxHandSize, getFactionState } from "../../../state";
import { Faction, Phase, type GameState, type TreacheryCard } from "../../../types";
import { type PhaseEvent, type PhaseStepResult } from "../../types";
import { type BiddingContextWithCards, type HandSizeDeclaration } from "./types";
import { startNextAuction } from "./auction";
import { getEligibleBidders } from "./helpers";
import { createHandSizeDeclaredEvent } from "./events";
import {
  logPhaseStart,
  logHandDeclarations,
  logEligibleBidders,
} from "./logging";

/**
 * Initialize the bidding phase.
 * 
 * 1. Reset context and state
 * 2. Collect hand size declarations (Rule 1.04.01)
 * 3. Deal cards for auction (Rule 1.04.04)
 * 4. Start first auction or end if no cards
 */
export function initializeBiddingPhase(
  context: BiddingContextWithCards,
  state: GameState,
  biddingOrder: Faction[]
): {
  context: BiddingContextWithCards;
  result: PhaseStepResult;
} {
  // Reset context
  const newContext: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesPeekedCards: new Set(), // Track which card indices Atreides has peeked at
    cardsToReturnToDeck: [],
    auctionCards: [],
  };

  const events: PhaseEvent[] = [];
  // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

  logPhaseStart(state.turn);

  // @rule 1.04.01 - Hand size declarations before bidding starts.
  // Rule 1.04.01: "Before bidding starts, all players must publicly announce how many Treachery Cards they hold."
  const declarations: HandSizeDeclaration[] = [];
  for (const faction of state.stormOrder) {
    const factionState = getFactionState(state, faction);
    const handSize = factionState.hand.length;
    const maxHandSize = getFactionMaxHandSize(faction);
    let category: string;

    if (handSize === 0) {
      category = "no cards";
    } else if (handSize >= 4) {
      category = "4 or more cards";
    } else {
      category = "at least 1 card";
    }

    declarations.push({ faction, category, handSize });
  }

  logHandDeclarations(declarations);
  events.push(createHandSizeDeclaredEvent(declarations));

  // @rule 1.04.04
  // Rule 1.04.04: "A selected player deals 1 card for each player who is eligible to bid from the Treachery Deck face down in a row."
  // Count eligible bidders (players with hand size < max hand size)
  const eligibleBidders = getEligibleBidders(state, newContext, biddingOrder);
  const numCards = eligibleBidders.length;

  logEligibleBidders(eligibleBidders.length, numCards);

  // Draw cards for auction from the treachery deck
  // These cards are actually removed from the deck and held aside for auction
  let newState = state;
  const cardsForAuction: TreacheryCard[] = [];
  const remainingDeck = [...state.treacheryDeck];

  for (let i = 0; i < numCards && remainingDeck.length > 0; i++) {
    const card = remainingDeck.shift()!; // Remove from deck
    cardsForAuction.push(card);
  }

  // Update the deck (cards have been drawn for auction)
  newState = { ...newState, treacheryDeck: remainingDeck };

  newContext.cardsForAuction = cardsForAuction.map((c) => c.definitionId);
  newContext.auctionCards = cardsForAuction; // Store actual card objects

  if (cardsForAuction.length === 0) {
    // No cards to auction
    return {
      context: newContext,
      result: {
        state: newState,
        phaseComplete: true,
        nextPhase: Phase.REVIVAL,
        pendingRequests: [],
        actions: [],
        events,
      },
    };
  }

  // Start first auction
  const auctionResult = startNextAuction(
    newContext,
    newState,
    events,
    biddingOrder,
    0 // currentBidderIndex starts at 0
  );

  return {
    context: auctionResult.context,
    result: auctionResult.result,
  };
}

