/**
 * Unit Tests for Placement Module
 * 
 * Tests for spice placement logic
 */

import { TerritoryId } from '../../../types';
import { PlacementTestUtils } from '../helpers/module-test-utils';
import { assertSpicePlaced, assertSpiceNotPlaced } from '../helpers/assertions';
import { handleTerritoryCard } from '../../../phases/handlers/spice-blow/placement';
import { getSpiceCardDefinition } from '../../../data';
import { TEST_CARDS } from '../helpers/fixtures';
import { createInitialContext } from '../../../phases/handlers/spice-blow/context';

/**
 * Test spice placement when not in storm
 */
export function testSpicePlacementNotInStorm() {
  console.log('\n=== Testing Spice Placement (Not in Storm) ===');
  
  const state = PlacementTestUtils.createPlacementState(
    TerritoryId.CIELAGO_SOUTH,
    1,
    5 // Storm at sector 5, spice at sector 1
  );
  
  const cardDef = getSpiceCardDefinition(TEST_CARDS.TERRITORY_CIELAGO_SOUTH);
  if (!cardDef) {
    throw new Error('Card definition not found');
  }
  
  const card = {
    definitionId: cardDef.id,
    type: cardDef.type,
    location: 'DECK' as const,
  };
  
  const context = createInitialContext();
  const events: any[] = [];
  
  const result = handleTerritoryCard(
    state,
    card,
    cardDef,
    'A',
    context,
    events
  );
  
  // Check spice was placed
  assertSpicePlaced(result.state, TerritoryId.CIELAGO_SOUTH, 1, 12);
  console.log('✓ Spice placed correctly when not in storm');
  
  // Check event was emitted
  const spiceEvent = result.events.find((e) => e.type === 'SPICE_PLACED');
  if (!spiceEvent) {
    throw new Error('Expected SPICE_PLACED event');
  }
  console.log('✓ SPICE_PLACED event emitted');
  
  console.log('✅ Spice placement (not in storm) test passed\n');
}

/**
 * Test spice NOT placed when in storm
 */
export function testSpicePlacementInStorm() {
  console.log('\n=== Testing Spice Placement (In Storm) ===');
  
  const state = PlacementTestUtils.createPlacementState(
    TerritoryId.RED_CHASM,
    3,
    3 // Storm at sector 3, spice at sector 3
  );
  
  const cardDef = getSpiceCardDefinition(TEST_CARDS.TERRITORY_RED_CHASM);
  if (!cardDef) {
    throw new Error('Card definition not found');
  }
  
  const card = {
    definitionId: cardDef.id,
    type: cardDef.type,
    location: 'DECK' as const,
  };
  
  const context = createInitialContext();
  const events: any[] = [];
  
  const result = handleTerritoryCard(
    state,
    card,
    cardDef,
    'A',
    context,
    events
  );
  
  // Check spice was NOT placed
  assertSpiceNotPlaced(result.state, TerritoryId.RED_CHASM, 3);
  console.log('✓ Spice NOT placed when in storm');
  
  // Check event indicates storm
  const revealEvent = result.events.find((e) => e.type === 'SPICE_CARD_REVEALED');
  if (!revealEvent) {
    throw new Error('Expected SPICE_CARD_REVEALED event');
  }
  console.log('✓ Event indicates spice not placed due to storm');
  
  console.log('✅ Spice placement (in storm) test passed\n');
}

/**
 * Run all placement tests
 */
export function runPlacementTests() {
  console.log('='.repeat(80));
  console.log('PLACEMENT MODULE UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testSpicePlacementNotInStorm();
    testSpicePlacementInStorm();
    console.log('✅ All placement module tests passed!');
  } catch (error) {
    console.error('❌ Placement module tests failed:', error);
    throw error;
  }
}

