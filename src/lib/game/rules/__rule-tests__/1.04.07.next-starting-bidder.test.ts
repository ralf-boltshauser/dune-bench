/**
 * Rule test: 1.04.07 NEXT STARTING BIDDER
 * @rule-test 1.04.07
 *
 * Rule text (numbered_rules/1.md):
 * "In subsequent bidding during this Phase, the first eligible player, to the right of the player who opened the bid for the previous card, begins the bidding for the next card."
 *
 * These tests exercise the core behavior of determining the starting bidder for subsequent cards:
 * - Starting bidder is the first eligible player to the right of previous opener
 * - Wraps around the table if needed
 * - Skips ineligible players
 * - Only applies to subsequent cards (not first card - that's 1.04.06)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.07.next-starting-bidder.test.ts
 */

import { Faction, CardLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, getFactionMaxHandSize } from "../../state";
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
  numCards: number,
  previousOpener: Faction,
  currentCardIndex: number = 1
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
    currentCardIndex, // Subsequent card (not 0)
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: previousOpener, // Previous opener
    atreidesHasPeeked: false,
    auctionCards,
  };
}

// =============================================================================
// Tests for 1.04.07
// =============================================================================

function testNextStartingBidder_FirstEligibleToRightOfPreviousOpener(): void {
  section("1.04.07 - first eligible player to right of previous opener starts");

  let state = buildBaseState();
  // All eligible
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const biddingOrder = state.stormOrder;
  const previousOpener = biddingOrder[0]; // First player opened previous card
  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Next eligible to the right should be biddingOrder[1]
  const expectedNextBidder = biddingOrder[1];
  assert(
    result.context.startingBidder === expectedNextBidder,
    `starting bidder is first eligible to right of previous opener (got ${result.context.startingBidder}, expected ${expectedNextBidder})`
  );
  assert(
    result.context.currentCardIndex === 1,
    `current card index is 1 (subsequent card) (got ${result.context.currentCardIndex})`
  );
}

function testNextStartingBidder_SkipsIneligiblePlayer(): void {
  section("1.04.07 - skips ineligible player to right of previous opener");

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;
  const previousOpener = biddingOrder[0]; // First player opened previous card

  // Previous opener is eligible
  state = setFactionHandSize(state, previousOpener, 0);
  // Next player (to the right) has full hand - ineligible
  const nextPlayer = biddingOrder[1];
  const maxHand = getFactionMaxHandSize(nextPlayer);
  state = setFactionHandSize(state, nextPlayer, maxHand);
  // Player after that is eligible
  const playerAfterNext = biddingOrder[2];
  state = setFactionHandSize(state, playerAfterNext, 0);

  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Should skip ineligible nextPlayer and start with playerAfterNext
  assert(
    result.context.startingBidder === playerAfterNext,
    `starting bidder skips ineligible player (got ${result.context.startingBidder}, expected ${playerAfterNext})`
  );
}

function testNextStartingBidder_WrapsAroundTable(): void {
  section("1.04.07 - wraps around table if previous opener is last player");

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;
  // Previous opener is the last player in order
  const previousOpener = biddingOrder[biddingOrder.length - 1];

  // All eligible
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Should wrap around to first player (index 0)
  const expectedNextBidder = biddingOrder[0];
  assert(
    result.context.startingBidder === expectedNextBidder,
    `starting bidder wraps around table (got ${result.context.startingBidder}, expected ${expectedNextBidder})`
  );
}

function testNextStartingBidder_SkipsMultipleIneligiblePlayers(): void {
  section("1.04.07 - skips multiple ineligible players");

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;
  // Previous opener is last player
  const previousOpener = biddingOrder[biddingOrder.length - 1];

  // Previous opener is eligible
  state = setFactionHandSize(state, previousOpener, 0);
  // Next player (wraps to first) is ineligible
  const firstPlayer = biddingOrder[0];
  const maxHand1 = getFactionMaxHandSize(firstPlayer);
  state = setFactionHandSize(state, firstPlayer, maxHand1);
  // Second player is eligible (will be found after wrapping)
  const secondPlayer = biddingOrder[1];
  state = setFactionHandSize(state, secondPlayer, 0);

  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Should skip ineligible firstPlayer and find secondPlayer
  assert(
    result.context.startingBidder === secondPlayer,
    `starting bidder skips multiple ineligible players (got ${result.context.startingBidder}, expected ${secondPlayer})`
  );
}

function testNextStartingBidder_OnlyAppliesToSubsequentCards(): void {
  section("1.04.07 - only applies to subsequent cards (not first card)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const biddingOrder = state.stormOrder;
  // Create context for FIRST card (index 0) - should use 1.04.06, not 1.04.07
  const context = createBiddingContextWithCards(state, 3, biddingOrder[0], 0);
  context.currentCardIndex = 0; // First card

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // For first card, should start with First Player (1.04.06), not use previous opener logic
  const firstPlayer = biddingOrder[0];
  assert(
    result.context.startingBidder === firstPlayer,
    `first card uses First Player (1.04.06), not previous opener logic (got ${result.context.startingBidder}, expected ${firstPlayer})`
  );
  assert(
    result.context.currentCardIndex === 0,
    `current card index is 0 (first card) (got ${result.context.currentCardIndex})`
  );
}

function testNextStartingBidder_PreviousOpenerIneligible(): void {
  section("1.04.07 - handles case where previous opener is now ineligible");

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;
  const previousOpener = biddingOrder[0];

  // Previous opener now has full hand (ineligible)
  const maxHand = getFactionMaxHandSize(previousOpener);
  state = setFactionHandSize(state, previousOpener, maxHand);
  // Next player is eligible
  const nextPlayer = biddingOrder[1];
  state = setFactionHandSize(state, nextPlayer, 0);
  state = setFactionHandSize(state, biddingOrder[2], 0);

  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Should skip ineligible previous opener and start with next eligible
  assert(
    result.context.startingBidder === nextPlayer,
    `starting bidder skips ineligible previous opener (got ${result.context.startingBidder}, expected ${nextPlayer})`
  );
}

function testNextStartingBidder_PreviousOpenerOnlyEligiblePlayer(): void {
  section("1.04.07 - wraps around to previous opener if they are the only eligible player");

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;
  const previousOpener = biddingOrder[0];

  // Previous opener is the only eligible player
  state = setFactionHandSize(state, previousOpener, 0);
  // All other players are ineligible (full hands)
  for (let i = 1; i < biddingOrder.length; i++) {
    const player = biddingOrder[i];
    const maxHand = getFactionMaxHandSize(player);
    state = setFactionHandSize(state, player, maxHand);
  }

  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Implementation wraps around and finds previous opener if they're the only eligible player
  // This is correct behavior - if only one player can bid, they should be able to bid
  assert(
    result.context.startingBidder === previousOpener,
    `starting bidder wraps around to previous opener when they are only eligible player (got ${result.context.startingBidder}, expected ${previousOpener})`
  );
}

function testNextStartingBidder_MiddlePlayerAsPreviousOpener(): void {
  section("1.04.07 - works correctly when previous opener is in the middle of bidding order");

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;
  // Previous opener is middle player (index 1)
  const previousOpener = biddingOrder[1];

  // All eligible
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context = createBiddingContextWithCards(state, 3, previousOpener, 1);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  // Should find first eligible to the right (index 2)
  const expectedNextBidder = biddingOrder[2];
  assert(
    result.context.startingBidder === expectedNextBidder,
    `starting bidder is first eligible to right when previous opener is middle player (got ${result.context.startingBidder}, expected ${expectedNextBidder})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.07 NEXT STARTING BIDDER tests...\n");

  testNextStartingBidder_FirstEligibleToRightOfPreviousOpener();
  testNextStartingBidder_SkipsIneligiblePlayer();
  testNextStartingBidder_WrapsAroundTable();
  testNextStartingBidder_SkipsMultipleIneligiblePlayers();
  testNextStartingBidder_OnlyAppliesToSubsequentCards();
  testNextStartingBidder_PreviousOpenerIneligible();
  testNextStartingBidder_PreviousOpenerOnlyEligiblePlayer();
  testNextStartingBidder_MiddlePlayerAsPreviousOpener();

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

