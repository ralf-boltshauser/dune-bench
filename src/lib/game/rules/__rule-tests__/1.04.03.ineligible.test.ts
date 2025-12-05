/**
 * Rule test: 1.04.03 INELIGIBLE
 * @rule-test 1.04.03
 *
 * Rule text (numbered_rules/1.md):
 * "Players with a full hand are not eligible to bid and must pass during a bid for a Treachery Card."
 *
 * These tests exercise the core behavior of bid eligibility:
 * - Player with 4 cards (full hand) is not eligible
 * - Player with 3 cards is eligible
 * - Player with 0 cards is eligible
 * - Player with 8 cards (Harkonnen full) is not eligible
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.03.ineligible.test.ts
 */

import { isEligibleToBid } from "../../phases/handlers/bidding/helpers/eligibility";
import { type BiddingContextWithCards } from "../../phases/handlers/bidding/types";
import { getFactionState } from "../../state";
import { createGameState } from "../../state/factory";
import { CardLocation, Faction, type GameState } from "../../types";

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
// Tests for 1.04.03
// =============================================================================

function testIneligible_FullHandNotEligible(): void {
  section("1.04.03 - player with full hand (4 cards) is not eligible");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 4);
  const context = createEmptyContext();

  const eligible = isEligibleToBid(state, Faction.ATREIDES, context);

  assert(
    eligible === false,
    "player with 4 cards (full hand) is not eligible to bid"
  );
}

function testIneligible_NotFullHandIsEligible(): void {
  section("1.04.03 - player with non-full hand is eligible");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 3);
  const context = createEmptyContext();

  const eligible = isEligibleToBid(state, Faction.ATREIDES, context);

  assert(eligible === true, "player with 3 cards is eligible to bid");
}

function testIneligible_EmptyHandIsEligible(): void {
  section("1.04.03 - player with empty hand is eligible");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  const context = createEmptyContext();

  const eligible = isEligibleToBid(state, Faction.ATREIDES, context);

  assert(eligible === true, "player with 0 cards is eligible to bid");
}

function testIneligible_HarkonnenFullHandNotEligible(): void {
  section("1.04.03 - Harkonnen with full hand (8 cards) is not eligible");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.HARKONNEN, 8);
  const context = createEmptyContext();

  const eligible = isEligibleToBid(state, Faction.HARKONNEN, context);

  assert(
    eligible === false,
    "Harkonnen with 8 cards (full hand) is not eligible to bid"
  );
}

function testIneligible_HarkonnenWith7CardsIsEligible(): void {
  section("1.04.03 - Harkonnen with 7 cards is eligible");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.HARKONNEN, 7);
  const context = createEmptyContext();

  const eligible = isEligibleToBid(state, Faction.HARKONNEN, context);

  assert(eligible === true, "Harkonnen with 7 cards is eligible to bid");
}

function testIneligible_HandSizeExactlyAtMaxIsIneligible(): void {
  section("1.04.03 - hand size exactly at max is ineligible");

  let state = buildBaseState();
  // Atreides max is 4, so 4 cards = exactly at max = ineligible
  state = setFactionHandSize(state, Faction.ATREIDES, 4);
  const context = createEmptyContext();

  const eligible = isEligibleToBid(state, Faction.ATREIDES, context);

  assert(
    eligible === false,
    "player with hand size exactly at max (4) is not eligible"
  );
}

function testIneligible_HandSizeExceedsMaxIsDetected(): void {
  section(
    "1.04.03 - hand size exceeding max is detected (defensive validation)"
  );

  let state = buildBaseState();
  // This shouldn't happen in normal play, but defensive check
  // Atreides max is 4, so 5 cards = exceeds max = should be detected
  state = setFactionHandSize(state, Faction.ATREIDES, 5);
  const context = createEmptyContext();

  // The implementation validates hand size and throws an error for invalid states
  // This is correct defensive behavior - invalid states should be caught
  let errorThrown = false;
  try {
    isEligibleToBid(state, Faction.ATREIDES, context);
  } catch (error) {
    errorThrown = true;
    assert(
      error instanceof Error && error.message.includes("Hand size violation"),
      "error is thrown when hand size exceeds max (defensive validation)"
    );
  }

  assert(
    errorThrown,
    "error is thrown when hand size exceeds max (invalid state detected)"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.03 INELIGIBLE tests...\n");

  testIneligible_FullHandNotEligible();
  testIneligible_NotFullHandIsEligible();
  testIneligible_EmptyHandIsEligible();
  testIneligible_HarkonnenFullHandNotEligible();
  testIneligible_HarkonnenWith7CardsIsEligible();
  testIneligible_HandSizeExactlyAtMaxIsIneligible();
  testIneligible_HandSizeExceedsMaxIsDetected();

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
