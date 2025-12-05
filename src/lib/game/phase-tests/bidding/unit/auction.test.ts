/**
 * Unit Tests for Auction Module
 * 
 * Tests individual functions from bidding/auction.ts in isolation.
 */

import { Faction } from '../../../types';
import { startNextAuction } from '../../../phases/handlers/bidding/auction';
import { 
  assertEventEmitted,
  assertAuctionState,
  assertCurrentCardIndex,
} from '../helpers/assertions';
import { 
  BiddingTestStateBuilder,
  createBasicBiddingState,
  createAtreidesTestState,
} from '../helpers/test-state-builder';
import { 
  createAuctionTestContext,
  assertAuctionStarted,
  assertStartingBidderDetermined,
  assertAtreidesPeekRequest,
} from '../helpers/module-test-utils';
import { isEligibleToBid } from '../../../phases/handlers/bidding/helpers';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all auction module tests
 */
export function runAuctionTests(): number {
  console.log('\n' + '='.repeat(80));
  console.log('AUCTION MODULE TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test: Auction state reset
  console.log('\n📋 Testing auction state reset...');
  
  try {
    const state = createBasicBiddingState();
    const context = createAuctionTestContext(0, Faction.ATREIDES);
    context.currentBid = 5;
    context.highBidder = Faction.HARKONNEN;
    context.passedFactions.add(Faction.EMPEROR);
    
    const result = startNextAuction(context, state, [], state.stormOrder, 0);
    
    assert(result.context.currentBid === 0, 'currentBid should be reset to 0');
    assert(result.context.highBidder === null, 'highBidder should be reset to null');
    assert(result.context.passedFactions.size === 0, 'passedFactions should be cleared');
    
    console.log('  ✅ Auction state reset correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Auction state reset failed:', error);
    failed++;
  }

  // Test: AUCTION_STARTED event emitted
  console.log('\n📋 Testing AUCTION_STARTED event...');
  
  try {
    const state = createBasicBiddingState();
    const context = createAuctionTestContext(0, Faction.ATREIDES);
    context.cardsForAuction = ['card_1', 'card_2'];
    context.auctionCards = state.treacheryDeck.slice(0, 2) as any;
    
    const events: any[] = [];
    const result = startNextAuction(context, state, events, state.stormOrder, 0);
    
    assertEventEmitted(events, 'AUCTION_STARTED');
    const event = events.find(e => e.type === 'AUCTION_STARTED');
    assert(event !== undefined, 'AUCTION_STARTED event should exist');
    assert((event as any).data.cardIndex === 1, 'cardIndex should be 1 (0-based + 1)');
    
    console.log('  ✅ AUCTION_STARTED event correct');
    passed++;
  } catch (error) {
    console.error('  ❌ AUCTION_STARTED event test failed:', error);
    failed++;
  }

  // Test: Starting bidder determination - First Player (Rule 1.04.06)
  console.log('\n📋 Testing starting bidder - First Player...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withHandSize(Faction.ATREIDES, 2) // Eligible
      .withHandSize(Faction.HARKONNEN, 0) // Eligible
      .withHandSize(Faction.EMPEROR, 4) // Full - not eligible
      .build();
    
    const context = createAuctionTestContext(0, Faction.ATREIDES);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const result = startNextAuction(context, state, [], state.stormOrder, 0);
    
    // First Player (Atreides) should be starting bidder
    assert(result.context.startingBidder === Faction.ATREIDES, 'First Player should be starting bidder');
    
    console.log('  ✅ Starting bidder - First Player correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Starting bidder test failed:', error);
    failed++;
  }

  // Test: Starting bidder - First Player not eligible, next eligible (Rule 1.04.06)
  console.log('\n📋 Testing starting bidder - First Player not eligible...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withHandSize(Faction.ATREIDES, 4) // Full - not eligible
      .withHandSize(Faction.HARKONNEN, 0) // Eligible
      .withHandSize(Faction.EMPEROR, 2) // Eligible
      .build();
    
    const context = createAuctionTestContext(0, Faction.ATREIDES);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const result = startNextAuction(context, state, [], state.stormOrder, 0);
    
    // Harkonnen (next eligible) should be starting bidder
    assert(result.context.startingBidder === Faction.HARKONNEN, 'Next eligible should be starting bidder');
    
    console.log('  ✅ Starting bidder - next eligible correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Starting bidder test failed:', error);
    failed++;
  }

  // Test: Starting bidder rotation - subsequent auctions (Rule 1.04.07)
  console.log('\n📋 Testing starting bidder rotation...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withHandSize(Faction.ATREIDES, 2)
      .withHandSize(Faction.HARKONNEN, 0)
      .withHandSize(Faction.EMPEROR, 1)
      .build();
    
    const context = createAuctionTestContext(1, Faction.ATREIDES); // Second card, previous opener was Atreides
    context.cardsForAuction = ['card_1', 'card_2'];
    context.auctionCards = state.treacheryDeck.slice(0, 2) as any;
    
    const result = startNextAuction(context, state, [], state.stormOrder, 0);
    
    // Should start with first eligible to the right of Atreides (Harkonnen)
    assert(result.context.startingBidder === Faction.HARKONNEN, 'Should rotate to next eligible');
    
    console.log('  ✅ Starting bidder rotation correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Starting bidder rotation test failed:', error);
    failed++;
  }

  // Test: Atreides peek request (Rule 2.01.05)
  console.log('\n📋 Testing Atreides peek request...');
  
  try {
    const state = createAtreidesTestState();
    const context = createAuctionTestContext(0, Faction.ATREIDES);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = startNextAuction(context, state, events, state.stormOrder, 0);
    
    // Should have peek request for Atreides
    assert(result.result.pendingRequests.length > 0, 'Should have pending requests');
    const peekRequest = result.result.pendingRequests.find(
      (r: any) => r.requestType === 'PEEK_CARD' && r.factionId === Faction.ATREIDES
    );
    assert(peekRequest !== undefined, 'Should have Atreides peek request');
    assert(result.context.atreidesPeekedCards.has(result.context.currentCardIndex), 'atreidesPeekedCards should contain current card index');
    
    console.log('  ✅ Atreides peek request correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Atreides peek request test failed:', error);
    failed++;
  }

  // Test: No Atreides peek when Atreides not in game
  console.log('\n📋 Testing no Atreides peek when not in game...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.HARKONNEN, Faction.EMPEROR])
      .withoutAtreides()
      .build();
    
    const context = createAuctionTestContext(0, Faction.HARKONNEN);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = startNextAuction(context, state, events, state.stormOrder, 0);
    
    // Should have no peek request
    assert(result.result.pendingRequests.length === 0, 'Should have no pending requests');
    assert(!result.context.atreidesPeekedCards.has(result.context.currentCardIndex), 'atreidesPeekedCards should not contain current card index');
    
    console.log('  ✅ No Atreides peek when not in game');
    passed++;
  } catch (error) {
    console.error('  ❌ No Atreides peek test failed:', error);
    failed++;
  }

  // Test: No eligible bidders - all hands full
  console.log('\n📋 Testing no eligible bidders...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withFullHandsForAll()
      .build();
    
    const context = createAuctionTestContext(0, Faction.ATREIDES);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = startNextAuction(context, state, events, state.stormOrder, 0);
    
    // Should end phase
    assert(result.result.phaseComplete === true, 'Phase should be complete');
    assertEventEmitted(events, 'CARD_RETURNED_TO_DECK');
    
    console.log('  ✅ No eligible bidders handled correctly');
    passed++;
  } catch (error) {
    console.error('  ❌ No eligible bidders test failed:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '-'.repeat(80));
  console.log(`Auction Tests: ${passed} passed, ${failed} failed`);
  console.log('-'.repeat(80));

  return passed;
}

