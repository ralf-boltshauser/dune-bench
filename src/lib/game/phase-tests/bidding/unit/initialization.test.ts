/**
 * Unit Tests for Initialization Module
 * 
 * Tests individual functions from bidding/initialization.ts in isolation.
 */

import { Faction, Phase } from '../../../types';
import { initializeBiddingPhase } from '../../../phases/handlers/bidding/initialization';
import { 
  assertEventEmitted, 
  assertEventData,
  assertPhaseComplete,
  assertNextPhase,
  assertDeckSize,
} from '../helpers/assertions';
import { 
  BiddingTestStateBuilder,
  createBasicBiddingState,
  createFullHandState,
} from '../helpers/test-state-builder';
import { 
  createInitializationTestContext,
  assertHandSizeDeclarations,
  assertCardsDealt,
} from '../helpers/module-test-utils';
import { testModuleFunction } from '../helpers/test-patterns';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all initialization module tests
 */
export function runInitializationTests(): number {
  console.log('\n' + '='.repeat(80));
  console.log('INITIALIZATION MODULE TESTS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test: Hand size declarations (Rule 1.04.01)
  console.log('\n📋 Testing hand size declarations...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withHandSize(Faction.ATREIDES, 2)
      .withHandSize(Faction.HARKONNEN, 0)
      .withHandSize(Faction.EMPEROR, 4) // Full
      .build();
    
    const context = createInitializationTestContext();
    const result = initializeBiddingPhase(context, state, state.stormOrder);
    
    assertEventEmitted(result.result.events, 'HAND_SIZE_DECLARED');
    const event = result.result.events.find(e => e.type === 'HAND_SIZE_DECLARED');
    assert(event !== undefined, 'HAND_SIZE_DECLARED event should exist');
    
    const declarations = (event as any).data.declarations;
    assert(declarations.length === 3, 'Should have 3 declarations');
    
    const atreidesDecl = declarations.find((d: any) => d.faction === Faction.ATREIDES);
    assert(atreidesDecl?.handSize === 2, 'Atreides should have hand size 2');
    assert(atreidesDecl?.category === 'at least 1 card', 'Atreides category should be "at least 1 card"');
    
    const harkonnenDecl = declarations.find((d: any) => d.faction === Faction.HARKONNEN);
    assert(harkonnenDecl?.handSize === 0, 'Harkonnen should have hand size 0');
    assert(harkonnenDecl?.category === 'no cards', 'Harkonnen category should be "no cards"');
    
    const emperorDecl = declarations.find((d: any) => d.faction === Faction.EMPEROR);
    assert(emperorDecl?.handSize === 4, 'Emperor should have hand size 4');
    assert(emperorDecl?.category === '4 or more cards', 'Emperor category should be "4 or more cards"');
    
    console.log('  ✅ Hand size declarations correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Hand size declarations failed:', error);
    failed++;
  }

  // Test: Card dealing (Rule 1.04.04) - 1 per eligible bidder
  console.log('\n📋 Testing card dealing...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR])
      .withHandSize(Faction.ATREIDES, 2) // Eligible
      .withHandSize(Faction.HARKONNEN, 0) // Eligible
      .withHandSize(Faction.EMPEROR, 4) // Full - not eligible
      .build();
    
    const originalDeckSize = state.treacheryDeck?.length || 0;
    const context = createInitializationTestContext();
    const result = initializeBiddingPhase(context, state, state.stormOrder);
    
    // Should deal 2 cards (Atreides and Harkonnen are eligible, Emperor is not)
    assert(result.context.cardsForAuction.length === 2, 'Should deal 2 cards (2 eligible bidders)');
    assert(result.context.auctionCards?.length === 2, 'Should have 2 auction cards');
    if (result.state && result.state.treacheryDeck) {
      assert(result.state.treacheryDeck.length === originalDeckSize - 2, 'Deck should have 2 fewer cards');
    }
    
    console.log('  ✅ Card dealing correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Card dealing failed:', error);
    failed++;
  }

  // Test: Early exit when no cards to auction (all hands full)
  console.log('\n📋 Testing early exit - all hands full...');
  
  try {
    const state = createFullHandState();
    const context = createInitializationTestContext();
    const result = initializeBiddingPhase(context, state, state.stormOrder);
    
    assertPhaseComplete(result.result, true);
    assertNextPhase(result.result, Phase.REVIVAL);
    assert(result.context.cardsForAuction.length === 0, 'Should have no cards for auction');
    
    console.log('  ✅ Early exit when all hands full');
    passed++;
  } catch (error) {
    console.error('  ❌ Early exit test failed:', error);
    failed++;
  }

  // Test: Early exit when treachery deck is empty
  console.log('\n📋 Testing early exit - empty deck...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .build();
    
    // Manually clear the deck after building
    const stateWithEmptyDeck = { ...state, treacheryDeck: [] };
    
    const context = createInitializationTestContext();
    const result = initializeBiddingPhase(context, stateWithEmptyDeck, stateWithEmptyDeck.stormOrder);
    
    assertPhaseComplete(result.result, true);
    assertNextPhase(result.result, Phase.REVIVAL);
    assert(result.context.cardsForAuction.length === 0, 'Should have no cards for auction');
    
    console.log('  ✅ Early exit when deck empty');
    passed++;
  } catch (error) {
    console.error('  ❌ Early exit test failed:', error);
    failed++;
  }

  // Test: Context initialization
  console.log('\n📋 Testing context initialization...');
  
  try {
    const state = createBasicBiddingState();
    const context = createInitializationTestContext();
    const result = initializeBiddingPhase(context, state, state.stormOrder);
    
    assert(result.context.currentCardIndex === 0, 'currentCardIndex should be 0');
    assert(result.context.currentBid === 0, 'currentBid should be 0');
    assert(result.context.highBidder === null, 'highBidder should be null');
    assert(result.context.passedFactions.size === 0, 'passedFactions should be empty');
    assert(result.context.startingBidder === state.stormOrder[0], 'startingBidder should be first in storm order');
    // Note: atreidesHasPeeked will be true if Atreides is in game and peek request was created
    // This is expected behavior - the flag is set when peek request is created
    
    console.log('  ✅ Context initialization correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Context initialization failed:', error);
    failed++;
  }

  // Test: Harkonnen max hand size (8 cards)
  console.log('\n📋 Testing Harkonnen max hand size...');
  
  try {
    const state = new BiddingTestStateBuilder()
      .withFactions([Faction.HARKONNEN, Faction.ATREIDES]) // Need at least 2 factions
      .withHandSize(Faction.HARKONNEN, 8) // Full for Harkonnen
      .build();
    
    const context = createInitializationTestContext();
    const result = initializeBiddingPhase(context, state, state.stormOrder);
    
    const harkonnenDecl = result.result.events
      .find(e => e.type === 'HAND_SIZE_DECLARED') as any;
    const harkonnenData = harkonnenDecl?.data.declarations.find((d: any) => d.faction === Faction.HARKONNEN);
    assert(harkonnenData?.handSize === 8, 'Harkonnen should have hand size 8');
    assert(harkonnenData?.category === '4 or more cards', 'Harkonnen category should be "4 or more cards"');
    
    // Harkonnen with 8 cards should not be eligible, but Atreides is eligible
    // So 1 card should be dealt (for Atreides)
    assert(result.context.cardsForAuction.length === 1, 'Should have 1 card (Atreides eligible, Harkonnen not)');
    
    console.log('  ✅ Harkonnen max hand size correct');
    passed++;
  } catch (error) {
    console.error('  ❌ Harkonnen max hand size test failed:', error);
    failed++;
  }

  // Summary
  console.log('\n' + '-'.repeat(80));
  console.log(`Initialization Tests: ${passed} passed, ${failed} failed`);
  console.log('-'.repeat(80));

  return passed;
}

