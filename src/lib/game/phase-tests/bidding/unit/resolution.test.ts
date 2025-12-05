/**
 * Unit Tests for Resolution Module
 * 
 * Tests individual functions from bidding/resolution.ts in isolation.
 */

import { Faction } from '../../../types';
import { resolveAuction } from '../../../phases/handlers/bidding/resolution';
import { 
  assertSpice,
  assertHandSize,
  assertHandContains,
  assertEventEmitted,
  assertHarkonnenDrewFreeCard,
  assertKaramaFlagsCleared,
} from '../helpers/assertions';
import { 
  BiddingTestStateBuilder,
  createEmperorTestState,
  createHarkonnenTopCardTestState,
} from '../helpers/test-state-builder';
import { 
  createResolutionTestContext,
} from '../helpers/module-test-utils';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all resolution module tests
 */
export function runResolutionTests(): number {
  console.log('\n' + '='.repeat(80));
  console.log('RESOLUTION MODULE TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test: Payment processing (Rule 1.04.06.02)
  console.log('\n📋 Testing payment processing...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN]) // Need at least 2 factions
      .withSpice(Faction.ATREIDES, 10)
      .build();
    
    const originalSpice = state.factions.get(Faction.ATREIDES)!.spice;
    const context = createResolutionTestContext(Faction.ATREIDES, 5);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = resolveAuction(context, state, events, state.stormOrder, 0);
    
    // Spice should decrease by bid amount
    assertSpice(result.result.state, Faction.ATREIDES, originalSpice - 5);
    assertEventEmitted(events, 'CARD_WON');
    
    console.log('  ✅ Payment processing correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Payment processing failed:', error);
    failed++;
  }

  // Test: Card distribution
  console.log('\n📋 Testing card distribution...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN]) // Need at least 2 factions
      .withSpice(Faction.ATREIDES, 10)
      .build();
    
    const originalHandSize = state.factions.get(Faction.ATREIDES)!.hand.length;
    const context = createResolutionTestContext(Faction.ATREIDES, 5);
    const cardId = state.treacheryDeck[0].definitionId;
    context.cardsForAuction = [cardId];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = resolveAuction(context, state, events, state.stormOrder, 0);
    
    // Card should be in winner's hand
    assertHandSize(result.result.state, Faction.ATREIDES, originalHandSize + 1);
    assertHandContains(result.result.state, Faction.ATREIDES, cardId);
    
    console.log('  ✅ Card distribution correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Card distribution test failed:', error);
    failed++;
  }

  // Test: Harkonnen TOP CARD (Rule 2.05.08)
  console.log('\n📋 Testing Harkonnen TOP CARD...');
  
  try {
    const state = createHarkonnenTopCardTestState(6); // Hand size 6, can draw free card
    const originalHandSize = state.factions.get(Faction.HARKONNEN)!.hand.length;
    
    // Ensure deck has cards for the free draw
    if (state.treacheryDeck.length === 0) {
      // Add a card to deck for the free draw
      state.treacheryDeck.push({
        definitionId: 'test_card',
        location: 'deck' as any,
        ownerId: null,
      } as any);
    }
    
    const context = createResolutionTestContext(Faction.HARKONNEN, 5);
    // Use a card from the deck that's not the one being auctioned
    const auctionCard = state.treacheryDeck[0];
    context.cardsForAuction = [auctionCard.definitionId];
    context.auctionCards = [auctionCard] as any;
    
    // Remove the auction card from deck (it's being auctioned)
    const deckWithoutAuction = state.treacheryDeck.filter(c => c.definitionId !== auctionCard.definitionId);
    const stateWithDeck = { ...state, treacheryDeck: deckWithoutAuction };
    
    const events: any[] = [];
    const result = resolveAuction(context, stateWithDeck, events, stateWithDeck.stormOrder, 0);
    
    // Should draw free card (hand size should increase by 2: purchased card + free card)
    // But only if deck has cards
    if (result.result.state.treacheryDeck.length > 0) {
      assertHandSize(result.result.state, Faction.HARKONNEN, originalHandSize + 2);
      assertHarkonnenDrewFreeCard(result.result.state, events);
    } else {
      // Deck empty - can't draw free card, but should still get purchased card
      assertHandSize(result.result.state, Faction.HARKONNEN, originalHandSize + 1);
    }
    
    console.log('  ✅ Harkonnen TOP CARD correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Harkonnen TOP CARD test failed:', error);
    failed++;
  }

  // Test: Harkonnen TOP CARD - hand at 7 (cannot draw, would exceed 8)
  console.log('\n📋 Testing Harkonnen TOP CARD - hand at 7...');
  
  try {
    const state = createHarkonnenTopCardTestState(7); // Hand size 7, cannot draw (would be 9)
    const originalHandSize = state.factions.get(Faction.HARKONNEN)!.hand.length;
    const context = createResolutionTestContext(Faction.HARKONNEN, 5);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = resolveAuction(context, state, events, state.stormOrder, 0);
    
    // Should NOT draw free card (hand size should increase by 1 only: purchased card)
    assertHandSize(result.result.state, Faction.HARKONNEN, originalHandSize + 1);
    
    // Should NOT have CARD_DRAWN_FREE event
    const freeCardEvent = events.find(e => e.type === 'CARD_DRAWN_FREE');
    assert(freeCardEvent === undefined, 'Should NOT have CARD_DRAWN_FREE event');
    
    console.log('  ✅ Harkonnen TOP CARD - hand at 7 correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Harkonnen TOP CARD test failed:', error);
    failed++;
  }

  // Test: Karama flags cleared
  console.log('\n📋 Testing Karama flags cleared...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN]) // Need at least 2 factions
      .withSpice(Faction.ATREIDES, 10)
      .withKaramaFlags(Faction.ATREIDES, true, false) // bidding active
      .build();
    
    const context = createResolutionTestContext(Faction.ATREIDES, 5);
    context.cardsForAuction = ['card_1'];
    context.auctionCards = state.treacheryDeck.slice(0, 1) as any;
    
    const events: any[] = [];
    const result = resolveAuction(context, state, events, state.stormOrder, 0);
    
    // Karama flags should be cleared
    assertKaramaFlagsCleared(result.result.state, Faction.ATREIDES);
    
    console.log('  ✅ Karama flags cleared correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Karama flags cleared test failed:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '-'.repeat(80));
  console.log(`Resolution Tests: ${passed} passed, ${failed} failed`);
  console.log('-'.repeat(80));

  return passed;
}

