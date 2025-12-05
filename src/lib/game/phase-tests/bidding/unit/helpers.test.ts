/**
 * Unit Tests for Helpers Module
 * 
 * Tests for bidding/helpers.ts functions.
 */

import { Faction, Phase, CardLocation, type TreacheryCard } from "../../../types";
import {
  canBid,
  getRemainingAuctionCards,
  returnCardsToDeckAndShuffle,
  endBiddingPhase,
} from "../../../phases/handlers/bidding/helpers";
import {
  assertPhaseComplete,
  assertNextPhase,
} from "../helpers/assertions";
import {
  BiddingTestStateBuilder,
  createBasicBiddingState,
} from "../helpers/test-state-builder";
import { createInitializationTestContext } from "../helpers/module-test-utils";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all helpers module tests
 */
export function runHelpersTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('HELPERS MODULE TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test canBid()
  console.log('\n📋 Testing canBid()...');
  
  try {
    const state = createBasicBiddingState();
    const context = createInitializationTestContext();
    context.currentBid = 0;
    context.highBidder = null;

    const result = canBid(state, Faction.ATREIDES, context);
    assert(result === true, "Expected canBid to return true for eligible bidder");
    console.log('  ✅ canBid returns true when hand not full and can afford');
    passed++;
  } catch (error) {
    console.error('  ❌ canBid returns true when hand not full:', error);
    failed++;
  }

  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN]) // Need at least 2 factions
      .withHandSize(Faction.ATREIDES, 4)
      .build();
    const context = createInitializationTestContext();

    const result = canBid(state, Faction.ATREIDES, context);
    assert(result === false, "Expected canBid to return false for full hand");
    console.log('  ✅ canBid returns false when hand is full (4 cards)');
    passed++;
  } catch (error) {
    console.error('  ❌ canBid returns false when hand is full:', error);
    failed++;
  }

  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.HARKONNEN, Faction.ATREIDES]) // Need at least 2 factions
      .withHandSize(Faction.HARKONNEN, 8)
      .build();
    const context = createInitializationTestContext();

    const result = canBid(state, Faction.HARKONNEN, context);
    assert(result === false, "Expected canBid to return false for Harkonnen with 8 cards");
    console.log('  ✅ canBid returns false when Harkonnen hand is full (8 cards)');
    passed++;
  } catch (error) {
    console.error('  ❌ canBid returns false when Harkonnen hand is full:', error);
    failed++;
  }

  // Test getRemainingAuctionCards()
  console.log('\n📋 Testing getRemainingAuctionCards()...');
  
  try {
    const context = createInitializationTestContext();
    context.currentCardIndex = 1;
    context.auctionCards = [
      { definitionId: "card_1", location: CardLocation.DECK, ownerId: null } as TreacheryCard,
      { definitionId: "card_2", location: CardLocation.DECK, ownerId: null } as TreacheryCard,
      { definitionId: "card_3", location: CardLocation.DECK, ownerId: null } as TreacheryCard,
    ];

    const remaining = getRemainingAuctionCards(context);
    assert(remaining.length === 2, `Expected 2 remaining cards, got ${remaining.length}`);
    assert(remaining[0].definitionId === "card_2", "Expected first remaining card to be card_2");
    assert(remaining[1].definitionId === "card_3", "Expected second remaining card to be card_3");
    console.log('  ✅ getRemainingAuctionCards returns correct cards from current index');
    passed++;
  } catch (error) {
    console.error('  ❌ getRemainingAuctionCards returns correct cards:', error);
    failed++;
  }

  // @rule-test 0.04
  // Test returnCardsToDeckAndShuffle() - verifies that cards are reshuffled
  // back into the treachery deck as required by rule 0.04
  console.log('\n📋 Testing returnCardsToDeckAndShuffle()...');
  
  try {
    const state = createBasicBiddingState();
    const originalDeckSize = state.treacheryDeck.length;
    const cardsToReturn = [
      { definitionId: "card_1", location: CardLocation.DECK, ownerId: null } as TreacheryCard,
      { definitionId: "card_2", location: CardLocation.DECK, ownerId: null } as TreacheryCard,
    ];

    const newState = returnCardsToDeckAndShuffle(state, cardsToReturn);
    assert(newState.treacheryDeck.length === originalDeckSize + 2, 
      `Expected deck size ${originalDeckSize + 2}, got ${newState.treacheryDeck.length}`);
    console.log('  ✅ returnCardsToDeckAndShuffle adds cards to deck');
    passed++;
  } catch (error) {
    console.error('  ❌ returnCardsToDeckAndShuffle adds cards:', error);
    failed++;
  }

  // Test endBiddingPhase()
  console.log('\n📋 Testing endBiddingPhase()...');
  
  try {
    const state = createBasicBiddingState();
    const events: any[] = [];

    const result = endBiddingPhase(state, events);
    assertPhaseComplete(result, true);
    assertNextPhase(result, Phase.REVIVAL);
    const completeEvent = events.find((e) => e.type === "BIDDING_COMPLETE");
    assert(completeEvent !== undefined, "Expected BIDDING_COMPLETE event");
    console.log('  ✅ endBiddingPhase marks phase complete and emits event');
    passed++;
  } catch (error) {
    console.error('  ❌ endBiddingPhase marks phase complete:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
}

