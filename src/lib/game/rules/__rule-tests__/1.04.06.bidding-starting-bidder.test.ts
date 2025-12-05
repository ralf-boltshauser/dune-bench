/**
 * Rule test: 1.04.06 BIDDING (starting bidder determination)
 * @rule-test 1.04.06
 *
 * Rule text (numbered_rules/1.md):
 * "BIDDING: The bidding is started by the First Player. If that player is not
 *  eligible to bid the next player to the right who is eligible opens the bidding."
 *
 * These tests exercise the core behavior of choosing the starting bidder
 * for the FIRST card in the row:
 * - If the First Player is eligible, they start the bidding
 * - If the First Player is not eligible, we skip to the next eligible player
 * - Multiple ineligible players in a row are skipped correctly
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.06.bidding-starting-bidder.test.ts
 */

import { Faction, CardLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getFactionMaxHandSize } from "../../state/queries";
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
// Tests for 1.04.06 (first-card starting bidder)
// =============================================================================

function testBidding_FirstPlayerStartsWhenEligible(): void {
  section("1.04.06 - First Player starts bidding when eligible");

  let state = buildBaseState();
  // All factions have empty hands (below max) and default spice, so all eligible
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context = createBiddingContextWithCards(state, 3);
  const biddingOrder = state.stormOrder;

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  const expectedFirstPlayer = biddingOrder[0];

  assert(
    result.context.startingBidder === expectedFirstPlayer,
    `starting bidder is the First Player (${expectedFirstPlayer})`
  );
  assert(
    result.currentBidderIndex === 0,
    `currentBidderIndex is 0 (First Player index)`
  );
}

function testBidding_SkipsIneligibleFirstPlayer_FullHand(): void {
  section(
    "1.04.06 - If First Player is ineligible (full hand), skip to next eligible"
  );

  let state = buildBaseState();

  const biddingOrder = state.stormOrder;
  const firstPlayer = biddingOrder[0];
  const secondPlayer = biddingOrder[1];

  // Make First Player ineligible by giving them a full hand (at max hand size)
  const firstMaxHand = getFactionMaxHandSize(firstPlayer);
  state = setFactionHandSize(state, firstPlayer, firstMaxHand);

  // Second player: clearly eligible (empty hand)
  state = setFactionHandSize(state, secondPlayer, 0);

  const context = createBiddingContextWithCards(state, 3);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  assert(
    result.context.startingBidder === secondPlayer,
    `starting bidder skips ineligible First Player and uses second player (${secondPlayer})`
  );
  assert(
    result.currentBidderIndex === 1,
    "currentBidderIndex is 1 (second player index)"
  );
}

function testBidding_SkipsMultipleIneligiblePlayers(): void {
  section(
    "1.04.06 - Multiple ineligible players in a row are skipped correctly"
  );

  let state = buildBaseState();
  const biddingOrder = state.stormOrder;

  const firstPlayer = biddingOrder[0];
  const secondPlayer = biddingOrder[1];
  const thirdPlayer = biddingOrder[2];

  // First and second players: ineligible (full hands)
  const firstMaxHand = getFactionMaxHandSize(firstPlayer);
  const secondMaxHand = getFactionMaxHandSize(secondPlayer);
  state = setFactionHandSize(state, firstPlayer, firstMaxHand);
  state = setFactionHandSize(state, secondPlayer, secondMaxHand);

  // Third player: clearly eligible (empty hand)
  state = setFactionHandSize(state, thirdPlayer, 0);

  const context = createBiddingContextWithCards(state, 3);

  const result = startNextAuction(context, state, [], biddingOrder, 0);

  assert(
    result.context.startingBidder === thirdPlayer,
    `starting bidder skips two ineligible players and uses third player (${thirdPlayer})`
  );

  const expectedIndex = biddingOrder.indexOf(thirdPlayer);
  assert(
    result.currentBidderIndex === expectedIndex,
    `currentBidderIndex matches third player's index (${expectedIndex})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.06 BIDDING (starting bidder) tests...\n");

  testBidding_FirstPlayerStartsWhenEligible();
  testBidding_SkipsIneligibleFirstPlayer_FullHand();
  testBidding_SkipsMultipleIneligiblePlayers();

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


