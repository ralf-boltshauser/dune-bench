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

import { getTreacheryCardDefinition } from "../../data";
import {
  canAtreidesSeeCard,
  createAtreidesBiddingPeekRequest,
  createCardPeekedEvent,
  getCardDescriptionForBidding,
  isAtreidesPeekAcknowledgment,
} from "../../faction-abilities";
import { validateBid } from "../../rules/bidding";
import { canUseKarama } from "../../rules/karama";
import {
  addSpice,
  drawTreacheryCard,
  getFactionMaxHandSize,
  getFactionState,
  logAction,
  removeSpice,
  setActiveFactions,
  validateHandSize,
} from "../../state";
import { shuffle } from "../../state/factory";
import {
  CardLocation,
  Faction,
  FACTION_NAMES,
  Phase,
  type FactionState,
  type GameState,
  type TreacheryCard,
} from "../../types";
import {
  type AgentRequest,
  type AgentResponse,
  type BiddingPhaseContext,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended FactionState with optional Karama-related runtime properties.
 * These properties are added temporarily during bidding phase.
 */
type FactionStateWithKarama = FactionState & {
  karamaBiddingActive?: boolean;
  karamaFreeCardActive?: boolean;
};

// =============================================================================
// BIDDING PHASE HANDLER
// =============================================================================

export class BiddingPhaseHandler implements PhaseHandler {
  readonly phase = Phase.BIDDING;

  private context: BiddingPhaseContext & { auctionCards?: TreacheryCard[] } = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesHasPeeked: false,
  };

  private handSizesDeclared = false;
  private currentBidderIndex = 0;
  private biddingOrder: Faction[] = [];

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.context = {
      cardsForAuction: [],
      currentCardIndex: 0,
      currentBid: 0,
      highBidder: null,
      passedFactions: new Set(),
      startingBidder: state.stormOrder[0],
      atreidesHasPeeked: false,
      cardsToReturnToDeck: [],
    };
    this.handSizesDeclared = false;
    this.currentBidderIndex = 0;
    this.biddingOrder = [...state.stormOrder];

    const events: PhaseEvent[] = [];
    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    console.log("\n" + "=".repeat(80));
    console.log("💰 BIDDING PHASE (Turn " + state.turn + ")");
    console.log("=".repeat(80));

    // DECLARATION PHASE (Rule 1.04.01)
    // Rule 1.04.01: "Before bidding starts, all players must publicly announce how many Treachery Cards they hold."
    // Rule 1.04.10: "The amount (not the type) of Treachery Cards a player has in their hand must be made known upon request by another player during the Bidding Phase."
    const declarations: {
      faction: Faction;
      category: string;
      handSize: number;
    }[] = [];
    console.log("\n📢 HAND SIZE DECLARATIONS (Rule 1.04.01):\n");
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

      const isEligible = handSize < maxHandSize;
      declarations.push({ faction, category, handSize });
      console.log(
        `  ${FACTION_NAMES[faction]}: ${handSize} card(s) (${category}) ${
          isEligible ? "✅ Eligible" : "❌ Ineligible (full hand)"
        }`
      );
    }

    events.push({
      type: "HAND_SIZE_DECLARED",
      data: { declarations },
      message: `Hand size declarations: ${declarations
        .map((d) => `${d.faction}: ${d.category}`)
        .join(", ")}`,
    });

    this.handSizesDeclared = true;

    // Rule 1.04.04: "A selected player deals 1 card for each player who is eligible to bid from the Treachery Deck face down in a row."
    // Count eligible bidders (players with hand size < max hand size)
    const eligibleBidders = Array.from(state.factions.entries()).filter(
      ([faction, factionState]) => {
        const maxHandSize = getFactionMaxHandSize(faction);
        return factionState.hand.length < maxHandSize;
      }
    );
    const numCards = eligibleBidders.length;

    console.log(`\n📊 Eligible Bidders: ${eligibleBidders.length}`);
    console.log(`📦 Cards to Deal: ${numCards} (1 per eligible bidder)\n`);

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

    this.context.cardsForAuction = cardsForAuction.map((c) => c.definitionId);
    this.context.auctionCards = cardsForAuction; // Store actual card objects

    if (cardsForAuction.length === 0) {
      // No cards to auction
      return {
        state: newState,
        phaseComplete: true,
        nextPhase: Phase.REVIVAL,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    // Start first auction
    return this.startNextAuction(newState, events);
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
        // Continue to bidding - no state change needed for peek
        continue;
      }

      // Check for bid action (tool is called 'place_bid' -> 'PLACE_BID')
      if (
        response.actionType === "BID" ||
        response.actionType === "PLACE_BID"
      ) {
        const result = this.processBid(newState, response, events);
        newState = result.state;
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
      return this.requestNextBid(newState, events);
    }

    // Check if auction is resolved
    const activeBidders = this.biddingOrder.filter(
      (f) => !this.context.passedFactions.has(f) && this.canBid(newState, f)
    );

    // Auction resolves when:
    // 1. There IS a high bidder and only they remain, OR
    // 2. There IS a high bidder and no active bidders remain (everyone else passed/can't bid)
    const onlyHighBidderRemains =
      activeBidders.length === 1 &&
      this.context.highBidder !== null &&
      activeBidders[0] === this.context.highBidder;

    const highBidderWins =
      this.context.highBidder !== null &&
      (activeBidders.length === 0 || onlyHighBidderRemains);

    if (highBidderWins) {
      return this.resolveAuction(newState, events);
    }

    // If no high bidder and no active bidders, check if all eligible passed (BOUGHT-IN)
    // This is handled in requestNextBid, so just continue
    if (activeBidders.length === 0) {
      return this.requestNextBid(newState, events);
    }

    // Continue bidding
    return this.requestNextBid(newState, events);
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
      newState = this.returnCardsToDeckAndShuffle(newState, cardsToReturn);

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

  // Note: shuffleArray removed - using improved shuffle from factory.ts

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Get all remaining auction cards from the current index onwards.
   * Used when returning cards to deck (BOUGHT-IN rule or no eligible bidders).
   */
  private getRemainingAuctionCards(): TreacheryCard[] {
    const remainingCards: TreacheryCard[] = [];
    for (
      let i = this.context.currentCardIndex;
      i < (this.context.auctionCards?.length ?? 0);
      i++
    ) {
      const card = this.context.auctionCards?.[i];
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
  private returnCardsToDeckAndShuffle(
    state: GameState,
    cards: TreacheryCard[]
  ): GameState {
    const newDeck = [...state.treacheryDeck, ...cards];
    const shuffledDeck = shuffle(newDeck);
    return { ...state, treacheryDeck: shuffledDeck };
  }

  private startNextAuction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Reset auction state
    this.context.currentBid = 0;
    this.context.highBidder = null;
    this.context.passedFactions = new Set();
    this.currentBidderIndex = 0;
    // Reset Atreides peek flag for this new auction (they can see each card)
    this.context.atreidesHasPeeked = false;

    // Check who is eligible to bid on this card (hand not full)
    const eligibleBidders = this.biddingOrder.filter((f) =>
      this.canBid(state, f)
    );

    console.log(
      `\n📋 Checking eligibility for auction ${
        this.context.currentCardIndex + 1
      }:`
    );
    for (const faction of this.biddingOrder) {
      const factionState = getFactionState(state, faction);
      const maxHand = getFactionMaxHandSize(faction);
      const isEligible = this.canBid(state, faction);
      console.log(
        `  ${FACTION_NAMES[faction]}: ${
          factionState.hand.length
        }/${maxHand} cards ${
          isEligible ? "✅ Eligible" : "❌ Ineligible (full hand)"
        }`
      );
    }

    if (eligibleBidders.length === 0) {
      // No one can bid - all hands are full
      console.log(
        `\n⚠️  No eligible bidders (all hands full) - bidding phase ends`
      );

      // Return all remaining cards to deck (including current card)
      const remainingCards = this.getRemainingAuctionCards();

      if (remainingCards.length > 0) {
        const newState = this.returnCardsToDeckAndShuffle(
          state,
          remainingCards
        );

        events.push({
          type: "CARD_RETURNED_TO_DECK",
          data: {
            cardsReturned: remainingCards.length,
            reason: "no_eligible_bidders",
          },
          message: `No eligible bidders - returning ${remainingCards.length} remaining card(s) to deck`,
        });

        return this.endBiddingPhase(newState, events);
      }

      return this.endBiddingPhase(state, events);
    }

    // Rule 1.04.06: "The bidding is started by the First Player. If that player is not eligible to bid
    // the next player to the right who is eligible opens the bidding."
    // Rule 1.04.07: "In subsequent bidding during this Phase, the first eligible player, to the right
    // of the player who opened the bid for the previous card, begins the bidding for the next card."

    // For first card: Start with First Player (stormOrder[0])
    // For subsequent cards: Start with first eligible to the right of previous opener
    let startIdx: number;
    if (this.context.currentCardIndex === 0) {
      // First card: Start with First Player
      startIdx = this.biddingOrder.findIndex((f) => this.canBid(state, f));
    } else {
      // Subsequent cards: Start with first eligible to the right of previous opener
      const previousOpener = this.context.startingBidder;
      const previousOpenerIdx = this.biddingOrder.indexOf(previousOpener);

      // Find first eligible starting from the right of previous opener
      startIdx = -1;
      for (let i = 1; i <= this.biddingOrder.length; i++) {
        const idx = (previousOpenerIdx + i) % this.biddingOrder.length;
        if (this.canBid(state, this.biddingOrder[idx])) {
          startIdx = idx;
          break;
        }
      }
    }

    if (startIdx === -1) {
      // This shouldn't happen since we checked eligibleBidders.length above,
      // but handle it just in case
      console.error("ERROR: startIdx is -1 but eligibleBidders.length > 0");
      this.context.currentCardIndex++;
      if (
        this.context.currentCardIndex >= this.context.cardsForAuction.length
      ) {
        return this.endBiddingPhase(state, events);
      }
      return this.startNextAuction(state, events);
    }

    this.currentBidderIndex = startIdx;
    this.context.startingBidder = this.biddingOrder[startIdx]; // Track who opens this auction

    const cardId = this.context.cardsForAuction[this.context.currentCardIndex];
    const cardDef = getTreacheryCardDefinition(cardId);

    console.log(
      `\n🎴 AUCTION ${this.context.currentCardIndex + 1}/${
        this.context.cardsForAuction.length
      }`
    );
    console.log(
      `   Starting Bidder: ${FACTION_NAMES[this.context.startingBidder]}`
    );
    console.log(
      `   Card: ${
        cardDef?.name ?? "Unknown"
      } (secret - only Atreides can see)\n`
    );

    // Don't reveal card name publicly - only Atreides knows via Prescience
    events.push({
      type: "AUCTION_STARTED",
      data: {
        cardIndex: this.context.currentCardIndex + 1,
        totalCards: this.context.cardsForAuction.length,
        startingBidder: this.context.startingBidder,
        // Card identity is secret - only Atreides can see it
      },
      message: `Auction ${this.context.currentCardIndex + 1}/${
        this.context.cardsForAuction.length
      }: Treachery Card (starting bidder: ${this.context.startingBidder})`,
    });

    // Rule 2.01.05: Atreides BIDDING ability - "During the Bidding Phase when a Treachery Card
    // comes up for purchase, you may look at it before any faction bids on it."
    // Notify Atreides of the card BEFORE bidding starts, regardless of bidding order
    const pendingRequests: AgentRequest[] = [];
    const peekResult = createAtreidesBiddingPeekRequest({
      state,
      cardId,
      auctionNumber: this.context.currentCardIndex + 1,
      totalAuctions: this.context.cardsForAuction.length,
      startingBidder: this.context.startingBidder,
    });

    if (peekResult.shouldTrigger && peekResult.request) {
      pendingRequests.push(peekResult.request);

      console.log(
        `  👁️  Atreides sees card: ${
          cardDef?.name ?? "Unknown"
        } (Prescience ability - before bidding starts)`
      );

      // Mark that Atreides has seen this card
      this.context.atreidesHasPeeked = true;
    }

    // If Atreides needs to peek, return with the peek request first
    // The orchestrator will handle the response, then we'll proceed with bidding
    if (pendingRequests.length > 0) {
      return {
        state,
        phaseComplete: false,
        pendingRequests,
        actions: [],
        events,
      };
    }

    // No Atreides in game, proceed directly to bidding
    return this.requestNextBid(state, events);
  }

  private requestNextBid(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Check if all ELIGIBLE bidders have passed on this card
    // (those who started eligible for this auction, not those who became ineligible mid-auction)
    const eligibleBidders = this.biddingOrder.filter((f) =>
      this.canBid(state, f)
    );
    const eligibleWhoHaventPassed = eligibleBidders.filter(
      (f) => !this.context.passedFactions.has(f)
    );

    // If all eligible bidders have passed, trigger BOUGHT-IN rule
    if (eligibleWhoHaventPassed.length === 0 && eligibleBidders.length > 0) {
      // Rule 1.04.11 BOUGHT-IN:
      // "When a face down Treachery card is passed on by everyone, all remaining cards
      // are returned to the top of the Treachery Deck in the order they were dealt out
      // and bidding on face down Treachery Cards is over."
      console.log(
        `\n⚠️  All eligible bidders passed on this card - BOUGHT-IN rule applies`
      );
      console.log(
        `   All remaining cards will be returned to deck and bidding ends\n`
      );

      return this.handleBoughtIn(state, events);
    }

    // Find next bidder who can still bid
    let attempts = 0;
    while (attempts < this.biddingOrder.length) {
      const bidder = this.biddingOrder[this.currentBidderIndex];

      if (
        !this.context.passedFactions.has(bidder) &&
        this.canBid(state, bidder)
      ) {
        break;
      }

      this.currentBidderIndex =
        (this.currentBidderIndex + 1) % this.biddingOrder.length;
      attempts++;
    }

    if (attempts >= this.biddingOrder.length) {
      // No active bidders left (shouldn't reach here due to check above, but just in case)
      console.log(`\n⚠️  No active bidders remaining`);
      return this.handleBoughtIn(state, events);
    }

    const bidder = this.biddingOrder[this.currentBidderIndex];
    const stateWithActive = setActiveFactions(state, [bidder]);
    const factionState = getFactionState(
      stateWithActive,
      bidder
    ) as FactionStateWithKarama;
    const cardId = this.context.cardsForAuction[this.context.currentCardIndex];
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
    if (factionState.karamaFreeCardActive) {
      console.log(
        `\n🃏 Karama free card: ${FACTION_NAMES[bidder]} immediately takes current treachery card for free`
      );

      // Set winner context and resolve immediately; resolveAuction will:
      // - Skip payment due to karamaFreeCardActive
      // - Clear Karama flags
      // - Grant the specific auction card
      this.context.highBidder = bidder;
      this.context.currentBid = 0;

      events.push({
        type: "KARAMA_FREE_CARD",
        data: {
          faction: bidder,
          cardIndex: this.context.currentCardIndex,
          cardId,
          cardName: cardDef?.name,
        },
        message: `${FACTION_NAMES[bidder]} trades Karama for the current treachery card (auction ends immediately)`,
      });

      return this.resolveAuction(state, events);
    }

    // -------------------------------------------------------------------------
    // NORMAL BIDDING FLOW
    // -------------------------------------------------------------------------

    // Rule 1.04.06.01: "The player who bids first must bid 1 spice or more otherwise they must pass."
    const isOpeningBid =
      this.context.currentBid === 0 && this.context.highBidder === null;
    const minimumBid = isOpeningBid ? 1 : this.context.currentBid + 1;

    // Auto-skip logic: If faction can't afford minimum bid and doesn't have karama, auto-skip them
    const hasKarama = canUseKarama(state, bidder);
    const canAffordMinimumBid = factionState.spice >= minimumBid;

    if (!canAffordMinimumBid && !hasKarama) {
      // Auto-skip: Add to passedFactions without requesting a bid
      this.context.passedFactions.add(bidder);
      events.push({
        type: "BID_PASSED",
        data: { faction: bidder, reason: "auto_skip_insufficient_spice" },
        message: `${FACTION_NAMES[bidder]} auto-skipped (insufficient spice: ${factionState.spice} < ${minimumBid}, no karama)`,
      });
      console.log(
        `  ⏭️  ${FACTION_NAMES[bidder]} auto-skipped (${factionState.spice} spice < ${minimumBid} minimum, no karama)`
      );

      // Move to next bidder and try again
      this.currentBidderIndex =
        (this.currentBidderIndex + 1) % this.biddingOrder.length;
      return this.requestNextBid(state, events);
    }

    // Atreides can see the card (they already peeked at auction start via PEEK_CARD request)
    // Rule 2.01.05: Atreides sees cards before any faction bids on it
    const canSeeCard = canAtreidesSeeCard(bidder);

    // Only Atreides can see the card (Prescience ability)
    // Note: Atreides already saw this card when the auction started (via PEEK_CARD request),
    // but we include it here again for consistency and to ensure they have the info when bidding
    const cardDescription = getCardDescriptionForBidding(cardDef, canSeeCard);

    const prompt = isOpeningBid
      ? `Opening bid on ${cardDescription}. You must bid at least 1 spice or pass. You have ${factionState.spice} spice.`
      : `Bidding on ${cardDescription}. Current bid: ${
          this.context.currentBid
        } by ${
          this.context.highBidder
            ? FACTION_NAMES[this.context.highBidder]
            : "none"
        }. Minimum bid: ${minimumBid}. You have ${factionState.spice} spice.`;

    const pendingRequests: AgentRequest[] = [
      {
        factionId: bidder,
        requestType: "BID_OR_PASS",
        prompt,
        context: {
          currentBid: this.context.currentBid,
          highBidder: this.context.highBidder,
          spiceAvailable: factionState.spice,
          minimumBid,
          isOpeningBid,
          // Only Atreides sees card info (Prescience ability per rule 2.01.05)
          // Atreides already saw this card at auction start, but we include it here for reference
          cardInfo: canSeeCard
            ? { id: cardId, name: cardDef?.name, type: cardDef?.type }
            : null,
          isAtreides: bidder === Faction.ATREIDES,
          passedFactions: Array.from(this.context.passedFactions),
          auctionNumber: this.context.currentCardIndex + 1,
          totalAuctions: this.context.cardsForAuction.length,
        },
        availableActions: ["BID", "PASS"],
      },
    ];

    return {
      state: stateWithActive,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Helper to create a BID_PASSED event and add faction to passed set.
   * DRY: Single source of truth for bid rejection pattern.
   */
  private createBidPassedEvent(
    faction: Faction,
    reason: string,
    message: string
  ): PhaseEvent {
    this.context.passedFactions.add(faction);
    return {
      type: "BID_PASSED",
      data: { faction, reason },
      message,
    };
  }

  /**
   * Process a bid response from an agent.
   * Uses validateBid() as the SINGLE SOURCE OF TRUTH for validation.
   */
  private processBid(
    state: GameState,
    response: AgentResponse,
    _events: PhaseEvent[] // Events are created fresh in this method, parameter kept for API consistency
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const bidAmount = Number(response.data.amount ?? 0);
    const faction = response.factionId;
    const factionState = getFactionState(state, faction);

    // Determine bid context
    const isOpeningBid =
      this.context.currentBid === 0 && this.context.highBidder === null;
    const isCurrentHighBidder =
      !isOpeningBid && this.context.highBidder === faction;
    const karamaFreeCardActive =
      (factionState as FactionStateWithKarama).karamaFreeCardActive === true;
    const karamaBiddingActive =
      (factionState as FactionStateWithKarama).karamaBiddingActive === true;

    // Log validation attempt for debugging
    const minimumBid = isOpeningBid ? 1 : this.context.currentBid + 1;
    console.log(
      `  🔍 Validating bid: ${FACTION_NAMES[faction]} bids ${bidAmount} (current: ${this.context.currentBid}, minimum: ${minimumBid}, opening: ${isOpeningBid})`
    );

    // SINGLE SOURCE OF TRUTH: Use centralized validateBid() function
    // This handles all validation including Karama exceptions
    const validation = validateBid(
      state,
      faction,
      bidAmount,
      this.context.currentBid,
      isOpeningBid,
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
      const passedEvent = this.createBidPassedEvent(
        faction,
        errorCode,
        `${FACTION_NAMES[faction]} bid rejected: ${errorMessage}`
      );
      newEvents.push(passedEvent);

      console.log(`  ❌ Bid rejected: ${errorMessage}`);
      return { state, events: newEvents };
    }

    // Valid bid - accept it
    this.context.currentBid = bidAmount;
    this.context.highBidder = faction;

    console.log(
      `  ✅ ${FACTION_NAMES[faction]} bids ${bidAmount} spice (accepted)`
    );

    newEvents.push({
      type: "BID_PLACED",
      data: { faction, amount: bidAmount },
      message: `${FACTION_NAMES[faction]} bids ${bidAmount} spice`,
    });

    // Move to next bidder
    this.currentBidderIndex =
      (this.currentBidderIndex + 1) % this.biddingOrder.length;

    return { state, events: newEvents };
  }

  private resolveAuction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    let newState = state;
    const auctionCard =
      this.context.auctionCards?.[this.context.currentCardIndex];

    if (this.context.highBidder && auctionCard) {
      // Winner pays for and receives the card
      const winner = this.context.highBidder;
      const amount = this.context.currentBid;
      let winnerState = getFactionState(newState, winner);
      const karamaBiddingActive =
        (winnerState as FactionStateWithKarama).karamaBiddingActive === true;
      const karamaFreeCardActive =
        (winnerState as FactionStateWithKarama).karamaFreeCardActive === true;

      // Check if this is a free card purchase via Karama trade.
      // NOTE: We no longer model this as a "bid 0". Instead, Karama allows
      // a *legal* winning bid to waive payment (rules enforcement for the
      // bid amount is handled entirely in validateBid()).
      const isFreeCardPurchase = karamaFreeCardActive;

      // Karama card can be used to buy without paying (Rule 3.01.11)
      // The tools set these flags:
      // - karamaBiddingActive: may bid over spice limit (still pay if you win)
      // - karamaFreeCardActive: trade Karama for this auction card and waive payment
      // Determine if payment should be made
      // Payment is NOT made only in these cases:
      // 1. Free card purchase (karamaFreeCardActive)
      // 2. Karama used to buy without paying (karamaBiddingActive, has enough spice, not free card)
      const hasEnoughSpice = amount <= winnerState.spice;
      const usedKaramaToBuyWithoutPaying =
        karamaBiddingActive && hasEnoughSpice && !isFreeCardPurchase;
      const shouldSkipPayment =
        isFreeCardPurchase || usedKaramaToBuyWithoutPaying;

      // Ensure amount is valid (should always be >= 0, but defensive check)
      if (typeof amount !== "number" || amount < 0) {
        console.error(
          `Invalid bid amount in resolveAuction: ${amount} for winner ${winner}`
        );
        // Continue anyway - will attempt to remove spice (removing 0 or negative is handled by removeSpice)
      }

      if (!shouldSkipPayment) {
        // Normal payment: Remove spice from winner
        newState = removeSpice(newState, winner, amount);

        // Pay Emperor if in game, otherwise to bank (Rule 2.03.04)
        if (
          newState.factions.has(Faction.EMPEROR) &&
          winner !== Faction.EMPEROR
        ) {
          newState = addSpice(newState, Faction.EMPEROR, amount);
        }
      } else if (shouldSkipPayment) {
        // No payment made - either free card or Karama used
        // Note: Emperor does NOT receive payment when payment is skipped
        const eventType = isFreeCardPurchase
          ? "KARAMA_FREE_CARD"
          : "KARAMA_BUY_WITHOUT_PAYING";
        const message = isFreeCardPurchase
          ? `${FACTION_NAMES[winner]} trades Karama card for free treachery card`
          : `${FACTION_NAMES[winner]} uses Karama to buy card without paying spice`;
        events.push({
          type: eventType,
          data: { faction: winner, amount },
          message,
        });
      }

      // Clear Karama flags after use
      if (karamaBiddingActive || karamaFreeCardActive) {
        const newFactions = new Map(newState.factions);
        const updatedWinnerState = { ...winnerState } as FactionStateWithKarama;
        if (karamaBiddingActive) {
          updatedWinnerState.karamaBiddingActive = false;
        }
        if (karamaFreeCardActive) {
          updatedWinnerState.karamaFreeCardActive = false;
        }
        newFactions.set(winner, updatedWinnerState);
        newState = { ...newState, factions: newFactions };
        // Update winnerState reference after clearing flag
        winnerState = getFactionState(newState, winner);
      }

      // Give the specific auction card to winner (not draw from deck!)
      const newFactions = new Map(newState.factions);
      const currentWinnerState = { ...newFactions.get(winner)! };
      const wonCard: TreacheryCard = {
        ...auctionCard,
        location: CardLocation.HAND,
        ownerId: winner,
      };

      // Hand size validation: prevent exceeding max hand size
      const maxHandSize = getFactionMaxHandSize(winner);
      const currentHandSize = currentWinnerState.hand.length;

      if (currentHandSize >= maxHandSize) {
        // This should never happen if eligibility checks are working correctly,
        // but add defensive check to prevent exceeding hand size limit
        console.error(
          `[BIDDING] Faction ${FACTION_NAMES[winner]} attempted to purchase card but hand is full (${currentHandSize}/${maxHandSize}). Card not added.`
        );
        events.push({
          type: "ERROR",
          data: {
            faction: winner,
            error: "hand_size_exceeded",
            message: `Cannot add card: hand is full (${currentHandSize}/${maxHandSize})`,
          },
          message: `${FACTION_NAMES[winner]} cannot receive card: hand is full`,
        });

        // Refund payment if payment was made (should not happen, but defensive check)
        if (!shouldSkipPayment && amount > 0) {
          // Refund spice to winner
          newState = addSpice(newState, winner, amount);
          // Remove spice from Emperor if it was paid
          if (
            newState.factions.has(Faction.EMPEROR) &&
            winner !== Faction.EMPEROR
          ) {
            newState = removeSpice(newState, Faction.EMPEROR, amount);
          }
          events.push({
            type: "SPICE_REFUNDED",
            data: { faction: winner, amount, reason: "hand_size_exceeded" },
            message: `${FACTION_NAMES[winner]} refunded ${amount} spice (hand size exceeded)`,
          });
        }

        // Don't add the card - track it for return to deck
        if (!this.context.cardsToReturnToDeck) {
          this.context.cardsToReturnToDeck = [];
        }
        if (auctionCard) {
          this.context.cardsToReturnToDeck.push(auctionCard.definitionId);
        }
        events.push({
          type: "CARD_RETURNED_TO_DECK",
          data: {
            cardIndex: this.context.currentCardIndex,
            reason: "hand_size_exceeded",
          },
          message: `Card returned to deck (hand size exceeded)`,
        });

        // Continue with next auction
        // Move to next card
        this.context.currentCardIndex++;

        if (
          this.context.currentCardIndex >= this.context.cardsForAuction.length
        ) {
          return this.endBiddingPhase(newState, events);
        }

        // Start next auction
        return this.startNextAuction(newState, events);
      }

      currentWinnerState.hand = [...currentWinnerState.hand, wonCard];
      newFactions.set(winner, currentWinnerState);
      newState = { ...newState, factions: newFactions };

      // Defensive assertion: validate hand size after card purchase
      validateHandSize(newState, winner);

      events.push({
        type: "CARD_WON",
        data: {
          winner,
          amount,
          cardIndex: this.context.currentCardIndex,
        },
        message: `${winner} wins the auction for ${amount} spice`,
      });

      newState = logAction(newState, "CARD_PURCHASED", winner, {
        amount,
        cardIndex: this.context.currentCardIndex,
      });

      // Harkonnen ability (Rule 2.05.08): Draw an extra free card when buying
      // "TOP CARD: When you Buy a card, you Draw an extra card for free from
      // the Treachery Deck (unless you are at 7 cards, because you can never
      // have more than 8 total Treachery Cards in hand).✷"
      if (winner === Faction.HARKONNEN) {
        const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
        const maxHand = getFactionMaxHandSize(Faction.HARKONNEN);
        // Can draw if hand size is 7 or less (will become 8)
        if (
          harkonnenState.hand.length < maxHand &&
          newState.treacheryDeck.length > 0
        ) {
          newState = drawTreacheryCard(newState, Faction.HARKONNEN);
          // Defensive assertion: validate hand size after Harkonnen TOP CARD draw
          validateHandSize(newState, Faction.HARKONNEN);
          events.push({
            type: "CARD_DRAWN_FREE",
            data: { faction: Faction.HARKONNEN, ability: "TOP_CARD" },
            message: `Harkonnen draws a free card (TOP CARD ability)`,
          });
          newState = logAction(newState, "CARD_DRAWN_FREE", Faction.HARKONNEN, {
            ability: "TOP_CARD",
          });
        }
      }
    } else {
      // No bidder - per rules 1.04.06, card is set aside and returned to deck
      events.push({
        type: "CARD_RETURNED_TO_DECK",
        data: { cardIndex: this.context.currentCardIndex },
        message: `No bids - card is set aside and will be returned to the deck`,
      });

      // Track cards to return to deck at end of bidding phase
      if (!this.context.cardsToReturnToDeck) {
        this.context.cardsToReturnToDeck = [];
      }
      if (auctionCard) {
        this.context.cardsToReturnToDeck.push(auctionCard.definitionId);
      }
    }

    // Move to next card
    this.context.currentCardIndex++;

    if (this.context.currentCardIndex >= this.context.cardsForAuction.length) {
      return this.endBiddingPhase(newState, events);
    }

    // Start next auction
    return this.startNextAuction(newState, events);
  }

  /**
   * Handle BOUGHT-IN rule: When all players pass on a card, return ALL remaining
   * cards to deck and end bidding immediately.
   * Rule 1.04.11: "When a face down Treachery card is passed on by everyone, all
   * remaining cards are returned to the top of the Treachery Deck in the order they
   * were dealt out and bidding on face down Treachery Cards is over."
   */
  private handleBoughtIn(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Get all remaining cards (current card + all cards after it)
    const remainingCards = this.getRemainingAuctionCards();

    console.log(
      `\n📦 Returning ${remainingCards.length} remaining card(s) to deck (BOUGHT-IN rule)`
    );

    // Return all remaining cards to deck in the order they were dealt
    // Rule says "in the order they were dealt out"
    // Note: Despite the rule saying "to the top", we shuffle the entire deck for gameplay balance
    let newState = this.returnCardsToDeckAndShuffle(state, remainingCards);

    events.push({
      type: "CARD_BOUGHT_IN",
      data: {
        cardsReturned: remainingCards.length,
        cardIds: remainingCards.map((c) => c.definitionId),
      },
      message: `BOUGHT-IN: All ${remainingCards.length} remaining card(s) returned to deck. Bidding ends.`,
    });

    newState = logAction(newState, "CARDS_RETURNED_TO_DECK", null, {
      cardsReturned: remainingCards.length,
    });

    // End bidding phase immediately
    return this.endBiddingPhase(newState, events);
  }

  private endBiddingPhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Note: PhaseManager emits PHASE_ENDED event, so we just emit our own completion marker
    events.push({
      type: "BIDDING_COMPLETE",
      data: { phase: Phase.BIDDING },
      message: "Bidding complete",
    });

    const finalState = logAction(setActiveFactions(state, []), "BIDDING_ENDED", null, {});
    return {
      state: finalState,
      phaseComplete: true,
      nextPhase: Phase.REVIVAL,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  private canBid(state: GameState, faction: Faction): boolean {
    const factionState = getFactionState(state, faction);
    const maxHand = getFactionMaxHandSize(faction);

    // Defensive assertion: validate current hand size before checking eligibility
    validateHandSize(state, faction);

    // Can't bid if hand is full
    if (factionState.hand.length >= maxHand) {
      return false;
    }

    // Check if faction can afford minimum bid OR has karama card OR has karama free card active
    // Rule 1.04.06.01: "The player who bids first must bid 1 spice or more otherwise they must pass."
    const isOpeningBid =
      this.context.currentBid === 0 && this.context.highBidder === null;
    const minimumBid = isOpeningBid ? 1 : this.context.currentBid + 1;

    const canAffordMinimumBid = factionState.spice >= minimumBid;
    const hasKarama = canUseKarama(state, faction);
    const karamaFreeCardActive =
      (factionState as FactionStateWithKarama).karamaFreeCardActive === true;

    // Can bid if they can afford minimum bid OR have karama card OR have karama free card active
    // (Karama allows bidding over spice limit, buying without paying, or trading for free card)
    if (!canAffordMinimumBid && !hasKarama && !karamaFreeCardActive) {
      return false;
    }

    return true;
  }
}
