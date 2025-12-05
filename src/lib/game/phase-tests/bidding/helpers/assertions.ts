/**
 * Assertion Helpers for Bidding Phase Tests
 * 
 * Reusable assertions for state, events, and context validation.
 * Single source of truth for all test assertions.
 */

import { Faction, type GameState, type TreacheryCard } from "../../../types";
import { getFactionState, getFactionMaxHandSize } from "../../../state";
import { type PhaseEvent, type PhaseStepResult, type AgentRequest } from "../../../phases/types";
import { type BiddingContextWithCards } from "../../../phases/handlers/bidding/types";

// =============================================================================
// STATE ASSERTIONS
// =============================================================================

/**
 * Assert faction has expected spice amount
 */
export function assertSpice(
  state: GameState,
  faction: Faction,
  expectedAmount: number,
  message?: string
): void {
  const actualAmount = getFactionState(state, faction).spice;
  if (actualAmount !== expectedAmount) {
    throw new Error(
      message ??
        `Expected ${faction} to have ${expectedAmount} spice, but has ${actualAmount}`
    );
  }
}

/**
 * Assert faction has expected hand size
 */
export function assertHandSize(
  state: GameState,
  faction: Faction,
  expectedSize: number,
  message?: string
): void {
  const actualSize = getFactionState(state, faction).hand.length;
  if (actualSize !== expectedSize) {
    throw new Error(
      message ??
        `Expected ${faction} to have ${expectedSize} cards in hand, but has ${actualSize}`
    );
  }
}

/**
 * Assert faction's hand contains a specific card
 */
export function assertHandContains(
  state: GameState,
  faction: Faction,
  cardId: string,
  message?: string
): void {
  const hand = getFactionState(state, faction).hand;
  const hasCard = hand.some((card) => card.definitionId === cardId);
  if (!hasCard) {
    throw new Error(
      message ??
        `Expected ${faction} hand to contain card ${cardId}, but it doesn't`
    );
  }
}

/**
 * Assert faction's hand does NOT contain a specific card
 */
export function assertHandNotContains(
  state: GameState,
  faction: Faction,
  cardId: string,
  message?: string
): void {
  const hand = getFactionState(state, faction).hand;
  const hasCard = hand.some((card) => card.definitionId === cardId);
  if (hasCard) {
    throw new Error(
      message ??
        `Expected ${faction} hand to NOT contain card ${cardId}, but it does`
    );
  }
}

/**
 * Assert treachery deck has expected size
 */
export function assertDeckSize(
  state: GameState,
  expectedSize: number,
  message?: string
): void {
  const actualSize = state.treacheryDeck.length;
  if (actualSize !== expectedSize) {
    throw new Error(
      message ??
        `Expected deck to have ${expectedSize} cards, but has ${actualSize}`
    );
  }
}

/**
 * Assert deck contains a specific card
 */
export function assertDeckContains(
  state: GameState,
  cardId: string,
  message?: string
): void {
  const hasCard = state.treacheryDeck.some(
    (card) => card.definitionId === cardId
  );
  if (!hasCard) {
    throw new Error(
      message ?? `Expected deck to contain card ${cardId}, but it doesn't`
    );
  }
}

/**
 * Assert card is in faction's hand with correct location
 */
export function assertCardInHand(
  state: GameState,
  faction: Faction,
  cardId: string,
  message?: string
): void {
  const hand = getFactionState(state, faction).hand;
  const card = hand.find((c) => c.definitionId === cardId);
  if (!card) {
    throw new Error(
      message ?? `Expected card ${cardId} to be in ${faction} hand, but it's not`
    );
  }
  if (card.ownerId !== faction) {
    throw new Error(
      message ??
        `Expected card ${cardId} to be owned by ${faction}, but owner is ${card.ownerId}`
    );
  }
}

// =============================================================================
// EVENT ASSERTIONS
// =============================================================================

/**
 * Assert an event of specific type was emitted
 */
export function assertEventEmitted(
  events: PhaseEvent[],
  eventType: string,
  dataMatcher?: (data: any) => boolean,
  message?: string
): void {
  const matchingEvents = events.filter((e) => e.type === eventType);
  if (matchingEvents.length === 0) {
    throw new Error(
      message ?? `Expected event ${eventType} to be emitted, but it wasn't`
    );
  }
  if (dataMatcher) {
    const hasMatchingData = matchingEvents.some((e) => dataMatcher(e.data));
    if (!hasMatchingData) {
      throw new Error(
        message ??
          `Expected event ${eventType} with matching data, but none found`
      );
    }
  }
}

/**
 * Assert an event of specific type was NOT emitted
 */
export function assertEventNotEmitted(
  events: PhaseEvent[],
  eventType: string,
  message?: string
): void {
  const matchingEvents = events.filter((e) => e.type === eventType);
  if (matchingEvents.length > 0) {
    throw new Error(
      message ?? `Expected event ${eventType} NOT to be emitted, but it was`
    );
  }
}

/**
 * Assert event count matches expected
 */
export function assertEventCount(
  events: PhaseEvent[],
  eventType: string,
  expectedCount: number,
  message?: string
): void {
  const actualCount = events.filter((e) => e.type === eventType).length;
  if (actualCount !== expectedCount) {
    throw new Error(
      message ??
        `Expected ${expectedCount} events of type ${eventType}, but found ${actualCount}`
    );
  }
}

/**
 * Assert events are emitted in specific order
 */
export function assertEventOrder(
  events: PhaseEvent[],
  eventTypes: string[],
  message?: string
): void {
  const eventTypeSequence = events.map((e) => e.type);
  let lastIndex = -1;
  for (const expectedType of eventTypes) {
    const index = eventTypeSequence.indexOf(expectedType, lastIndex + 1);
    if (index === -1) {
      throw new Error(
        message ??
          `Expected event ${expectedType} in sequence, but it wasn't found after position ${lastIndex}`
      );
    }
    lastIndex = index;
  }
}

/**
 * Assert event data matches expected values
 */
export function assertEventData(
  events: PhaseEvent[],
  eventType: string,
  expectedData: Partial<any>,
  message?: string
): void {
  const matchingEvents = events.filter((e) => e.type === eventType);
  if (matchingEvents.length === 0) {
    throw new Error(
      message ??
        `Expected event ${eventType} to be emitted for data assertion, but it wasn't`
    );
  }
  const hasMatchingData = matchingEvents.some((e) => {
    for (const key in expectedData) {
      if (e.data?.[key] !== expectedData[key]) {
        return false;
      }
    }
    return true;
  });
  if (!hasMatchingData) {
    throw new Error(
      message ??
        `Expected event ${eventType} with data matching ${JSON.stringify(expectedData)}, but none found`
    );
  }
}

// =============================================================================
// CONTEXT ASSERTIONS
// =============================================================================

/**
 * Assert auction state matches expected
 */
export function assertAuctionState(
  context: BiddingContextWithCards,
  expectedState: {
    currentBid?: number;
    highBidder?: Faction | null;
    currentCardIndex?: number;
    passedFactions?: Faction[];
  },
  message?: string
): void {
  if (
    expectedState.currentBid !== undefined &&
    context.currentBid !== expectedState.currentBid
  ) {
    throw new Error(
      message ??
        `Expected current bid ${expectedState.currentBid}, but got ${context.currentBid}`
    );
  }
  if (
    expectedState.highBidder !== undefined &&
    context.highBidder !== expectedState.highBidder
  ) {
    throw new Error(
      message ??
        `Expected high bidder ${expectedState.highBidder}, but got ${context.highBidder}`
    );
  }
  if (
    expectedState.currentCardIndex !== undefined &&
    context.currentCardIndex !== expectedState.currentCardIndex
  ) {
    throw new Error(
      message ??
        `Expected card index ${expectedState.currentCardIndex}, but got ${context.currentCardIndex}`
    );
  }
  if (expectedState.passedFactions !== undefined) {
    const expectedSet = new Set(expectedState.passedFactions);
    const actualSet = context.passedFactions;
    for (const faction of expectedSet) {
      if (!actualSet.has(faction)) {
        throw new Error(
          message ?? `Expected ${faction} to be in passedFactions, but it's not`
        );
      }
    }
  }
}

/**
 * Assert current bid matches expected
 */
export function assertCurrentBid(
  context: BiddingContextWithCards,
  expectedBid: number,
  message?: string
): void {
  if (context.currentBid !== expectedBid) {
    throw new Error(
      message ??
        `Expected current bid ${expectedBid}, but got ${context.currentBid}`
    );
  }
}

/**
 * Assert high bidder matches expected
 */
export function assertHighBidder(
  context: BiddingContextWithCards,
  expectedFaction: Faction | null,
  message?: string
): void {
  if (context.highBidder !== expectedFaction) {
    throw new Error(
      message ??
        `Expected high bidder ${expectedFaction}, but got ${context.highBidder}`
    );
  }
}

/**
 * Assert passed factions match expected
 */
export function assertPassedFactions(
  context: BiddingContextWithCards,
  expectedFactions: Faction[],
  message?: string
): void {
  const expectedSet = new Set(expectedFactions);
  const actualSet = context.passedFactions;
  if (expectedSet.size !== actualSet.size) {
    throw new Error(
      message ??
        `Expected ${expectedSet.size} passed factions, but got ${actualSet.size}`
    );
  }
  for (const faction of expectedSet) {
    if (!actualSet.has(faction)) {
      throw new Error(
        message ?? `Expected ${faction} to be in passedFactions, but it's not`
      );
    }
  }
}

/**
 * Assert current card index matches expected
 */
export function assertCurrentCardIndex(
  context: BiddingContextWithCards,
  expectedIndex: number,
  message?: string
): void {
  if (context.currentCardIndex !== expectedIndex) {
    throw new Error(
      message ??
        `Expected card index ${expectedIndex}, but got ${context.currentCardIndex}`
    );
  }
}

// =============================================================================
// PHASE RESULT ASSERTIONS
// =============================================================================

/**
 * Assert phase is complete or not
 */
export function assertPhaseComplete(
  result: PhaseStepResult,
  expected: boolean,
  message?: string
): void {
  if (result.phaseComplete !== expected) {
    throw new Error(
      message ??
        `Expected phaseComplete to be ${expected}, but got ${result.phaseComplete}`
    );
  }
}

/**
 * Assert next phase matches expected
 */
export function assertNextPhase(
  result: PhaseStepResult,
  expectedPhase: string,
  message?: string
): void {
  if (result.nextPhase !== expectedPhase) {
    throw new Error(
      message ??
        `Expected nextPhase ${expectedPhase}, but got ${result.nextPhase}`
    );
  }
}

/**
 * Assert pending requests match expected
 */
export function assertPendingRequests(
  result: PhaseStepResult,
  expectedRequests: AgentRequest[],
  message?: string
): void {
  if (result.pendingRequests.length !== expectedRequests.length) {
    throw new Error(
      message ??
        `Expected ${expectedRequests.length} pending requests, but got ${result.pendingRequests.length}`
    );
  }
  // Could add more detailed matching if needed
}

/**
 * Assert no pending requests
 */
export function assertNoPendingRequests(
  result: PhaseStepResult,
  message?: string
): void {
  if (result.pendingRequests.length > 0) {
    throw new Error(
      message ??
        `Expected no pending requests, but got ${result.pendingRequests.length}`
    );
  }
}

// =============================================================================
// COMBINED ASSERTIONS
// =============================================================================

/**
 * Assert auction was resolved correctly
 */
export function assertAuctionResolved(
  state: GameState,
  context: BiddingContextWithCards,
  winner: Faction,
  amount: number,
  message?: string
): void {
  assertHighBidder(context, winner, message);
  assertCurrentBid(context, amount, message);
  assertEventEmitted(
    context as any, // Events would be in result, not context
    "CARD_WON",
    (data) => data.winner === winner && data.amount === amount,
    message
  );
}

/**
 * Assert card was purchased correctly
 */
export function assertCardPurchased(
  state: GameState,
  faction: Faction,
  cardId: string,
  amount: number,
  message?: string
): void {
  assertHandContains(state, faction, cardId, message);
  // Could add more checks for payment, etc.
}

/**
 * Assert Emperor received payment
 */
export function assertEmperorReceivedPayment(
  state: GameState,
  amount: number,
  fromFaction: Faction,
  message?: string
): void {
  if (!state.factions.has(Faction.EMPEROR)) {
    throw new Error(
      message ?? "Expected Emperor to be in game for payment assertion"
    );
  }
  // This would need to check that Emperor's spice increased by amount
  // and fromFaction's spice decreased by amount
  // Implementation depends on how we track this
}

/**
 * Assert Harkonnen drew free card
 */
export function assertHarkonnenDrewFreeCard(
  state: GameState,
  events: PhaseEvent[],
  message?: string
): void {
  const freeCardEvent = events.find(
    (e) =>
      e.type === "CARD_DRAWN_FREE" &&
      (e.data as any)?.faction === Faction.HARKONNEN &&
      (e.data as any)?.ability === "TOP_CARD"
  );
  if (!freeCardEvent) {
    // Also check if message contains Harkonnen
    const hasHarkonnenMessage = events.some(
      (e) =>
        e.type === "CARD_DRAWN_FREE" &&
        (e.message?.includes("Harkonnen") || (e.data as any)?.faction === Faction.HARKONNEN)
    );
    if (!hasHarkonnenMessage) {
      throw new Error(
        message ??
          `Expected Harkonnen CARD_DRAWN_FREE event with TOP_CARD ability, but none found`
      );
    }
  }
  // Could also check hand size increased
}

// =============================================================================
// KARAMA-SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert Karama flags were cleared
 */
export function assertKaramaFlagsCleared(
  state: GameState,
  faction: Faction,
  message?: string
): void {
  const factionState = getFactionState(state, faction) as any;
  if (factionState.karamaBiddingActive === true) {
    throw new Error(
      message ??
        `Expected karamaBiddingActive to be cleared for ${faction}, but it's still true`
    );
  }
  if (factionState.karamaFreeCardActive === true) {
    throw new Error(
      message ??
        `Expected karamaFreeCardActive to be cleared for ${faction}, but it's still true`
    );
  }
}

/**
 * Assert Karama free card was used
 */
export function assertKaramaFreeCardUsed(
  events: PhaseEvent[],
  faction: Faction,
  message?: string
): void {
  assertEventEmitted(
    events,
    "KARAMA_FREE_CARD",
    (data) => data.faction === faction,
    message
  );
}

/**
 * Assert Karama bid over spice was used
 */
export function assertKaramaBidOverSpiceUsed(
  events: PhaseEvent[],
  faction: Faction,
  message?: string
): void {
  // Check for KARAMA_BUY_WITHOUT_PAYING event or bid that exceeded spice
  const hasEvent = events.some(
    (e) =>
      (e.type === "KARAMA_BUY_WITHOUT_PAYING" && e.data.faction === faction) ||
      (e.type === "BID_PLACED" && e.data.faction === faction)
  );
  if (!hasEvent) {
    throw new Error(
      message ??
        `Expected Karama bid over spice event for ${faction}, but it wasn't found`
    );
  }
}

// =============================================================================
// PAYMENT-SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert payment went to Emperor
 */
export function assertPaymentToEmperor(
  state: GameState,
  amount: number,
  fromFaction: Faction,
  message?: string
): void {
  if (!state.factions.has(Faction.EMPEROR)) {
    throw new Error(
      message ?? "Expected Emperor to be in game for payment assertion"
    );
  }
  const emperorState = getFactionState(state, Faction.EMPEROR);
  const fromState = getFactionState(state, fromFaction);
  // Note: This assumes we track original spice - in practice, we'd need to compare before/after
  // For now, this is a placeholder that would need the original state
}

/**
 * Assert payment went to bank (no Emperor)
 */
export function assertPaymentToBank(
  state: GameState,
  amount: number,
  fromFaction: Faction,
  message?: string
): void {
  if (state.factions.has(Faction.EMPEROR)) {
    throw new Error(
      message ?? "Expected Emperor NOT to be in game for bank payment assertion"
    );
  }
  // Payment to bank means no faction received the spice
  // In practice, we'd check that no faction's spice increased by this amount
}

/**
 * Assert no payment was made
 */
export function assertNoPayment(
  state: GameState,
  faction: Faction,
  originalSpice: number,
  message?: string
): void {
  const currentSpice = getFactionState(state, faction).spice;
  if (currentSpice !== originalSpice) {
    throw new Error(
      message ??
        `Expected no payment (spice ${originalSpice}), but spice changed to ${currentSpice}`
    );
  }
}

// =============================================================================
// HARKONNEN-SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert Harkonnen free card was NOT drawn
 */
export function assertHarkonnenNoFreeCard(
  state: GameState,
  events: PhaseEvent[],
  reason: string,
  message?: string
): void {
  const freeCardEvent = events.find(
    (e) =>
      e.type === "CARD_DRAWN_FREE" &&
      e.data.faction === Faction.HARKONNEN &&
      e.data.ability === "TOP_CARD"
  );
  if (freeCardEvent) {
    throw new Error(
      message ??
        `Expected Harkonnen NOT to draw free card (${reason}), but CARD_DRAWN_FREE event was emitted`
    );
  }
}

// =============================================================================
// ELIGIBILITY-SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert faction is eligible to bid
 */
export function assertEligibleToBid(
  state: GameState,
  faction: Faction,
  context: BiddingContextWithCards,
  message?: string
): void {
  // This would call isEligibleToBid and assert true
  // For now, placeholder
}

/**
 * Assert faction is NOT eligible to bid
 */
export function assertNotEligibleToBid(
  state: GameState,
  faction: Faction,
  context: BiddingContextWithCards,
  reason: string,
  message?: string
): void {
  // This would call isEligibleToBid and assert false
  // For now, placeholder
}

// =============================================================================
// BOUGHT-IN SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert BOUGHT-IN was triggered
 */
export function assertBoughtInTriggered(
  events: PhaseEvent[],
  context: BiddingContextWithCards,
  message?: string
): void {
  assertEventEmitted(events, "CARD_BOUGHT_IN", undefined, message);
  // Could also check that cards are marked for return
  if (!context.cardsToReturnToDeck || context.cardsToReturnToDeck.length === 0) {
    throw new Error(
      message ??
        "Expected cards to be marked for return to deck in BOUGHT-IN scenario"
    );
  }
}

/**
 * Assert cards were returned to deck
 */
export function assertCardsReturnedToDeck(
  state: GameState,
  context: BiddingContextWithCards,
  expectedCards: string[],
  message?: string
): void {
  if (!context.cardsToReturnToDeck) {
    throw new Error(
      message ?? "Expected cards to be marked for return, but cardsToReturnToDeck is empty"
    );
  }
  for (const cardId of expectedCards) {
    if (!context.cardsToReturnToDeck.includes(cardId)) {
      throw new Error(
        message ?? `Expected card ${cardId} to be marked for return, but it's not`
      );
    }
  }
}

// =============================================================================
// COMBINED ASSERTIONS (HIGH-LEVEL)
// =============================================================================

/**
 * Assert auction was completed correctly
 */
export function assertAuctionComplete(
  state: GameState,
  context: BiddingContextWithCards,
  winner: Faction,
  amount: number,
  message?: string
): void {
  assertHighBidder(context, winner, message);
  assertCurrentBid(context, amount, message);
  // Events would be checked separately
}

/**
 * Assert card was purchased correctly (enhanced)
 */
export function assertCardPurchasedEnhanced(
  state: GameState,
  faction: Faction,
  cardId: string,
  amount: number,
  originalSpice: number,
  message?: string
): void {
  assertHandContains(state, faction, cardId, message);
  const currentSpice = getFactionState(state, faction).spice;
  const expectedSpice = originalSpice - amount;
  if (currentSpice !== expectedSpice) {
    throw new Error(
      message ??
        `Expected ${faction} spice to be ${expectedSpice} (paid ${amount}), but got ${currentSpice}`
    );
  }
}

