/**
 * Integration Tests for Spice Placement Flow
 * 
 * Tests the complete spice placement flow including storm validation
 */

import { Faction, TerritoryId } from '../../../types';
import { SpiceBlowPhaseHandler } from '../../../phases/handlers/spice-blow';
import { TestStateBuilder } from '../helpers/test-state-builder';
import { DECK_PRESETS, TEST_CARDS } from '../helpers/fixtures';
import {
  assertSpicePlaced,
  assertSpiceNotPlaced,
  assertEventEmitted,
} from '../helpers/assertions';

/**
 * Test spice placement when not in storm
 */
export async function testSpicePlacementNotInStorm() {
  console.log('\n=== Testing Spice Placement (Not in Storm) ===');
  
  const state = TestStateBuilder.create()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTurn(2)
    .withAdvancedRules(false) // Basic rules - only deck A
    .withStormSector(5) // Storm not at sector 1
    .withSpiceDeckA(DECK_PRESETS.SINGLE_TERRITORY)
    .build();
  
  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);
  
  // Process until complete
  let currentState = initResult.state;
  let phaseComplete = initResult.phaseComplete;
  let stepCount = 0;
  const allEvents: any[] = [...initResult.events];
  
  while (!phaseComplete && stepCount < 10) {
    stepCount++;
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;
    
    // Collect events from each step
    allEvents.push(...stepResult.events);
    
    if (phaseComplete) {
      break;
    }
  }
  
  // Verify spice was placed
  assertSpicePlaced(currentState, TerritoryId.CIELAGO_SOUTH, 1, 12);
  console.log('✓ Spice placed correctly');
  
  // Verify events
  assertEventEmitted(allEvents, 'SPICE_PLACED', {
    territory: TerritoryId.CIELAGO_SOUTH,
    sector: 1,
    amount: 12,
  });
  console.log('✓ SPICE_PLACED event with correct data');
  
  console.log('✅ Spice placement (not in storm) test passed\n');
}

/**
 * Test spice NOT placed when in storm
 */
export async function testSpicePlacementInStorm() {
  console.log('\n=== Testing Spice Placement (In Storm) ===');
  
  const state = TestStateBuilder.create()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTurn(2)
    .withAdvancedRules(false) // Basic rules - only deck A
    .withStormSector(3) // Storm at sector 3
    .withSpiceDeckA([TEST_CARDS.TERRITORY_RED_CHASM]) // Spice at sector 3
    .build();
  
  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);
  
  // Process until complete
  let currentState = initResult.state;
  let phaseComplete = initResult.phaseComplete;
  let stepCount = 0;
  const allEvents: any[] = [...initResult.events];
  
  while (!phaseComplete && stepCount < 10) {
    stepCount++;
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;
    
    // Collect events from each step
    allEvents.push(...stepResult.events);
    
    if (phaseComplete) {
      break;
    }
  }
  
  // Verify spice was NOT placed
  assertSpiceNotPlaced(currentState, TerritoryId.RED_CHASM, 3);
  console.log('✓ Spice NOT placed when in storm');
  
  // Verify events
  assertEventEmitted(allEvents, 'SPICE_CARD_REVEALED');
  // Should NOT have SPICE_PLACED event
  const spicePlacedEvent = allEvents.find((e) => e.type === 'SPICE_PLACED');
  if (spicePlacedEvent) {
    throw new Error('Expected no SPICE_PLACED event when spice in storm');
  }
  console.log('✓ No SPICE_PLACED event when in storm');
  
  console.log('✅ Spice placement (in storm) test passed\n');
}

/**
 * Test multiple spice placements
 */
export async function testMultipleSpicePlacements() {
  console.log('\n=== Testing Multiple Spice Placements ===');
  
  const state = TestStateBuilder.create()
    .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
    .withTurn(2)
    .withAdvancedRules(true) // Double spice blow
    .withStormSector(5)
    .withSpiceDeckA([TEST_CARDS.TERRITORY_CIELAGO_SOUTH])
    .withSpiceDeckB([TEST_CARDS.TERRITORY_SOUTH_MESA])
    .build();
  
  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);
  
  // Process until complete
  let currentState = initResult.state;
  let phaseComplete = initResult.phaseComplete;
  let stepCount = 0;
  const allEvents: any[] = [...initResult.events];
  
  while (!phaseComplete && stepCount < 20) {
    stepCount++;
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;
    
    // Collect events from each step
    allEvents.push(...stepResult.events);
    
    if (phaseComplete) {
      break;
    }
  }
  
  // Verify both spices placed
  assertSpicePlaced(currentState, TerritoryId.CIELAGO_SOUTH, 1, 12);
  assertSpicePlaced(currentState, TerritoryId.SOUTH_MESA, 2, 10);
  console.log('✓ Both spices placed correctly');
  
  console.log('✅ Multiple spice placements test passed\n');
}

/**
 * Run all spice placement integration tests
 */
export async function runSpicePlacementTests() {
  console.log('='.repeat(80));
  console.log('SPICE PLACEMENT INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await testSpicePlacementNotInStorm();
    await testSpicePlacementInStorm();
    await testMultipleSpicePlacements();
    console.log('✅ All spice placement integration tests passed!');
  } catch (error) {
    console.error('❌ Spice placement integration tests failed:', error);
    throw error;
  }
}

