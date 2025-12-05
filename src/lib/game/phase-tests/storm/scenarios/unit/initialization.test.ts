/**
 * Unit Tests for Initialization Module
 * 
 * Tests the initialization module functions in isolation.
 */

import { Faction } from '../../../../types';
import {
  shouldUseStormDeck,
  initializeStormPhase,
  revealStormCard,
  drawStormCard,
  parseStormCardValue,
  returnCardToStormDeckAndShuffle,
  storeStormCardForFremen,
  handleStormDeckAfterMovement,
} from '../../../../phases/handlers/storm/initialization';
import { resetContext } from '../../../../phases/handlers/storm/initialization';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { StormAssertions } from '../../helpers/assertions';
import { EventAssertions } from '../../helpers/event-assertions';
import { InitializationTestHelpers } from '../../helpers/module-helpers/initialization-helpers';
import { StateAssertions } from '../../helpers/state-assertions';

/**
 * Test: shouldUseStormDeck conditions
 */
export function testShouldUseStormDeck(): boolean {
  console.log('\n📋 Test: shouldUseStormDeck');

  try {
    // Test 1: Fremen + advanced + turn > 1
    const state1 = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .build();
    if (!shouldUseStormDeck(state1)) {
      throw new Error('Expected true for Fremen + advanced + turn 2');
    }

    // Test 2: Turn 1
    const state2 = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 1)
      .build();
    if (shouldUseStormDeck(state2)) {
      throw new Error('Expected false for Turn 1');
    }

    // Test 3: No Fremen
    const state3 = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10)
      .build();
    if (shouldUseStormDeck(state3)) {
      throw new Error('Expected false without Fremen');
    }

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: initializeStormPhase with normal dialing
 */
export function testInitializeStormPhaseNormal(): boolean {
  console.log('\n📋 Test: initializeStormPhase - Normal Dialing');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10)
      .build();

    const context = { ...resetContext() };
    const result = initializeStormPhase(state, context);

    StormAssertions.assertPendingRequests(result, 2, ['DIAL_STORM']);
    if (result.phaseComplete) {
      throw new Error('Expected phase not to be complete');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: initializeStormPhase with storm deck
 */
export function testInitializeStormPhaseDeck(): boolean {
  console.log('\n📋 Test: initializeStormPhase - Storm Deck');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withStormSector(10)
      .withFremenStormCard('4')
      .build();

    const context = { ...resetContext() };
    const result = initializeStormPhase(state, context);

    EventAssertions.assertEventExists(result.events, 'STORM_CARD_REVEALED');
    if (context.stormMovement !== 4) {
      throw new Error(`Expected movement 4, but got ${context.stormMovement}`);
    }
    if (result.pendingRequests.length !== 0) {
      throw new Error('Expected no dial requests for storm deck');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: revealStormCard
 */
export function testRevealStormCard(): boolean {
  console.log('\n📋 Test: revealStormCard');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withFremenStormCard('3')
      .build();

    const result = revealStormCard(state);

    if (result.movement !== 3) {
      throw new Error(`Expected movement 3, but got ${result.movement}`);
    }
    if (result.cardValue !== '3') {
      throw new Error(`Expected card value '3', but got ${result.cardValue}`);
    }
    StormAssertions.assertStormCardRevealed(result.events, 3);
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: drawStormCard
 */
export function testDrawStormCard(): boolean {
  console.log('\n📋 Test: drawStormCard');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .build();

    const initialSize = state.stormDeck.length;
    const result = drawStormCard(state);

    if (result.card === null || result.card < 1 || result.card > 6) {
      throw new Error(`Invalid card value: ${result.card}`);
    }
    if (result.state.stormDeck.length !== initialSize - 1) {
      throw new Error(
        `Expected deck size ${initialSize - 1}, but got ${result.state.stormDeck.length}`
      );
    }
    if (result.error !== null) {
      throw new Error(`Expected no error, but got ${result.error}`);
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: resetContext returns clean context
 */
export function testResetContext(): boolean {
  console.log('\n📋 Test: resetContext');

  try {
    const context = resetContext();
    InitializationTestHelpers.assertContextReset(context);
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: parseStormCardValue validation
 */
export function testParseStormCardValue(): boolean {
  console.log('\n📋 Test: parseStormCardValue');

  try {
    // Valid values
    if (parseStormCardValue('1') !== 1) throw new Error('Expected 1 for "1"');
    if (parseStormCardValue('6') !== 6) throw new Error('Expected 6 for "6"');
    if (parseStormCardValue('3') !== 3) throw new Error('Expected 3 for "3"');

    // Invalid values
    if (parseStormCardValue(null) !== null) throw new Error('Expected null for null');
    if (parseStormCardValue(undefined) !== null) throw new Error('Expected null for undefined');
    if (parseStormCardValue('') !== null) throw new Error('Expected null for empty string');
    if (parseStormCardValue('0') !== null) throw new Error('Expected null for "0"');
    if (parseStormCardValue('7') !== null) throw new Error('Expected null for "7"');
    if (parseStormCardValue('abc') !== null) throw new Error('Expected null for "abc"');

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: drawStormCard from empty deck
 */
export function testDrawStormCardEmptyDeck(): boolean {
  console.log('\n📋 Test: drawStormCard - Empty Deck');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withStormDeck([])
      .build();

    const result = drawStormCard(state);

    if (result.card !== null) {
      throw new Error(`Expected null card, but got ${result.card}`);
    }
    if (result.error === null) {
      throw new Error('Expected error message for empty deck');
    }
    if (result.state.stormDeck.length !== 0) {
      throw new Error('Expected deck to remain empty');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: returnCardToStormDeckAndShuffle
 */
export function testReturnCardToStormDeckAndShuffle(): boolean {
  console.log('\n📋 Test: returnCardToStormDeckAndShuffle');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withStormDeck([1, 2, 3])
      .build();

    const initialSize = state.stormDeck.length;
    const cardToReturn = 4;
    const newState = returnCardToStormDeckAndShuffle(state, cardToReturn);

    if (newState.stormDeck.length !== initialSize + 1) {
      throw new Error(
        `Expected deck size ${initialSize + 1}, but got ${newState.stormDeck.length}`
      );
    }
    if (!newState.stormDeck.includes(cardToReturn)) {
      throw new Error(`Expected card ${cardToReturn} to be in deck`);
    }
    // Note: We can't verify shuffling happened, but we verify card was added
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: storeStormCardForFremen
 */
export function testStoreStormCardForFremen(): boolean {
  console.log('\n📋 Test: storeStormCardForFremen');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .build();

    const newState = storeStormCardForFremen(state, '5');
    StateAssertions.assertFremenStormCard(newState, '5');
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: revealStormCard with invalid card (fallback)
 */
export function testRevealStormCardInvalid(): boolean {
  console.log('\n📋 Test: revealStormCard - Invalid Card (Fallback)');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withFremenStormCard('invalid')
      .build();

    const result = revealStormCard(state);

    // Should use fallback random value (1-6)
    if (result.movement < 1 || result.movement > 6) {
      throw new Error(`Expected movement 1-6, but got ${result.movement}`);
    }
    // Note: Fallback case doesn't emit an event (by design - it's a warning case)
    // The implementation returns empty events array for fallback
    if (result.events.length !== 0) {
      throw new Error('Expected no events for fallback case, but got events');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: handleStormDeckAfterMovement - Turn 1
 */
export function testHandleStormDeckAfterMovementTurn1(): boolean {
  console.log('\n📋 Test: handleStormDeckAfterMovement - Turn 1');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 1)
      .withStormDeck([1, 2, 3, 4, 5, 6])
      .build();

    const initialDeckSize = state.stormDeck.length;
    const result = handleStormDeckAfterMovement(state, []);

    // Should draw a card for Turn 2
    if (result.state.stormDeck.length !== initialDeckSize - 1) {
      throw new Error(
        `Expected deck size ${initialDeckSize - 1}, but got ${result.state.stormDeck.length}`
      );
    }
    // Should store card for Fremen
    const fremenState = result.state.factions.get(Faction.FREMEN);
    if (!fremenState || !fremenState.fremenStormCard) {
      throw new Error('Expected Fremen storm card to be stored');
    }
    EventAssertions.assertEventExists(result.events, 'STORM_CARD_DRAWN');
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: handleStormDeckAfterMovement - Turn 2+
 */
export function testHandleStormDeckAfterMovementTurn2(): boolean {
  console.log('\n📋 Test: handleStormDeckAfterMovement - Turn 2+');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withFremenStormCard('4')
      .withStormDeck([1, 2, 3, 5, 6])
      .build();

    const initialDeckSize = state.stormDeck.length;
    const result = handleStormDeckAfterMovement(state, []);

    // Should return card 4 to deck and draw new one
    // Deck size should be: initial + 1 (returned) - 1 (drawn) = initial
    if (result.state.stormDeck.length !== initialDeckSize) {
      throw new Error(
        `Expected deck size ${initialDeckSize}, but got ${result.state.stormDeck.length}`
      );
    }
    // Should have a card stored (could be the same card after shuffle, which is valid)
    const fremenState = result.state.factions.get(Faction.FREMEN);
    if (!fremenState || !fremenState.fremenStormCard) {
      throw new Error('Expected Fremen storm card to be stored');
    }
    // Verify card is valid (1-6)
    const cardValue = parseInt(fremenState.fremenStormCard, 10);
    if (isNaN(cardValue) || cardValue < 1 || cardValue > 6) {
      throw new Error(`Expected valid card value (1-6), but got ${fremenState.fremenStormCard}`);
    }
    // Verify card 4 is back in deck (after shuffle)
    if (!result.state.stormDeck.includes(4)) {
      throw new Error('Expected card 4 to be returned to deck');
    }
    EventAssertions.assertEventExists(result.events, 'STORM_CARD_DRAWN');
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all initialization unit tests
 */
export function runInitializationUnitTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('INITIALIZATION MODULE UNIT TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'shouldUseStormDeck',
    passed: testShouldUseStormDeck(),
  });

  results.push({
    name: 'initializeStormPhase - Normal',
    passed: testInitializeStormPhaseNormal(),
  });

  results.push({
    name: 'initializeStormPhase - Storm Deck',
    passed: testInitializeStormPhaseDeck(),
  });

  results.push({
    name: 'revealStormCard',
    passed: testRevealStormCard(),
  });

  results.push({
    name: 'drawStormCard',
    passed: testDrawStormCard(),
  });

  results.push({
    name: 'resetContext',
    passed: testResetContext(),
  });

  results.push({
    name: 'parseStormCardValue',
    passed: testParseStormCardValue(),
  });

  results.push({
    name: 'drawStormCard - Empty Deck',
    passed: testDrawStormCardEmptyDeck(),
  });

  results.push({
    name: 'returnCardToStormDeckAndShuffle',
    passed: testReturnCardToStormDeckAndShuffle(),
  });

  results.push({
    name: 'storeStormCardForFremen',
    passed: testStoreStormCardForFremen(),
  });

  results.push({
    name: 'revealStormCard - Invalid Card',
    passed: testRevealStormCardInvalid(),
  });

  results.push({
    name: 'handleStormDeckAfterMovement - Turn 1',
    passed: testHandleStormDeckAfterMovementTurn1(),
  });

  results.push({
    name: 'handleStormDeckAfterMovement - Turn 2+',
    passed: testHandleStormDeckAfterMovementTurn2(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
}

