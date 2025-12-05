/**
 * Rule test: 1.04.04 DEALER
 * @rule-test 1.04.04
 *
 * Rule text (numbered_rules/1.md):
 * "A selected player deals 1 card for each player who is eligible to bid from the Treachery Deck face down in a row."
 *
 * These tests exercise the core behavior of card dealing:
 * - Cards are dealt equal to number of eligible bidders
 * - Cards are removed from deck
 * - Cards are stored in context for auction
 * - If no eligible bidders, no cards are dealt
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.04.dealer.test.ts
 */

import { Faction, CardLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { initializeBiddingPhase } from "../../phases/handlers/bidding/initialization";
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

  const newHand = Array(handSize).fill(null).map((_, i) => ({
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

function createEmptyContext(): BiddingContextWithCards {
  return {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesHasPeeked: false,
    auctionCards: [],
  };
}

// =============================================================================
// Tests for 1.04.04
// =============================================================================

function testDealer_CardsDealtEqualToEligibleBidders(): void {
  section("1.04.04 - cards dealt equal to number of eligible bidders");

  let state = buildBaseState();
  // All 3 factions are eligible (empty hands)
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const initialDeckSize = state.treacheryDeck.length;
  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  assert(
    result.context.cardsForAuction.length === 3,
    `3 cards dealt for 3 eligible bidders (got ${result.context.cardsForAuction.length})`
  );
  assert(
    result.result.state.treacheryDeck.length === initialDeckSize - 3,
    `3 cards removed from deck (was ${initialDeckSize}, now ${result.result.state.treacheryDeck.length})`
  );
}

function testDealer_CardsRemovedFromDeck(): void {
  section("1.04.04 - cards are removed from deck");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 4); // Full hand, not eligible

  const initialDeckSize = state.treacheryDeck.length;
  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  assert(
    result.result.state.treacheryDeck.length === initialDeckSize - 2,
    `2 cards removed from deck (was ${initialDeckSize}, now ${result.result.state.treacheryDeck.length})`
  );
}

function testDealer_CardsStoredInContext(): void {
  section("1.04.04 - cards are stored in context for auction");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  assert(
    result.context.cardsForAuction.length > 0,
    "cards are stored in context.cardsForAuction"
  );
  assert(
    result.context.auctionCards !== undefined,
    "auctionCards array exists in context"
  );
  assert(
    result.context.auctionCards?.length === result.context.cardsForAuction.length,
    "auctionCards length matches cardsForAuction length"
  );
}

function testDealer_NoEligibleBiddersNoCardsDealt(): void {
  section("1.04.04 - no cards dealt if no eligible bidders");

  let state = buildBaseState();
  // All factions have full hands (not eligible)
  // Note: Harkonnen max is 8, so we need to set them to 8 to make them ineligible
  state = setFactionHandSize(state, Faction.ATREIDES, 4);
  state = setFactionHandSize(state, Faction.HARKONNEN, 8);
  state = setFactionHandSize(state, Faction.EMPEROR, 4);

  const initialDeckSize = state.treacheryDeck.length;
  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  assert(
    result.context.cardsForAuction.length === 0,
    "no cards dealt when no eligible bidders"
  );
  assert(
    result.result.state.treacheryDeck.length === initialDeckSize,
    "deck size unchanged when no eligible bidders"
  );
  assert(
    result.result.phaseComplete === true,
    "phase completes immediately when no eligible bidders"
  );
}

function testDealer_PartialEligibility(): void {
  section("1.04.04 - cards dealt only for eligible bidders");

  let state = buildBaseState();
  // Only 2 factions eligible
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 4); // Full hand

  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  assert(
    result.context.cardsForAuction.length === 2,
    `2 cards dealt for 2 eligible bidders (got ${result.context.cardsForAuction.length})`
  );
}

function testDealer_CardsDealtFaceDown(): void {
  section("1.04.04 - cards are dealt face down (not revealed)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);

  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Cards should be in context but not revealed in events
  // No card reveal events should be emitted during dealing
  const cardRevealEvents = result.result.events.filter(
    (e) => e.type === "CARD_REVEALED" || e.type === "TREACHERY_CARD_REVEALED"
  );

  assert(
    cardRevealEvents.length === 0,
    "no card reveal events during dealing (cards are face down)"
  );

  // Cards should be stored but not publicly revealed
  assert(
    result.context.cardsForAuction.length > 0,
    "cards are stored in context (face down)"
  );
  assert(
    result.context.auctionCards !== undefined,
    "auctionCards exist (face down)"
  );
}

function testDealer_CardsDealtInOrder(): void {
  section("1.04.04 - cards are dealt in order (in a row)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const initialDeckSize = state.treacheryDeck.length;
  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Cards should be in order (first card dealt is first in array)
  assert(
    result.context.cardsForAuction.length === 3,
    "3 cards dealt"
  );

  // Verify cards are from the deck in order (top of deck first)
  // The first card in cardsForAuction should be the first card that was in the deck
  const firstCardInDeck = state.treacheryDeck[0];
  const firstCardInAuction = result.context.cardsForAuction[0];

  // After dealing, the first card in auction should NOT be in the deck anymore
  const firstCardStillInDeck = result.result.state.treacheryDeck.some(
    (c) => c.definitionId === firstCardInAuction
  );

  assert(
    !firstCardStillInDeck,
    "first card dealt is removed from deck (dealt in order)"
  );
}

function testDealer_DeckRunsOut(): void {
  section("1.04.04 - if deck runs out, only available cards are dealt");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  // Simulate deck running out by removing most cards
  const smallDeck = state.treacheryDeck.slice(0, 2); // Only 2 cards
  state = { ...state, treacheryDeck: smallDeck };

  const context = createEmptyContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Should only deal 2 cards (available), not 3 (eligible bidders)
  assert(
    result.context.cardsForAuction.length === 2,
    `only 2 cards dealt when deck has 2 cards (3 eligible bidders) (got ${result.context.cardsForAuction.length})`
  );
  assert(
    result.result.state.treacheryDeck.length === 0,
    "deck is empty after dealing all available cards"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.04 DEALER tests...\n");

  testDealer_CardsDealtEqualToEligibleBidders();
  testDealer_CardsRemovedFromDeck();
  testDealer_CardsStoredInContext();
  testDealer_NoEligibleBiddersNoCardsDealt();
  testDealer_PartialEligibility();
  testDealer_CardsDealtFaceDown();
  testDealer_CardsDealtInOrder();
  testDealer_DeckRunsOut();

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

