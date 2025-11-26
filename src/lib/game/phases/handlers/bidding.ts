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

import {
  Faction,
  Phase,
  type GameState,
  type TreacheryCard,
  CardLocation,
} from '../../types';
import {
  drawTreacheryCard,
  removeSpice,
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { GAME_CONSTANTS, getTreacheryCardDefinition } from '../../data';
import { getFactionMaxHandSize } from '../../state';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type BiddingPhaseContext,
} from '../types';

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

    events.push({
      type: 'PHASE_STARTED',
      data: { phase: Phase.BIDDING },
      message: 'Bidding phase started',
    });

    // DECLARATION PHASE (Rule 1.04.01)
    // Each player, in storm order, must announce if they have at least 1 card or 4 or more cards
    const declarations: { faction: Faction; category: string; handSize: number }[] = [];
    for (const faction of state.stormOrder) {
      const factionState = getFactionState(state, faction);
      const handSize = factionState.hand.length;
      let category: string;

      if (handSize === 0) {
        category = 'no cards';
      } else if (handSize >= 4) {
        category = '4 or more cards';
      } else {
        category = 'at least 1 card';
      }

      declarations.push({ faction, category, handSize });
    }

    events.push({
      type: 'HAND_SIZE_DECLARED',
      data: { declarations },
      message: `Hand size declarations: ${declarations
        .map((d) => `${d.faction}: ${d.category}`)
        .join(', ')}`,
    });

    this.handSizesDeclared = true;

    // First, determine how many cards to auction
    // Number of cards = number of players (factions)
    const numCards = state.factions.size;

    // Draw cards for auction from the treachery deck
    // These cards are actually removed from the deck and held aside for auction
    let newState = state;
    const cardsForAuction: TreacheryCard[] = [];
    const remainingDeck = [...state.treacheryDeck];

    for (let i = 0; i < numCards && remainingDeck.length > 0; i++) {
      const card = remainingDeck.shift()!;  // Remove from deck
      cardsForAuction.push(card);
    }

    // Update the deck (cards have been drawn for auction)
    newState = { ...newState, treacheryDeck: remainingDeck };

    this.context.cardsForAuction = cardsForAuction.map(c => c.definitionId);
    this.context.auctionCards = cardsForAuction;  // Store actual card objects

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

    // Process bid responses
    for (const response of responses) {
      // Check for bid action (tool is called 'place_bid' -> 'PLACE_BID')
      if (response.actionType === 'BID' || response.actionType === 'PLACE_BID') {
        const result = this.processBid(newState, response, events);
        newState = result.state;
        events.push(...result.events);
      } else if (response.actionType === 'PASS' || response.actionType === 'PASS_BID' || response.passed) {
        this.context.passedFactions.add(response.factionId);
        events.push({
          type: 'BID_PASSED',
          data: { faction: response.factionId },
          message: `${response.factionId} passes`,
        });
      }
    }

    // Check if auction is resolved
    const activeBidders = this.biddingOrder.filter(
      (f) => !this.context.passedFactions.has(f) && this.canBid(newState, f)
    );

    // Auction resolves when:
    // 1. No active bidders remain (everyone passed or can't bid), OR
    // 2. There IS a high bidder and only they remain
    const noActiveBidders = activeBidders.length === 0;
    const onlyHighBidderRemains =
      activeBidders.length === 1 &&
      this.context.highBidder !== null &&
      activeBidders[0] === this.context.highBidder;

    if (noActiveBidders || onlyHighBidderRemains) {
      return this.resolveAuction(newState, events);
    }

    // Continue bidding
    return this.requestNextBid(newState, events);
  }

  cleanup(state: GameState): GameState {
    let newState = state;

    // Per rules 1.04.06: Cards that no one bid on are returned to the deck and shuffled
    // Cards were removed from deck during auction, so we need to add unbid cards back
    if (this.context.cardsToReturnToDeck && this.context.cardsToReturnToDeck.length > 0) {
      // Find the actual card objects that weren't bid on
      const cardsToReturn = this.context.auctionCards?.filter(
        card => this.context.cardsToReturnToDeck?.includes(card.definitionId)
      ) ?? [];

      // Add cards back to deck and shuffle
      const newDeck = [...newState.treacheryDeck, ...cardsToReturn];
      const shuffledDeck = this.shuffleArray(newDeck);
      newState = { ...newState, treacheryDeck: shuffledDeck };

      newState = logAction(newState, 'CARDS_RETURNED_TO_DECK', null, {
        count: cardsToReturn.length,
        cardIds: this.context.cardsToReturnToDeck,
      });
    }

    // Give Harkonnen their free card if in game
    if (newState.factions.has(Faction.HARKONNEN)) {
      const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
      const maxHand = getFactionMaxHandSize(Faction.HARKONNEN);
      if (harkonnenState.hand.length < maxHand && newState.treacheryDeck.length > 0) {
        newState = drawTreacheryCard(newState, Faction.HARKONNEN);
        newState = logAction(newState, 'CARD_DRAWN_FREE', Faction.HARKONNEN, {
          ability: 'Harkonnen free draw',
        });
      }
    }
    return newState;
  }

  /**
   * Fisher-Yates shuffle
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private startNextAuction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Reset auction state
    this.context.currentBid = 0;
    this.context.highBidder = null;
    this.context.passedFactions = new Set();
    this.currentBidderIndex = 0;

    // Find starting bidder (storm order, skip those who can't bid)
    const startIdx = this.biddingOrder.findIndex(
      (f) => this.canBid(state, f)
    );

    if (startIdx === -1) {
      // No one can bid, skip auction
      this.context.currentCardIndex++;
      if (this.context.currentCardIndex >= this.context.cardsForAuction.length) {
        return this.endBiddingPhase(state, events);
      }
      return this.startNextAuction(state, events);
    }

    this.currentBidderIndex = startIdx;

    const cardId = this.context.cardsForAuction[this.context.currentCardIndex];
    const cardDef = getTreacheryCardDefinition(cardId);

    // Don't reveal card name publicly - only Atreides knows via Prescience
    events.push({
      type: 'AUCTION_STARTED',
      data: {
        cardIndex: this.context.currentCardIndex + 1,
        totalCards: this.context.cardsForAuction.length,
        // Card identity is secret - only Atreides can see it
      },
      message: `Auction ${this.context.currentCardIndex + 1}/${this.context.cardsForAuction.length}: Treachery Card`,
    });

    // Atreides prescience: they can see the card
    if (state.factions.has(Faction.ATREIDES) && !this.context.atreidesHasPeeked) {
      this.context.atreidesHasPeeked = true;
    }

    return this.requestNextBid(state, events);
  }

  private requestNextBid(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Find next bidder who can still bid
    let attempts = 0;
    while (attempts < this.biddingOrder.length) {
      const bidder = this.biddingOrder[this.currentBidderIndex];

      if (!this.context.passedFactions.has(bidder) && this.canBid(state, bidder)) {
        break;
      }

      this.currentBidderIndex = (this.currentBidderIndex + 1) % this.biddingOrder.length;
      attempts++;
    }

    if (attempts >= this.biddingOrder.length) {
      // No valid bidders, resolve auction
      return this.resolveAuction(state, events);
    }

    const bidder = this.biddingOrder[this.currentBidderIndex];
    const factionState = getFactionState(state, bidder);
    const cardId = this.context.cardsForAuction[this.context.currentCardIndex];
    const cardDef = getTreacheryCardDefinition(cardId);

    // Atreides can see the card
    const canSeeCard = bidder === Faction.ATREIDES;

    // Only Atreides can see the card (Prescience ability)
    const cardDescription = canSeeCard
      ? `${cardDef?.name ?? 'Unknown Card'}`
      : 'an unknown Treachery card';

    const pendingRequests: AgentRequest[] = [
      {
        factionId: bidder,
        requestType: 'BID_OR_PASS',
        prompt: `Bidding on ${cardDescription}. Current bid: ${this.context.currentBid} by ${this.context.highBidder ?? 'none'}. You have ${factionState.spice} spice.`,
        context: {
          currentBid: this.context.currentBid,
          highBidder: this.context.highBidder,
          spiceAvailable: factionState.spice,
          minimumBid: this.context.currentBid + 1,
          // Only Atreides sees card info (Prescience ability per rule 2.01)
          cardInfo: canSeeCard ? { id: cardId, name: cardDef?.name, type: cardDef?.type } : null,
          isAtreides: bidder === Faction.ATREIDES,
          passedFactions: Array.from(this.context.passedFactions),
          auctionNumber: this.context.currentCardIndex + 1,
          totalAuctions: this.context.cardsForAuction.length,
        },
        availableActions: ['BID', 'PASS'],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  private processBid(
    state: GameState,
    response: AgentResponse,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const bidAmount = Number(response.data.amount ?? 0);
    const faction = response.factionId;
    const factionState = getFactionState(state, faction);

    // Validate bid
    if (bidAmount <= this.context.currentBid) {
      // Invalid bid, treat as pass
      this.context.passedFactions.add(faction);
      newEvents.push({
        type: 'BID_PASSED',
        data: { faction, reason: 'bid_too_low' },
        message: `${faction} bid ${bidAmount} (too low, treating as pass)`,
      });
      return { state, events: newEvents };
    }

    if (bidAmount > factionState.spice) {
      // Can't afford, treat as pass
      this.context.passedFactions.add(faction);
      newEvents.push({
        type: 'BID_PASSED',
        data: { faction, reason: 'insufficient_spice' },
        message: `${faction} cannot afford ${bidAmount} spice`,
      });
      return { state, events: newEvents };
    }

    // Valid bid
    this.context.currentBid = bidAmount;
    this.context.highBidder = faction;

    newEvents.push({
      type: 'BID_PLACED',
      data: { faction, amount: bidAmount },
      message: `${faction} bids ${bidAmount} spice`,
    });

    // Move to next bidder
    this.currentBidderIndex = (this.currentBidderIndex + 1) % this.biddingOrder.length;

    return { state, events: newEvents };
  }

  private resolveAuction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    let newState = state;
    const auctionCard = this.context.auctionCards?.[this.context.currentCardIndex];

    if (this.context.highBidder && auctionCard) {
      // Winner pays for and receives the card
      const winner = this.context.highBidder;
      const amount = this.context.currentBid;

      // Remove spice from winner
      newState = removeSpice(newState, winner, amount);

      // Pay Emperor if in game, otherwise to bank
      if (newState.factions.has(Faction.EMPEROR)) {
        newState = addSpice(newState, Faction.EMPEROR, amount);
      }

      // Give the specific auction card to winner (not draw from deck!)
      const newFactions = new Map(newState.factions);
      const winnerState = { ...newFactions.get(winner)! };
      const wonCard: TreacheryCard = {
        ...auctionCard,
        location: CardLocation.HAND,
        ownerId: winner,
      };
      winnerState.hand = [...winnerState.hand, wonCard];
      newFactions.set(winner, winnerState);
      newState = { ...newState, factions: newFactions };

      events.push({
        type: 'CARD_WON',
        data: {
          winner,
          amount,
          cardIndex: this.context.currentCardIndex,
        },
        message: `${winner} wins the auction for ${amount} spice`,
      });

      newState = logAction(newState, 'CARD_PURCHASED', winner, {
        amount,
        cardIndex: this.context.currentCardIndex,
      });
    } else {
      // No bidder - per rules 1.04.06, card is set aside and returned to deck
      events.push({
        type: 'CARD_RETURNED_TO_DECK',
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

  private endBiddingPhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    events.push({
      type: 'PHASE_ENDED',
      data: { phase: Phase.BIDDING },
      message: 'Bidding phase ended',
    });

    return {
      state: logAction(state, 'BIDDING_ENDED', null, {}),
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

    // Can't bid if hand is full
    if (factionState.hand.length >= maxHand) {
      return false;
    }

    // Can't bid if no spice (unless current bid is 0)
    if (factionState.spice === 0 && this.context.currentBid > 0) {
      return false;
    }

    return true;
  }
}
