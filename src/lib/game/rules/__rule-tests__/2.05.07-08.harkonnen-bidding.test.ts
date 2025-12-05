/**
 * Rule tests: 2.05.07–2.05.08 HARKONNEN BIDDING & TOP CARD
 *
 * Rule texts (numbered_rules/2.md):
 *
 * 2.05.07 TRAMENDOUSLY TREACHEROUS:
 * "You may hold up to 8 Treachery Cards. You must pass when you hold 8."
 *
 * 2.05.08 TOP CARD:
 * "When you Buy a card, you Draw an extra card for free from the Treachery Deck
 * (unless you are at 7 cards, because you can never have more than 8 total
 * Treachery Cards in hand)."
 *
 * @rule-test 2.05.07
 * @rule-test 2.05.08
 */

import { Faction, CardLocation, type GameState, type TreacheryCard } from "../../types";
import { getFactionConfig } from "../../data/faction-config";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { isEligibleToBid } from "../../phases/handlers/bidding/helpers/eligibility";
import { resolveAuction } from "../../phases/handlers/bidding/resolution";
import type { BiddingContextWithCards } from "../../phases/handlers/bidding/types";

// =============================================================================
// Minimal console-based test harness
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

function buildBaseState(): GameState {
  // Use real game-state factory to keep bidding helpers happy
  return createGameState({
    factions: [Faction.HARKONNEN, Faction.ATREIDES],
    advancedRules: true,
  });
}

// Helper to build a bidding context for a specific winner & card
function createBiddingContext(
  cardId: string,
  winner: Faction,
  bidAmount: number
): BiddingContextWithCards {
  const state = buildBaseState();
  const sampleCard = state.treacheryDeck[0];
  if (!sampleCard) {
    throw new Error("Cannot create bidding context: treachery deck is empty");
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
    currentBid: bidAmount,
    highBidder: winner,
    passedFactions: new Set(),
    startingBidder: winner,
    atreidesHasPeeked: false,
    auctionCards: [auctionCard],
  };
}

// =============================================================================
// 2.05.07 – Hand size 8 and forced pass
// =============================================================================

function testHarkonnenMustPassAtEightCards(): void {
  section("2.05.07 - Harkonnen hand size 8 forces pass");

  let state = buildBaseState();
  const harkConfig = getFactionConfig(Faction.HARKONNEN);

  // Give Harkonnen a full hand (8 cards)
  const harkonnen = getFactionState(state, Faction.HARKONNEN);
  const fullHand = new Array(harkConfig.maxHandSize).fill(null).map((_, index) => ({
    definitionId: `dummy_${index}`,
    type: "WORTHLESS" as any,
    location: "HAND" as any,
    ownerId: Faction.HARKONNEN,
  }));

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.HARKONNEN, {
      ...harkonnen,
      hand: fullHand,
    }),
  };

  const context = {
    // These fields are all that isEligibleToBid uses
    currentCardIndex: 0,
    cardsForAuction: ["card_1"],
    minimumBid: 1,
    startingBidderIndex: 0,
    cardsToReturnToDeck: [],
  } as BiddingContextWithCards;

  const eligible = isEligibleToBid(state, Faction.HARKONNEN, context);

  assert(!eligible, "Harkonnen is NOT eligible to bid when holding 8 cards");
}

// =============================================================================
// 2.05.08 – TOP CARD extra draw when buying
// =============================================================================

function testHarkonnenTopCardDrawsExtraWhenBuying(): void {
  section("2.05.08 - Harkonnen draws extra TOP CARD when buying");

  let state = buildBaseState();
  const harkConfig = getFactionConfig(Faction.HARKONNEN);

  // Start with Harkonnen at 6 cards (so: buy one -> 7, then free draw -> 8)
  const harkonnen = getFactionState(state, Faction.HARKONNEN);
  const startingHand = new Array(harkConfig.maxHandSize - 2).fill(null).map((_, index) => ({
    definitionId: `start_${index}`,
    type: "WORTHLESS" as any,
    location: "HAND" as any,
    ownerId: Faction.HARKONNEN,
  }));

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.HARKONNEN, {
      ...harkonnen,
      hand: startingHand,
    }),
  };

  // Use resolveAuction directly, mirroring 1.04.06.03 tests
  const cardId = "top_card_test";
  const context = createBiddingContext(cardId, Faction.HARKONNEN, 3);
  const biddingOrder = state.stormOrder;

  const result = resolveAuction(context, state, [], biddingOrder, 0);

  const finalState = result.result.state;
  const finalHarkonnen = getFactionState(finalState, Faction.HARKONNEN);

  assert(
    finalHarkonnen.hand.length === startingHand.length + 2,
    "Harkonnen hand increases by 2 cards when buying: purchased card + free TOP CARD"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.05.07–2.05.08 HARKONNEN BIDDING & TOP CARD");
  console.log("=".repeat(80));

  try {
    testHarkonnenMustPassAtEightCards();
    testHarkonnenTopCardDrawsExtraWhenBuying();
  } catch (error) {
    console.error("Unexpected error during 2.05.07–2.05.08 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.05.07–2.05.08 rule tests failed");
  }
}


