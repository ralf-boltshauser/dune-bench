/**
 * Unit Tests for Result Factory
 * 
 * Tests for result creation functions in results/factory.ts
 */

import { Phase } from '../../../types';
import { SpiceBlowResults } from '../../../phases/handlers/spice-blow/results/factory';
import { createInitialContext } from '../../../phases/handlers/spice-blow/context';
import { buildTestState } from '../helpers/test-state-builder';
import { FACTION_PRESETS } from '../helpers/fixtures';

/**
 * Test complete result
 */
export function testCompleteResult() {
  console.log('\n=== Testing complete Result ===');
  
  const state = buildTestState({
    factions: FACTION_PRESETS.TWO_FACTIONS,
    turn: 2,
  });
  const context = createInitialContext();
  const events: any[] = [];
  
  const result = SpiceBlowResults.complete(state, context, events);
  
  if (!result.phaseComplete) {
    throw new Error('Expected phaseComplete to be true');
  }
  
  if (result.nextPhase !== Phase.CHOAM_CHARITY) {
    throw new Error(`Expected nextPhase to be ${Phase.CHOAM_CHARITY}, but got ${result.nextPhase}`);
  }
  
  if (result.context !== context) {
    throw new Error('Expected context to be the same object');
  }
  
  if (result.events.length !== 0) {
    throw new Error(`Expected empty events array, but got ${result.events.length} events`);
  }
  
  console.log('✓ complete result created correctly');
}

/**
 * Test pending result
 */
export function testPendingResult() {
  console.log('\n=== Testing pending Result ===');
  
  const state = buildTestState({
    factions: FACTION_PRESETS.TWO_FACTIONS,
    turn: 2,
  });
  const context = createInitialContext();
  const requests: any[] = [{ type: 'TEST_REQUEST' }];
  const events: any[] = [];
  
  const result = SpiceBlowResults.pending(state, context, requests, events, false);
  
  if (result.phaseComplete) {
    throw new Error('Expected phaseComplete to be false');
  }
  
  if (result.pendingRequests.length !== 1) {
    throw new Error(`Expected 1 pending request, but got ${result.pendingRequests.length}`);
  }
  
  if (result.simultaneousRequests !== false) {
    throw new Error(`Expected simultaneousRequests to be false, but got ${result.simultaneousRequests}`);
  }
  
  console.log('✓ pending result created correctly');
}

/**
 * Test incomplete result
 */
export function testIncompleteResult() {
  console.log('\n=== Testing incomplete Result ===');
  
  const state = buildTestState({
    factions: FACTION_PRESETS.TWO_FACTIONS,
    turn: 2,
  });
  const context = createInitialContext();
  const events: any[] = [];
  
  const result = SpiceBlowResults.incomplete(state, context, events);
  
  if (result.phaseComplete) {
    throw new Error('Expected phaseComplete to be false');
  }
  
  if (result.pendingRequests.length !== 0) {
    throw new Error(`Expected no pending requests, but got ${result.pendingRequests.length}`);
  }
  
  console.log('✓ incomplete result created correctly');
}

/**
 * Test withContext wrapper
 */
export function testWithContext() {
  console.log('\n=== Testing withContext Wrapper ===');
  
  const state = buildTestState({
    factions: FACTION_PRESETS.TWO_FACTIONS,
    turn: 2,
  });
  const baseResult = {
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  };
  const context = createInitialContext();
  
  const result = SpiceBlowResults.withContext(baseResult, context);
  
  if (result.context !== context) {
    throw new Error('Expected context to be the same object');
  }
  
  if (result.state !== state) {
    throw new Error('Expected state to be preserved');
  }
  
  if (result.phaseComplete !== false) {
    throw new Error('Expected phaseComplete to be preserved');
  }
  
  console.log('✓ withContext wrapper works correctly');
}

/**
 * Run all result factory tests
 */
export function runResultFactoryTests() {
  console.log('='.repeat(80));
  console.log('RESULT FACTORY UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testCompleteResult();
    testPendingResult();
    testIncompleteResult();
    testWithContext();
    
    console.log('\n✅ All result factory tests passed!');
  } catch (error) {
    console.error('❌ Result factory tests failed:', error);
    throw error;
  }
}

