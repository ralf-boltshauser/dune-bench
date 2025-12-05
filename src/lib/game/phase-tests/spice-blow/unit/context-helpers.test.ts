/**
 * Unit Tests for Context Helpers
 * 
 * Tests for context helper functions in context/helpers.ts
 */

import { withContext, extractContext, updateContext } from '../../../phases/handlers/spice-blow/context/helpers';
import { createInitialContext } from '../../../phases/handlers/spice-blow/context';
import { TerritoryId } from '../../../types';

/**
 * Test withContext function
 */
export function testWithContext() {
  console.log('\n=== Testing withContext ===');
  
  const baseResult = {
    state: {} as any,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  };
  const context = createInitialContext();
  
  const result = withContext(baseResult, context);
  
  if (result.context !== context) {
    throw new Error('Expected context to be the same object');
  }
  
  if (result.phaseComplete !== false) {
    throw new Error('Expected phaseComplete to be preserved');
  }
  
  console.log('✓ withContext works correctly');
}

/**
 * Test extractContext function
 */
export function testExtractContext() {
  console.log('\n=== Testing extractContext ===');
  
  const baseResult = {
    state: {} as any,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  };
  const context = createInitialContext();
  const resultWithContext = withContext(baseResult, context);
  
  const { result, context: extractedContext } = extractContext(resultWithContext);
  
  if (extractedContext !== context) {
    throw new Error('Expected extracted context to be the same object');
  }
  
  if ('context' in result) {
    throw new Error('Expected base result to not have context property');
  }
  
  if (result.phaseComplete !== false) {
    throw new Error('Expected phaseComplete to be preserved');
  }
  
  console.log('✓ extractContext works correctly');
}

/**
 * Test updateContext function
 */
export function testUpdateContext() {
  console.log('\n=== Testing updateContext ===');
  
  const context = createInitialContext();
  const baseResult = {
    state: {} as any,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  };
  const resultWithContext = withContext(baseResult, context);
  
  const updated = updateContext(resultWithContext, {
    cardARevealed: true,
    lastSpiceLocation: { territoryId: TerritoryId.CIELAGO_SOUTH, sector: 1 },
  });
  
  if (updated.context.cardARevealed !== true) {
    throw new Error('Expected cardARevealed to be updated to true');
  }
  
  if (updated.context.lastSpiceLocation?.territoryId !== TerritoryId.CIELAGO_SOUTH) {
    throw new Error('Expected lastSpiceLocation to be updated');
  }
  
  // Other fields should be preserved
  if (updated.context.cardBRevealed !== false) {
    throw new Error('Expected cardBRevealed to remain false');
  }
  
  console.log('✓ updateContext works correctly');
}

/**
 * Run all context helper tests
 */
export function runContextHelperTests() {
  console.log('='.repeat(80));
  console.log('CONTEXT HELPER UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testWithContext();
    testExtractContext();
    testUpdateContext();
    
    console.log('\n✅ All context helper tests passed!');
  } catch (error) {
    console.error('❌ Context helper tests failed:', error);
    throw error;
  }
}

