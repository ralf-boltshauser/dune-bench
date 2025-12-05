/**
 * Rule test: 1.04.08 END OF BIDDING
 * @rule-test 1.04.08
 *
 * Rule text (numbered_rules/1.md):
 * "Bidding for Treachery Cards continues until all cards available for bid have been auctioned off."
 *
 * These tests exercise the core behavior of ending the bidding phase:
 * - Bidding continues when there are more cards to auction
 * - Bidding ends when all cards have been auctioned (currentCardIndex >= cardsForAuction.length)
 * - Phase completes and transitions to REVIVAL phase
 * - BIDDING_COMPLETE event is emitted
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.08.end-of-bidding.test.ts
 */

import { Faction, CardLocation, Phase, type GameState, type TreacheryCard } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { resolveAuction } from "../../phases/handlers/bidding/resolution";
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
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });
}

function setFactionSpice(state: GameState, faction: Faction, spice: number): GameState {
  const factionState = getFactionState(state, faction);
  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      spice,
    }),
  };
}

function createBiddingContextWithCards(
  numCards: number,
  currentCardIndex: number,
  highBidder: Faction | null = null,
  currentBid: number = 0
): BiddingContextWithCards {
  const state = buildBaseState();
  const sampleCard = state.treacheryDeck[0];
  if (!sampleCard) {
    throw new Error("Cannot create context: treachery deck is empty");
  }

  const cardsForAuction: string[] = [];
  const auctionCards: TreacheryCard[] = [];

  for (let i = 0; i < numCards; i++) {
    const cardId = `test_card_${i}`;
    cardsForAuction.push(cardId);
    auctionCards.push({
      ...sampleCard,
      definitionId: cardId,
      location: CardLocation.DECK,
      ownerId: null,
    });
  }

  return {
    cardsForAuction,
    currentCardIndex,
    currentBid,
    highBidder,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesHasPeeked: false,
    auctionCards,
  };
}

// =============================================================================
// Tests for 1.04.08
// =============================================================================

function testEndOfBidding_ContinuesWhenMoreCards(): void {
  section("1.04.08 - bidding continues when there are more cards");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  // 3 cards total, currently on index 0 (first card)
  const context = createBiddingContextWithCards(3, 0, Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  // After resolving first card, should move to index 1 (second card)
  // Since 1 < 3, bidding should continue
  assert(
    result.context.currentCardIndex === 1,
    `current card index incremented to 1 (got ${result.context.currentCardIndex})`
  );
  assert(
    result.result.phaseComplete === false,
    "phase is not complete (more cards to auction)"
  );
  assert(
    result.result.nextPhase === undefined,
    "next phase not set (bidding continues)"
  );
}

function testEndOfBidding_EndsWhenAllCardsAuctioned(): void {
  section("1.04.08 - bidding ends when all cards have been auctioned");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  // 3 cards total, currently on index 2 (last card)
  const context = createBiddingContextWithCards(3, 2, Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  // After resolving last card, index becomes 3
  // Since 3 >= 3, bidding should end
  assert(
    result.context.currentCardIndex === 3,
    `current card index incremented to 3 (got ${result.context.currentCardIndex})`
  );
  assert(
    result.context.currentCardIndex >= result.context.cardsForAuction.length,
    `current card index (${result.context.currentCardIndex}) >= cardsForAuction.length (${result.context.cardsForAuction.length})`
  );
  assert(
    result.result.phaseComplete === true,
    "phase is complete (all cards auctioned)"
  );
  assert(
    result.result.nextPhase === Phase.REVIVAL,
    `next phase is REVIVAL (got ${result.result.nextPhase})`
  );
}

function testEndOfBidding_SingleCardScenario(): void {
  section("1.04.08 - single card scenario ends after one auction");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  // 1 card total, currently on index 0
  const context = createBiddingContextWithCards(1, 0, Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  // After resolving the only card, index becomes 1
  // Since 1 >= 1, bidding should end
  assert(
    result.context.currentCardIndex === 1,
    `current card index incremented to 1 (got ${result.context.currentCardIndex})`
  );
  assert(
    result.result.phaseComplete === true,
    "phase is complete (single card auctioned)"
  );
  assert(
    result.result.nextPhase === Phase.REVIVAL,
    `next phase is REVIVAL (got ${result.result.nextPhase})`
  );
}

function testEndOfBidding_BiddingCompleteEventEmitted(): void {
  section("1.04.08 - BIDDING_COMPLETE event is emitted when phase ends");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  // Last card
  const context = createBiddingContextWithCards(2, 1, Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  const biddingCompleteEvent = result.result.events.find(
    (e) => e.type === "BIDDING_COMPLETE"
  );

  assert(
    biddingCompleteEvent !== undefined,
    "BIDDING_COMPLETE event is emitted"
  );
  assert(
    result.result.phaseComplete === true,
    "phase is complete"
  );
}

function testEndOfBidding_ContinuesAtBoundary(): void {
  section("1.04.08 - bidding continues when index is just before boundary");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  // 3 cards total, currently on index 1 (second card)
  // After resolving, index becomes 2, which is still < 3, so continues
  const context = createBiddingContextWithCards(3, 1, Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  assert(
    result.context.currentCardIndex === 2,
    `current card index is 2 (got ${result.context.currentCardIndex})`
  );
  assert(
    result.context.currentCardIndex < result.context.cardsForAuction.length,
    `current card index (${result.context.currentCardIndex}) < cardsForAuction.length (${result.context.cardsForAuction.length})`
  );
  assert(
    result.result.phaseComplete === false,
    "phase continues (not at boundary yet)"
  );
}

function testEndOfBidding_NoBidderScenario(): void {
  section("1.04.08 - bidding ends even when no bidder (card returned to deck)");

  let state = buildBaseState();

  // Last card, no bidder (everyone passed)
  const context = createBiddingContextWithCards(2, 1, null, 0);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  // Should still end when all cards processed, even if no bidder
  assert(
    result.context.currentCardIndex === 2,
    `current card index incremented to 2 (got ${result.context.currentCardIndex})`
  );
  assert(
    result.result.phaseComplete === true,
    "phase is complete (all cards processed, even with no bidder)"
  );
  assert(
    result.result.nextPhase === Phase.REVIVAL,
    `next phase is REVIVAL (got ${result.result.nextPhase})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.08 END OF BIDDING tests...\n");

  testEndOfBidding_ContinuesWhenMoreCards();
  testEndOfBidding_EndsWhenAllCardsAuctioned();
  testEndOfBidding_SingleCardScenario();
  testEndOfBidding_BiddingCompleteEventEmitted();
  testEndOfBidding_ContinuesAtBoundary();
  testEndOfBidding_NoBidderScenario();

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

