/**
 * Negative Validation Tests for Bidding Phase
 * 
 * Tests invalid inputs and edge cases that should be rejected.
 */

import { Faction } from '../../../types';
import { processBid } from '../../../phases/handlers/bidding/bid-processing';
import { 
  assertEventEmitted,
} from '../helpers/assertions';
import { 
  BiddingTestStateBuilder,
} from '../helpers/test-state-builder';
import { 
  createBidProcessingTestContext,
} from '../helpers/module-test-utils';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all negative validation tests
 */
export function runNegativeValidationTests(): number {
  console.log('\n' + '='.repeat(80));
  console.log('NEGATIVE VALIDATION TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test: Bid 0 spice (should be rejected - Rule 1.04.06.01)
  console.log('\n📋 Testing bid 0 spice (should be rejected)...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 10)
      .build();
    
    const context = createBidProcessingTestContext();
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const response = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 0) // Invalid: 0 spice
      .build()[0];
    
    const result = processBid(context, state, response, state.stormOrder, 0);
    
    // Should reject bid
    const rejectedEvent = result.events.find(e => 
      e.type === 'BID_PASSED' && 
      (e.message?.includes('rejected') || (e.data as any)?.reason?.includes('rejected'))
    );
    assert(rejectedEvent !== undefined, 'Should reject bid of 0 spice');
    
    console.log('  ✅ Bid 0 spice correctly rejected');
    passed++;
  } catch (error) {
    console.error('  ❌ Bid 0 spice test failed:', error);
    failed++;
  }

  // Test: Bid negative amount (should be rejected)
  console.log('\n📋 Testing bid negative amount (should be rejected)...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 10)
      .build();
    
    const context = createBidProcessingTestContext();
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    context.currentBid = 5;
    context.highBidder = Faction.HARKONNEN;
    
    const response = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, -5) // Invalid: negative
      .build()[0];
    
    const result = processBid(context, state, response, state.stormOrder, 0);
    
    // Should reject bid
    const rejectedEvent = result.events.find(e => 
      e.type === 'BID_PASSED' && 
      (e.message?.includes('rejected') || (e.data as any)?.reason?.includes('rejected'))
    );
    assert(rejectedEvent !== undefined, 'Should reject negative bid');
    
    console.log('  ✅ Negative bid correctly rejected');
    passed++;
  } catch (error) {
    console.error('  ❌ Negative bid test failed:', error);
    failed++;
  }

  // Test: Bid equal to current bid (should be rejected)
  console.log('\n📋 Testing bid equal to current bid (should be rejected)...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 10)
      .build();
    
    const context = createBidProcessingTestContext();
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    context.currentBid = 5;
    context.highBidder = Faction.HARKONNEN;
    
    const response = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 5) // Invalid: equal to current bid
      .build()[0];
    
    const result = processBid(context, state, response, state.stormOrder, 0);
    
    // Should reject bid
    const rejectedEvent = result.events.find(e => 
      e.type === 'BID_PASSED' && 
      (e.message?.includes('rejected') || (e.data as any)?.reason?.includes('rejected'))
    );
    assert(rejectedEvent !== undefined, 'Should reject bid equal to current bid');
    
    console.log('  ✅ Bid equal to current bid correctly rejected');
    passed++;
  } catch (error) {
    console.error('  ❌ Bid equal to current bid test failed:', error);
    failed++;
  }

  // Test: Bid more than spice (without Karama, should be rejected - Rule 1.04.06.03)
  console.log('\n📋 Testing bid more than spice without Karama (should be rejected)...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 5) // Only 5 spice
      .build();
    
    const context = createBidProcessingTestContext();
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    context.currentBid = 1;
    context.highBidder = Faction.HARKONNEN;
    
    const response = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 10) // Invalid: more than spice (5), but also valid minimum (2)
      .build()[0];
    
    const result = processBid(context, state, response, state.stormOrder, 0);
    
    // Should reject bid - check for BID_PASSED event with rejection message
    // The message should include "exceeds" or "rejected"
    const rejectedEvent = result.events.find(e => 
      e.type === 'BID_PASSED' && 
      (e.message?.toLowerCase().includes('rejected') || 
       e.message?.toLowerCase().includes('exceeds') ||
       (e.data as any)?.reason === 'BID_EXCEEDS_SPICE' ||
       (e.data as any)?.reason?.toLowerCase().includes('exceeds'))
    );
    
    // Also verify that the bid was not accepted (high bidder didn't change to Atreides)
    const bidWasRejected = rejectedEvent !== undefined || 
                          result.context.highBidder !== Faction.ATREIDES;
    
    if (!bidWasRejected) {
      // Debug: show what we got
      const eventTypes = result.events.map(e => `${e.type}: ${e.message || JSON.stringify(e.data)}`).join('; ');
      throw new Error(
        `Should reject bid exceeding spice. Events: ${eventTypes}. ` +
        `High bidder: ${result.context.highBidder} (expected Harkonnen), Current bid: ${result.context.currentBid}`
      );
    }
    
    console.log('  ✅ Bid exceeding spice correctly rejected');
    passed++;
  } catch (error) {
    console.error('  ❌ Bid exceeding spice test failed:', error);
    failed++;
  }

  // Test: Self-outbid (current high bidder tries to raise own bid)
  console.log('\n📋 Testing self-outbid (should be rejected)...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 10)
      .build();
    
    const context = createBidProcessingTestContext();
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    context.currentBid = 5;
    context.highBidder = Faction.ATREIDES; // Atreides is current high bidder
    
    const response = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 7) // Invalid: trying to outbid self
      .build()[0];
    
    const result = processBid(context, state, response, state.stormOrder, 0);
    
    // Should reject bid (self-outbid)
    const rejectedEvent = result.events.find(e => 
      e.type === 'BID_PASSED' && 
      (e.message?.includes('rejected') || (e.data as any)?.reason?.includes('rejected'))
    );
    assert(rejectedEvent !== undefined, 'Should reject self-outbid');
    
    console.log('  ✅ Self-outbid correctly rejected');
    passed++;
  } catch (error) {
    console.error('  ❌ Self-outbid test failed:', error);
    failed++;
  }

  // Test: Bid when hand is full (should be rejected - Rule 1.04.03)
  console.log('\n📋 Testing bid when hand is full (should be rejected)...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withSpice(Faction.ATREIDES, 10)
      .withFullHand(Faction.ATREIDES) // Hand is full (4 cards)
      .build();
    
    const context = createBidProcessingTestContext();
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const response = new AgentResponseBuilder()
      .queueBid(Faction.ATREIDES, 5) // Invalid: hand is full
      .build()[0];
    
    const result = processBid(context, state, response, state.stormOrder, 0);
    
    // Should reject bid (hand is full)
    const rejectedEvent = result.events.find(e => 
      e.type === 'BID_PASSED' && 
      (e.message?.includes('rejected') || (e.data as any)?.reason?.includes('rejected'))
    );
    assert(rejectedEvent !== undefined, 'Should reject bid when hand is full');
    
    console.log('  ✅ Bid with full hand correctly rejected');
    passed++;
  } catch (error) {
    console.error('  ❌ Bid with full hand test failed:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '-'.repeat(80));
  console.log(`Negative Validation Tests: ${passed} passed, ${failed} failed`);
  console.log('-'.repeat(80));

  return passed;
}

