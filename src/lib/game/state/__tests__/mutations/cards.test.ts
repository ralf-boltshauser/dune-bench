/**
 * Tests for card mutations
 */

import { Faction } from '../../../types';
import {
  drawTreacheryCard,
  discardTreacheryCard,
  removeTraitorCard,
} from '../../mutations/cards';
import { buildTestState } from '../helpers/test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
} from '../helpers/immutability-helpers';
import {
  expectHandSize,
  expectCardInHand,
  expectCardNotInHand,
  expectCardInDiscard,
  expectDeckSize,
  expectDiscardSize,
} from '../helpers/assertion-helpers';

/**
 * Test drawTreacheryCard
 */
function testDrawTreacheryCard() {
  console.log('\n=== Testing drawTreacheryCard ===');

  // Test: Draw card from deck
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const initialDeckSize = state1.treacheryDeck.length;
  const initialHandSize = state1.factions.get(Faction.ATREIDES)!.hand.length;
  const result1 = drawTreacheryCard(state1, Faction.ATREIDES);
  
  expectDeckSize(result1, 'treachery', initialDeckSize - 1);
  expectHandSize(result1, Faction.ATREIDES, initialHandSize + 1);
  console.log('✓ Draw card from deck');

  // Test: Card location updated to HAND
  const card = result1.factions.get(Faction.ATREIDES)!.hand[result1.factions.get(Faction.ATREIDES)!.hand.length - 1];
  if (card.location !== 'hand') {
    throw new Error(`Expected card location to be 'hand', but got ${card.location}`);
  }
  console.log('✓ Card location updated to HAND');

  // Test: Card ownerId set to faction
  if (card.ownerId !== Faction.ATREIDES) {
    throw new Error(`Expected card ownerId to be ${Faction.ATREIDES}, but got ${card.ownerId}`);
  }
  console.log('✓ Card ownerId set to faction');

  // Test: Draw when hand is at max-1 for other factions (3 cards) → succeeds
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withHandSize(Faction.ATREIDES, 3)
    .build();

  const result2 = drawTreacheryCard(state2, Faction.ATREIDES);
  expectHandSize(result2, Faction.ATREIDES, 4);
  console.log('✓ Draw when hand is at max-1 for other factions (3 cards) → succeeds');

  // Test: Draw when hand is at max for other factions (4 cards) → fails
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withHandSize(Faction.ATREIDES, 4)
    .build();

  const result3 = drawTreacheryCard(state3, Faction.ATREIDES);
  expectHandSize(result3, Faction.ATREIDES, 4); // Should remain 4
  console.log('✓ Draw when hand is at max for other factions (4 cards) → fails');

  // Test: Harkonnen: Max hand size is 8
  const state4 = buildTestState()
    .withFactions([Faction.HARKONNEN, Faction.ATREIDES])
    .withHandSize(Faction.HARKONNEN, 7)
    .build();

  const result4 = drawTreacheryCard(state4, Faction.HARKONNEN);
  expectHandSize(result4, Faction.HARKONNEN, 8);
  console.log('✓ Harkonnen: Draw when at max-1 (7 cards) → succeeds');

  // Test: Harkonnen: Draw when at max (8 cards) → fails
  const state5 = buildTestState()
    .withFactions([Faction.HARKONNEN, Faction.ATREIDES])
    .withHandSize(Faction.HARKONNEN, 8)
    .build();

  const result5 = drawTreacheryCard(state5, Faction.HARKONNEN);
  expectHandSize(result5, Faction.HARKONNEN, 8); // Should remain 8
  console.log('✓ Harkonnen: Draw when at max (8 cards) → fails');

  // Test: Draw when deck is empty → reshuffle discard pile
  const state6 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();
  
  // Empty deck and add cards to discard
  state6.treacheryDeck = [];
  const discardCard = state6.treacheryDiscard[0] || state6.factions.get(Faction.ATREIDES)!.hand[0];
  if (discardCard) {
    state6.treacheryDiscard = [discardCard];
  }

  const result6 = drawTreacheryCard(state6, Faction.ATREIDES);
  if (result6.treacheryDeck.length === 0 && result6.treacheryDiscard.length > 0) {
    throw new Error('Expected discard to be reshuffled into deck');
  }
  console.log('✓ Draw when deck is empty → reshuffle discard pile');

  // Test: Immutability
  const state7 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();
  const original7 = cloneStateForTesting(state7);
  const result7 = drawTreacheryCard(state7, Faction.ATREIDES);
  verifyStateNotSame(original7, result7);
  expectHandSize(original7, Faction.ATREIDES, state7.factions.get(Faction.ATREIDES)!.hand.length);
  console.log('✓ Immutability verified');

  console.log('✅ All drawTreacheryCard tests passed\n');
}

/**
 * Test discardTreacheryCard
 */
function testDiscardTreacheryCard() {
  console.log('\n=== Testing discardTreacheryCard ===');

  // Test: Discard card from hand
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const factionState = state1.factions.get(Faction.ATREIDES)!;
  if (factionState.hand.length === 0) {
    console.log('⚠ Skipping discard test: no cards in hand');
    return;
  }

  const cardToDiscard = factionState.hand[0];
  const initialHandSize = factionState.hand.length;
  const initialDiscardSize = state1.treacheryDiscard.length;

  const result1 = discardTreacheryCard(state1, Faction.ATREIDES, cardToDiscard.definitionId);
  
  expectHandSize(result1, Faction.ATREIDES, initialHandSize - 1);
  expectCardNotInHand(result1, Faction.ATREIDES, cardToDiscard.definitionId);
  expectCardInDiscard(result1, cardToDiscard.definitionId);
  expectDiscardSize(result1, 'treachery', initialDiscardSize + 1);
  console.log('✓ Discard card from hand');

  // Test: Card location updated to DISCARD
  const discardedCard = result1.treacheryDiscard.find(c => c.definitionId === cardToDiscard.definitionId);
  if (!discardedCard) {
    throw new Error('Card not found in discard pile');
  }
  if (discardedCard.location !== 'discard') {
    throw new Error(`Expected card location to be 'discard', but got ${discardedCard.location}`);
  }
  console.log('✓ Card location updated to DISCARD');

  // Test: Card ownerId set to null
  if (discardedCard.ownerId !== null) {
    throw new Error(`Expected card ownerId to be null, but got ${discardedCard.ownerId}`);
  }
  console.log('✓ Card ownerId set to null');

  // Test: Discard when hand is empty (should return state unchanged)
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withHandSize(Faction.ATREIDES, 0)
    .build();

  const result2 = discardTreacheryCard(state2, Faction.ATREIDES, 'non-existent-card');
  expectHandSize(result2, Faction.ATREIDES, 0);
  console.log('✓ Discard when hand is empty (should return state unchanged)');

  // Test: Immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();
  const original3 = cloneStateForTesting(state3);
  if (state3.factions.get(Faction.ATREIDES)!.hand.length > 0) {
    const cardId = state3.factions.get(Faction.ATREIDES)!.hand[0].definitionId;
    const result3 = discardTreacheryCard(state3, Faction.ATREIDES, cardId);
    verifyStateNotSame(original3, result3);
  }
  console.log('✓ Immutability verified');

  console.log('✅ All discardTreacheryCard tests passed\n');
}

/**
 * Test removeTraitorCard
 */
function testRemoveTraitorCard() {
  console.log('\n=== Testing removeTraitorCard ===');

  // Test: Remove traitor card after revelation
  const state1 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTraitorCard(Faction.ATREIDES, 'leader-1')
    .build();

  const factionState1 = state1.factions.get(Faction.ATREIDES)!;
  const initialTraitorCount = factionState1.traitors.length;

  const result1 = removeTraitorCard(state1, Faction.ATREIDES, 'leader-1');
  const newFactionState = result1.factions.get(Faction.ATREIDES)!;
  
  if (newFactionState.traitors.length !== initialTraitorCount - 1) {
    throw new Error(
      `Expected traitor count to be ${initialTraitorCount - 1}, but got ${newFactionState.traitors.length}`
    );
  }
  if (newFactionState.traitors.some(t => t.leaderId === 'leader-1')) {
    throw new Error('Traitor card should be removed');
  }
  console.log('✓ Remove traitor card after revelation');

  // Test: Remove non-existent traitor card (should handle gracefully)
  const state2 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .build();

  const factionState2 = state2.factions.get(Faction.ATREIDES)!;
  const initialTraitorCount2 = factionState2.traitors.length;

  const result2 = removeTraitorCard(state2, Faction.ATREIDES, 'non-existent-leader');
  const newFactionState2 = result2.factions.get(Faction.ATREIDES)!;
  
  if (newFactionState2.traitors.length !== initialTraitorCount2) {
    throw new Error('Traitor count should not change when removing non-existent card');
  }
  console.log('✓ Remove non-existent traitor card (should handle gracefully)');

  // Test: Immutability
  const state3 = buildTestState()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTraitorCard(Faction.ATREIDES, 'leader-1')
    .build();
  const original3 = cloneStateForTesting(state3);
  const result3 = removeTraitorCard(state3, Faction.ATREIDES, 'leader-1');
  verifyStateNotSame(original3, result3);
  if (original3.factions.get(Faction.ATREIDES)!.traitors.length === 0) {
    throw new Error('Original state should still have traitor card');
  }
  console.log('✓ Immutability verified');

  console.log('✅ All removeTraitorCard tests passed\n');
}

/**
 * Run all card mutation tests
 */
export function runCardsTests() {
  console.log('='.repeat(80));
  console.log('CARD MUTATIONS TEST');
  console.log('='.repeat(80));

  try {
    testDrawTreacheryCard();
    testDiscardTreacheryCard();
    testRemoveTraitorCard();
    console.log('✅ All card mutation tests passed!');
  } catch (error) {
    console.error('❌ Card mutation tests failed:', error);
    throw error;
  }
}

