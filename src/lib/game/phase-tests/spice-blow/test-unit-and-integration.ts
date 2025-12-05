/**
 * Unit and Integration Test Runner for Spice Blow Phase
 * 
 * Runs all unit tests and integration tests
 */

// Unit Tests
import { runValidationTests } from './unit/validation.test';
import { runPlacementTests } from './unit/placement.test';
import { runEventFactoryTests } from './unit/events-factory.test';
import { runResultFactoryTests } from './unit/results-factory.test';
import { runContextHelperTests } from './unit/context-helpers.test';
import { runRequestBuilderTests } from './unit/requests-builders.test';

// Integration Tests
import { runCardRevelationTests } from './integration/card-revelation.test';
import { runSpicePlacementTests } from './integration/spice-placement.test';
import { runDeckManagementTests } from './integration/deck-management.test';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('SPICE BLOW PHASE - UNIT & INTEGRATION TESTS');
  console.log('='.repeat(80));
  console.log('');
  
  const results: Array<{ name: string; passed: boolean; error?: Error }> = [];
  
  // Unit Tests
  console.log('UNIT TESTS');
  console.log('-'.repeat(80));
  
  try {
    runValidationTests();
    results.push({ name: 'Validation Module', passed: true });
  } catch (error) {
    results.push({ name: 'Validation Module', passed: false, error: error as Error });
  }
  
  try {
    runPlacementTests();
    results.push({ name: 'Placement Module', passed: true });
  } catch (error) {
    results.push({ name: 'Placement Module', passed: false, error: error as Error });
  }
  
  try {
    runEventFactoryTests();
    results.push({ name: 'Event Factory', passed: true });
  } catch (error) {
    results.push({ name: 'Event Factory', passed: false, error: error as Error });
  }
  
  try {
    runResultFactoryTests();
    results.push({ name: 'Result Factory', passed: true });
  } catch (error) {
    results.push({ name: 'Result Factory', passed: false, error: error as Error });
  }
  
  try {
    runContextHelperTests();
    results.push({ name: 'Context Helpers', passed: true });
  } catch (error) {
    results.push({ name: 'Context Helpers', passed: false, error: error as Error });
  }
  
  try {
    runRequestBuilderTests();
    results.push({ name: 'Request Builders', passed: true });
  } catch (error) {
    results.push({ name: 'Request Builders', passed: false, error: error as Error });
  }
  
  // Integration Tests
  console.log('\nINTEGRATION TESTS');
  console.log('-'.repeat(80));
  
  try {
    await runCardRevelationTests();
    results.push({ name: 'Card Revelation Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Card Revelation Integration', passed: false, error: error as Error });
  }
  
  try {
    await runSpicePlacementTests();
    results.push({ name: 'Spice Placement Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Spice Placement Integration', passed: false, error: error as Error });
  }
  
  try {
    runDeckManagementTests();
    results.push({ name: 'Deck Management Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Deck Management Integration', passed: false, error: error as Error });
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  });
  
  console.log('');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(80));
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };

