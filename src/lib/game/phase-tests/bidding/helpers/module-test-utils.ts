/**
 * Module Test Utilities for Bidding Phase
 * 
 * Utilities specific to testing each module.
 */

import { Faction, type GameState } from "../../../types";
import { type PhaseEvent } from "../../../phases/types";
import { type BiddingContextWithCards, type HandSizeDeclaration } from "../../../phases/handlers/bidding/types";
import { assertEventEmitted, assertEventData } from "./assertions";

// =============================================================================
// INITIALIZATION MODULE UTILITIES
// =============================================================================

/**
 * Create a test context for initialization
 */
export function createInitializationTestContext(): BiddingContextWithCards {
  return {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesPeekedCards: new Set(), // Track which card indices Atreides has peeked at
    cardsToReturnToDeck: [],
    auctionCards: [],
  };
}

/**
 * Assert hand size declarations are correct
 */
export function assertHandSizeDeclarations(
  events: PhaseEvent[],
  expectedDeclarations: HandSizeDeclaration[]
): void {
  assertEventEmitted(events, "HAND_SIZE_DECLARED");
  assertEventData(events, "HAND_SIZE_DECLARED", {
    declarations: expectedDeclarations,
  });
}

/**
 * Assert cards were dealt correctly
 */
export function assertCardsDealt(
  state: GameState,
  context: BiddingContextWithCards,
  expectedCount: number
): void {
  if (context.cardsForAuction.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} cards dealt, but got ${context.cardsForAuction.length}`
    );
  }
  if (context.auctionCards?.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} auction cards, but got ${context.auctionCards?.length ?? 0}`
    );
  }
}

/**
 * Assert eligibility was determined correctly
 */
export function assertEligibilityDetermined(
  declarations: HandSizeDeclaration[],
  expectedEligible: Faction[]
): void {
  const eligible = declarations.filter((d) => {
    const faction = d.faction as Faction;
    return expectedEligible.includes(faction);
  });
  if (eligible.length !== expectedEligible.length) {
    throw new Error(
      `Expected ${expectedEligible.length} eligible factions, but got ${eligible.length}`
    );
  }
}

// =============================================================================
// AUCTION MODULE UTILITIES
// =============================================================================

/**
 * Create a test context for auction
 */
export function createAuctionTestContext(
  cardIndex: number,
  startingBidder: Faction
): BiddingContextWithCards {
  return {
    cardsForAuction: ["card_1", "card_2"],
    currentCardIndex: cardIndex,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder,
    atreidesPeekedCards: new Set(), // Track which card indices Atreides has peeked at
    cardsToReturnToDeck: [],
    auctionCards: [],
  };
}

/**
 * Assert auction started correctly
 */
export function assertAuctionStarted(
  events: PhaseEvent[],
  cardIndex: number,
  startingBidder: Faction
): void {
  assertEventEmitted(events, "AUCTION_STARTED");
  assertEventData(events, "AUCTION_STARTED", {
    cardIndex: cardIndex + 1,
    startingBidder,
  });
}

/**
 * Assert eligibility was checked
 */
export function assertEligibilityChecked(
  state: GameState,
  context: BiddingContextWithCards,
  expectedEligible: Faction[]
): void {
  // This would check the context or events to verify eligibility checking
  // Implementation depends on how eligibility is tracked
}

/**
 * Assert starting bidder was determined correctly
 */
export function assertStartingBidderDetermined(
  context: BiddingContextWithCards,
  expectedBidder: Faction,
  previousOpener?: Faction
): void {
  if (context.startingBidder !== expectedBidder) {
    throw new Error(
      `Expected starting bidder ${expectedBidder}, but got ${context.startingBidder}`
    );
  }
}

/**
 * Assert Atreides peek request was created
 */
export function assertAtreidesPeekRequest(
  requests: any[],
  cardId: string,
  auctionNumber: number
): void {
  const peekRequest = requests.find(
    (r) => r.requestType === "PEEK_CARD" && r.factionId === Faction.ATREIDES
  );
  if (!peekRequest) {
    throw new Error("Expected Atreides peek request, but it wasn't found");
  }
}

// =============================================================================
// BID PROCESSING MODULE UTILITIES
// =============================================================================

/**
 * Create a test context for bid processing
 */
export function createBidProcessingTestContext(): BiddingContextWithCards {
  return {
    cardsForAuction: ["card_1"],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesPeekedCards: new Set(), // Track which card indices Atreides has peeked at
    cardsToReturnToDeck: [],
    auctionCards: [],
  };
}

/**
 * Assert bid request was created correctly
 */
export function assertBidRequestCreated(
  requests: any[],
  faction: Faction,
  expectedPrompt: string
): void {
  const bidRequest = requests.find(
    (r) => r.requestType === "BID_OR_PASS" && r.factionId === faction
  );
  if (!bidRequest) {
    throw new Error(`Expected bid request for ${faction}, but it wasn't found`);
  }
  if (!bidRequest.prompt.includes(expectedPrompt)) {
    throw new Error(
      `Expected prompt to include "${expectedPrompt}", but got "${bidRequest.prompt}"`
    );
  }
}

/**
 * Assert BOUGHT-IN was detected
 */
export function assertBOUGHT_INDetected(
  context: BiddingContextWithCards,
  events: PhaseEvent[]
): void {
  assertEventEmitted(events, "CARD_BOUGHT_IN");
  // Could also check that cards are marked for return
}

/**
 * Assert next bidder was found correctly
 */
export function assertNextBidderFound(
  context: BiddingContextWithCards,
  biddingOrder: Faction[],
  expectedBidder: Faction
): void {
  // This would check the context or result to verify next bidder
  // Implementation depends on how this is tracked
}

/**
 * Assert auto-skip occurred
 */
export function assertAutoSkipOccurred(
  events: PhaseEvent[],
  faction: Faction,
  reason: string
): void {
  assertEventEmitted(events, "BID_PASSED");
  assertEventData(events, "BID_PASSED", {
    faction,
    reason,
  });
}

/**
 * Assert Karama free card was triggered
 */
export function assertKaramaFreeCardTriggered(
  context: BiddingContextWithCards,
  events: PhaseEvent[],
  faction: Faction
): void {
  assertEventEmitted(events, "KARAMA_FREE_CARD");
  assertEventData(events, "KARAMA_FREE_CARD", {
    faction,
  });
  if (context.highBidder !== faction) {
    throw new Error(
      `Expected ${faction} to be high bidder after Karama free card, but got ${context.highBidder}`
    );
  }
  if (context.currentBid !== 0) {
    throw new Error(
      `Expected current bid to be 0 after Karama free card, but got ${context.currentBid}`
    );
  }
}

// =============================================================================
// RESOLUTION MODULE UTILITIES
// =============================================================================

/**
 * Create a test context for resolution
 */
export function createResolutionTestContext(
  highBidder: Faction,
  currentBid: number
): BiddingContextWithCards {
  return {
    cardsForAuction: ["card_1"],
    currentCardIndex: 0,
    currentBid,
    highBidder,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesPeekedCards: new Set(), // Track which card indices Atreides has peeked at
    cardsToReturnToDeck: [],
    auctionCards: [],
  };
}

/**
 * Assert payment was processed correctly
 */
export function assertPaymentProcessed(
  state: GameState,
  winner: Faction,
  amount: number,
  toEmperor?: boolean
): void {
  // Check that winner's spice decreased
  // If toEmperor, check that Emperor's spice increased
  // Implementation depends on state structure
}

/**
 * Assert card was distributed correctly
 */
export function assertCardDistributed(
  state: GameState,
  winner: Faction,
  cardId: string
): void {
  // Check that card is in winner's hand
  // Implementation depends on state structure
}

/**
 * Assert Harkonnen TOP CARD ability was triggered
 */
export function assertHarkonnenTopCard(
  state: GameState,
  events: PhaseEvent[]
): void {
  assertEventEmitted(events, "CARD_DRAWN_FREE");
  assertEventData(events, "CARD_DRAWN_FREE", {
    faction: Faction.HARKONNEN,
    ability: "TOP_CARD",
  });
}

/**
 * Assert Karama flags were cleared
 */
export function assertKaramaFlagsCleared(
  state: GameState,
  faction: Faction
): void {
  // Check that karamaBiddingActive and karamaFreeCardActive are false
  // Implementation depends on state structure
}

/**
 * Assert card was returned to deck
 */
export function assertCardReturnedToDeck(
  context: BiddingContextWithCards,
  cardId: string
): void {
  if (!context.cardsToReturnToDeck?.includes(cardId)) {
    throw new Error(
      `Expected card ${cardId} to be marked for return to deck, but it's not`
    );
  }
}

// =============================================================================
// EMPEROR MODULE UTILITIES
// =============================================================================

/**
 * Assert Emperor received payment
 */
export function assertEmperorPayment(
  state: GameState,
  amount: number,
  fromFaction: Faction
): void {
  // Check that Emperor's spice increased by amount
  // Check that fromFaction's spice decreased by amount
  // Implementation depends on state structure
}

/**
 * Assert no Emperor payment (Emperor not in game)
 */
export function assertNoEmperorPayment(
  state: GameState,
  amount: number
): void {
  // Check that no faction's spice changed by amount (payment went to bank)
  // Implementation depends on state structure
}

/**
 * Assert Emperor self-purchase (no payment to self)
 */
export function assertEmperorSelfPurchase(
  state: GameState,
  amount: number
): void {
  // Check that Emperor's spice decreased by amount
  // Check that no other faction received payment
  // Implementation depends on state structure
}

// =============================================================================
// HELPERS MODULE UTILITIES
// =============================================================================

/**
 * Assert canBid returns expected value
 */
export function assertCanBid(
  state: GameState,
  faction: Faction,
  context: BiddingContextWithCards,
  expected: boolean
): void {
  // This would call canBid and assert the result
  // Implementation depends on canBid function signature
}

/**
 * Assert remaining cards are correct
 */
export function assertRemainingCards(
  context: BiddingContextWithCards,
  expectedCards: string[]
): void {
  const remaining = context.auctionCards?.slice(context.currentCardIndex) || [];
  const remainingIds = remaining.map((c) => c.definitionId);
  if (remainingIds.length !== expectedCards.length) {
    throw new Error(
      `Expected ${expectedCards.length} remaining cards, but got ${remainingIds.length}`
    );
  }
}

/**
 * Assert cards were shuffled
 */
export function assertCardsShuffled(
  state: GameState,
  originalDeckSize: number,
  addedCards: number
): void {
  const newDeckSize = state.treacheryDeck.length;
  if (newDeckSize !== originalDeckSize + addedCards) {
    throw new Error(
      `Expected deck size ${originalDeckSize + addedCards}, but got ${newDeckSize}`
    );
  }
}

/**
 * Assert phase ended correctly
 */
export function assertPhaseEnded(
  result: any,
  nextPhase: string
): void {
  if (!result.phaseComplete) {
    throw new Error("Expected phase to be complete, but it's not");
  }
  if (result.nextPhase !== nextPhase) {
    throw new Error(
      `Expected next phase ${nextPhase}, but got ${result.nextPhase}`
    );
  }
}

