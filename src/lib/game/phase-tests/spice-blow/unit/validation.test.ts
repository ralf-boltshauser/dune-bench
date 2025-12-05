/**
 * Unit Tests for Validation Module
 * 
 * Tests for storm validation and location checks
 */

import { Faction, TerritoryId } from '../../../types';
import { isInStorm } from '../../../phases/handlers/spice-blow/validation';
import { ValidationTestUtils } from '../helpers/module-test-utils';
import { assertSpiceNotPlaced } from '../helpers/assertions';

/**
 * Test isInStorm function
 */
export function testIsInStorm() {
  console.log('\n=== Testing isInStorm ===');
  
  // Test exact sector match
  const state1 = ValidationTestUtils.createStormState(3);
  const result1 = isInStorm(state1, 3, TerritoryId.RED_CHASM);
  if (!result1) {
    throw new Error('Expected isInStorm(3, RED_CHASM) to return true when storm is at sector 3');
  }
  console.log('✓ Exact sector match works');
  
  // Test different sector
  const result2 = isInStorm(state1, 5, TerritoryId.ROCK_OUTCROPPINGS);
  if (result2) {
    throw new Error('Expected isInStorm(5, ROCK_OUTCROPPINGS) to return false when storm is at sector 3');
  }
  console.log('✓ Different sector works');
  
  // Test sector 0
  const state2 = ValidationTestUtils.createStormState(0);
  const result3 = isInStorm(state2, 0, TerritoryId.CIELAGO_NORTH);
  if (!result3) {
    throw new Error('Expected isInStorm(0, CIELAGO_NORTH) to return true when storm is at sector 0');
  }
  console.log('✓ Sector 0 works');
  
  console.log('✅ All isInStorm tests passed\n');
}

/**
 * Test validateNoSpiceInStorm function
 */
export function testValidateNoSpiceInStorm() {
  console.log('\n=== Testing validateNoSpiceInStorm ===');
  
  // This function should not throw if no spice in storm
  const state = ValidationTestUtils.createStormState(3);
  
  // Import the function
  const { validateNoSpiceInStorm } = require('../../../phases/handlers/spice-blow/validation');
  
  // Should not throw when no spice in storm
  validateNoSpiceInStorm(state);
  console.log('✓ No spice in storm - validation passes');
  
  // Note: The function logs but doesn't throw, so we can't test the error case easily
  // This is by design - it's a runtime validation that logs issues
  
  console.log('✅ All validateNoSpiceInStorm tests passed\n');
}

/**
 * Run all validation tests
 */
export function runValidationTests() {
  console.log('='.repeat(80));
  console.log('VALIDATION MODULE UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testIsInStorm();
    testValidateNoSpiceInStorm();
    console.log('✅ All validation module tests passed!');
  } catch (error) {
    console.error('❌ Validation module tests failed:', error);
    throw error;
  }
}

