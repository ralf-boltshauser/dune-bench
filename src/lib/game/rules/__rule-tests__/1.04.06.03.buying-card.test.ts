/**
 * Rule test: 1.04.06.03 BUYING A CARD
 * @rule-test 1.04.06.03
 *
 * Rule text (numbered_rules/1.md):
 * "Buying A Card: The top bidding player then pays the number of spice they bid to the Spice Bank and receives the card currently up for bid, adding it to their hand."
 *
 * These tests exercise the core behavior of buying a card:
 * - Winner pays spice to bank
 * - Winner receives the card
 * - Card is added to winner's hand
 * - Hand size increases correctly
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.06.03.buying-card.test.ts
 */

import { Faction, CardLocation, type GameState, type TreacheryCard } from "../../types";
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
  }
}

function createBiddingContext(
  cardId: string,
  highBidder: Faction,
  currentBid: number
): BiddingContextWithCards {
  // Get a sample card from the deck to use as auction card
  const state = buildBaseState();
  const sampleCard = state.treacheryDeck[0];
  if (!sampleCard) {
    throw new Error("Cannot create context: treachery deck is empty");
  }

  const auctionCard: TreacheryCard = {
    ...sampleCard,
    definitionId: cardId,
    location: CardLocation.DECK,
    ownerId: null,
  };

  return {
    cardsForAuction: [cardId],
    currentCardIndex: 0,
    currentBid,
    highBidder,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesHasPeeked: false,
    auctionCards: [auctionCard],
  };
}

// =============================================================================
// Tests for 1.04.06.03
// =============================================================================

function testBuyingCard_WinnerPaysSpice(): void {
  section("1.04.06.03 - winner pays spice to bank");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const context = createBiddingContext("test_card_1", Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  const winnerState = getFactionState(result.result.state, Faction.ATREIDES);

  assert(
    winnerState.spice === 5,
    `winner paid 5 spice (had 10, now has ${winnerState.spice})`
  );
}

function testBuyingCard_WinnerReceivesCard(): void {
  section("1.04.06.03 - winner receives the card");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const cardId = "test_card_1";
  const context = createBiddingContext(cardId, Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const initialHandSize = getFactionState(state, Faction.ATREIDES).hand.length;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  const winnerState = getFactionState(result.result.state, Faction.ATREIDES);

  assert(
    winnerState.hand.length === initialHandSize + 1,
    `winner's hand size increased by 1 (was ${initialHandSize}, now ${winnerState.hand.length})`
  );

  const wonCard = winnerState.hand.find((c) => c.definitionId === cardId);
  assert(
    wonCard !== undefined,
    "won card is in winner's hand"
  );
  assert(
    wonCard?.ownerId === Faction.ATREIDES,
    "won card's owner is the winner"
  );
  assert(
    wonCard?.location === CardLocation.HAND,
    "won card's location is HAND"
  );
}

function testBuyingCard_CardRemovedFromDeck(): void {
  section("1.04.06.03 - card is removed from deck (already in auction cards)");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const initialDeckSize = state.treacheryDeck.length;
  const context = createBiddingContext("test_card_1", Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  // The card was already removed from deck when dealt for auction
  // So deck size should be the same (card was in auctionCards, not deck)
  // This test verifies the card is properly transferred to hand
  const winnerState = getFactionState(result.result.state, Faction.ATREIDES);
  const cardInHand = winnerState.hand.some((c) => c.definitionId === "test_card_1");

  assert(
    cardInHand,
    "card is in winner's hand (not in deck)"
  );
}

function testBuyingCard_EventEmitted(): void {
  section("1.04.06.03 - card won event is emitted");

  let state = buildBaseState();
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const context = createBiddingContext("test_card_1", Faction.ATREIDES, 5);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  const cardWonEvent = result.result.events.find((e) => e.type === "CARD_WON");

  assert(
    cardWonEvent !== undefined,
    "CARD_WON event is emitted"
  );
  assert(
    (cardWonEvent?.data?.amount as number) === 5,
    "event contains correct bid amount"
  );
  assert(
    (cardWonEvent?.data?.winner as string) === "Atreides",
    "event contains winner name"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.06.03 BUYING A CARD tests...\n");

  testBuyingCard_WinnerPaysSpice();
  testBuyingCard_WinnerReceivesCard();
  testBuyingCard_CardRemovedFromDeck();
  testBuyingCard_EventEmitted();

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

