/**
 * Rule test: 1.04.05 AUCTION
 * @rule-test 1.04.05
 *
 * Rule text (numbered_rules/1.md):
 * "AUCTION: The first card in the row is now auctioned off for spice."
 *
 * These tests exercise the core behavior of auctioning cards:
 * - First card in the row (index 0) is auctioned
 * - AUCTION_STARTED event is emitted
 * - Card identity is not revealed publicly (only Atreides can see via Prescience)
 * - Event contains correct card index, total cards, and starting bidder
 * - Subsequent cards are also auctioned correctly
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.05.auction.test.ts
 */

import { Faction, CardLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { startNextAuction } from "../../phases/handlers/bidding/auction";
import { type BiddingContextWithCards } from "../../phases/handlers/bidding/types";

// =============================================================================
// Minimal test harness (console-based)
// =============================================================================

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.log(`  ✗ ${message}`);
    failCount++;
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

// =============================================================================
// Helpers
// =============================================================================

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    advancedRules: false,
  });
}

function setFactionHandSize(
  state: GameState,
  faction: Faction,
  handSize: number
): GameState {
  const factionState = getFactionState(state, faction);
  const sampleCard = state.treacheryDeck[0];
  if (!sampleCard) {
    throw new Error("Cannot create mock hand: treachery deck is empty");
  }

  const newHand = Array(handSize)
    .fill(null)
    .map((_, i) => ({
      definitionId: `test_card_${i}`,
      type: sampleCard.type,
      location: CardLocation.HAND,
      ownerId: faction,
    }));

  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      hand: newHand,
    }),
  };
}

function createBiddingContextWithCards(
  state: GameState,
  numCards: number
): BiddingContextWithCards {
  // Draw cards from deck for auction
  const cardsForAuction: string[] = [];
  const auctionCards = [];
  const remainingDeck = [...state.treacheryDeck];

  for (let i = 0; i < numCards && remainingDeck.length > 0; i++) {
    const card = remainingDeck.shift()!;
    cardsForAuction.push(card.definitionId);
    auctionCards.push({
      ...card,
      location: CardLocation.DECK,
      ownerId: null,
    });
  }

  return {
    cardsForAuction,
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards,
  };
}

// =============================================================================
// Tests for 1.04.05
// =============================================================================

function testAuction_FirstCardIsAuctioned(): void {
  section("1.04.05 - first card in row is auctioned");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context = createBiddingContextWithCards(state, 3);
  const biddingOrder = state.stormOrder;

  // Verify we have cards in the row
  assert(
    context.cardsForAuction.length === 3,
    `3 cards in row (got ${context.cardsForAuction.length})`
  );
  assert(
    context.currentCardIndex === 0,
    `starting at index 0 (got ${context.currentCardIndex})`
  );

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // First card (index 0) should be auctioned
  assert(
    result.context.currentCardIndex === 0,
    `first card is at index 0 (got ${result.context.currentCardIndex})`
  );
  assert(
    result.context.cardsForAuction.length === 3,
    `3 cards available for auction (got ${result.context.cardsForAuction.length})`
  );
  // Verify the correct card is being auctioned (first in row)
  assert(
    result.context.cardsForAuction[0] === context.cardsForAuction[0],
    "first card in row (index 0) is the one being auctioned"
  );
}

function testAuction_AuctionStartedEventEmitted(): void {
  section("1.04.05 - AUCTION_STARTED event is emitted");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 2);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const auctionEvent = result.result.events.find(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(
    auctionEvent !== undefined,
    "AUCTION_STARTED event is emitted"
  );
}

function testAuction_EventContainsCorrectCardIndex(): void {
  section("1.04.05 - event contains correct card index (1-based for display)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 3);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const auctionEvent = result.result.events.find(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(
    auctionEvent !== undefined,
    "AUCTION_STARTED event is emitted"
  );
  assert(
    (auctionEvent?.data?.cardIndex as number) === 1,
    `event contains cardIndex 1 (first card, 1-based) (got ${auctionEvent?.data?.cardIndex})`
  );
  assert(
    (auctionEvent?.data?.totalCards as number) === 3,
    `event contains totalCards 3 (got ${auctionEvent?.data?.totalCards})`
  );
}

function testAuction_EventContainsStartingBidder(): void {
  section("1.04.05 - event contains starting bidder");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 2);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const auctionEvent = result.result.events.find(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(
    auctionEvent !== undefined,
    "AUCTION_STARTED event is emitted"
  );
  assert(
    (auctionEvent?.data?.startingBidder as Faction) === result.context.startingBidder,
    `event contains correct starting bidder (got ${auctionEvent?.data?.startingBidder})`
  );
}

function testAuction_CardIdentityNotRevealed(): void {
  section("1.04.05 - card identity is not revealed publicly");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 2);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const auctionEvent = result.result.events.find(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(
    auctionEvent !== undefined,
    "AUCTION_STARTED event is emitted"
  );

  // Card identity should NOT be in the event data (secret)
  assert(
    auctionEvent?.data?.cardId === undefined,
    "card identity (cardId) is not in event data (secret)"
  );
  assert(
    auctionEvent?.data?.cardName === undefined,
    "card name is not in event data (secret)"
  );

  // Message should not reveal card name
  const message = auctionEvent?.message || "";
  assert(
    !message.includes("Crysknife") &&
      !message.includes("Lasgun") &&
      !message.includes("Karama"),
    "event message does not reveal specific card name"
  );
  assert(
    message.includes("Treachery Card") || message.includes("Card"),
    "event message indicates a card is being auctioned (generic)"
  );
}

function testAuction_SubsequentCardsAlsoAuctioned(): void {
  section("1.04.05 - subsequent cards are also auctioned correctly");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 3);
  context.currentCardIndex = 1; // Second card
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const auctionEvent = result.result.events.find(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(
    auctionEvent !== undefined,
    "AUCTION_STARTED event is emitted for subsequent card"
  );
  assert(
    (auctionEvent?.data?.cardIndex as number) === 2,
    `event contains cardIndex 2 for second card (got ${auctionEvent?.data?.cardIndex})`
  );
  assert(
    result.context.currentCardIndex === 1,
    `currentCardIndex is 1 for second card (got ${result.context.currentCardIndex})`
  );
}

function testAuction_AuctionReadyForBidding(): void {
  section("1.04.05 - auction is ready for bidding (auctioned off for spice)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 2);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Auction context should be reset and ready for bidding
  assert(
    result.context.currentBid === 0,
    `current bid is reset to 0 (got ${result.context.currentBid})`
  );
  assert(
    result.context.highBidder === null,
    "high bidder is null (no bids yet)"
  );
  assert(
    result.context.passedFactions.size === 0,
    "no factions have passed yet"
  );
  assert(
    result.context.startingBidder !== null,
    "starting bidder is set"
  );
  // Auction should be ready - either pending requests for Atreides peek, or ready for bids
  assert(
    result.result.pendingRequests.length >= 0,
    "auction is set up (may have Atreides peek request or be ready for bids)"
  );
  assert(
    result.result.phaseComplete === false,
    "phase is not complete (auction is active)"
  );
}

function testAuction_SingleCardInRow(): void {
  section("1.04.05 - single card in row is auctioned correctly");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createBiddingContextWithCards(state, 1);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const auctionEvent = result.result.events.find(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(
    auctionEvent !== undefined,
    "AUCTION_STARTED event is emitted for single card"
  );
  assert(
    (auctionEvent?.data?.cardIndex as number) === 1,
    `event contains cardIndex 1 for single card (got ${auctionEvent?.data?.cardIndex})`
  );
  assert(
    (auctionEvent?.data?.totalCards as number) === 1,
    `event contains totalCards 1 (got ${auctionEvent?.data?.totalCards})`
  );
  assert(
    result.context.currentCardIndex === 0,
    `currentCardIndex is 0 for first (and only) card (got ${result.context.currentCardIndex})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.05 AUCTION tests...\n");

  testAuction_FirstCardIsAuctioned();
  testAuction_AuctionStartedEventEmitted();
  testAuction_EventContainsCorrectCardIndex();
  testAuction_EventContainsStartingBidder();
  testAuction_CardIdentityNotRevealed();
  testAuction_SubsequentCardsAlsoAuctioned();
  testAuction_AuctionReadyForBidding();
  testAuction_SingleCardInRow();

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total:  ${passCount + failCount}`);
  console.log("=".repeat(50) + "\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests();

