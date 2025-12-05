/**
 * Unit and Integration Test Runner for Shipment & Movement Phase
 * 
 * Runs all unit tests and integration tests
 */

// Unit Tests
import { runConstantsTests } from './unit/constants.test';
import { runTerritoryExtractionTests } from './unit/territory-extraction.test';

// Integration Tests
import { runSequentialFlowTests } from './integration/sequential-flow.test';
import { runGuildHandlingTests } from './integration/guild-handling.test';
import { runBGAbilitiesTests } from './integration/bg-abilities.test';
import { runAllianceConstraintsTests } from './integration/alliance-constraints.test';
import { runOrnithopterFlowTests } from './integration/ornithopter-flow.test';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('SHIPMENT & MOVEMENT PHASE - UNIT & INTEGRATION TESTS');
  console.log('='.repeat(80));
  console.log('');
  
  const results: Array<{ name: string; passed: boolean; error?: Error }> = [];
  
  // Unit Tests
  console.log('UNIT TESTS');
  console.log('-'.repeat(80));
  
  try {
    runConstantsTests();
    results.push({ name: 'Constants Module', passed: true });
    console.log('✓ Constants Module tests passed\n');
  } catch (error) {
    results.push({ name: 'Constants Module', passed: false, error: error as Error });
    console.error('✗ Constants Module tests failed:', error);
    console.error('');
  }
  
  try {
    runTerritoryExtractionTests();
    results.push({ name: 'Territory Extraction', passed: true });
    console.log('✓ Territory Extraction tests passed\n');
  } catch (error) {
    results.push({ name: 'Territory Extraction', passed: false, error: error as Error });
    console.error('✗ Territory Extraction tests failed:', error);
    console.error('');
  }
  
  // Integration Tests
  console.log('INTEGRATION TESTS');
  console.log('-'.repeat(80));
  
  try {
    await runSequentialFlowTests();
    results.push({ name: 'Sequential Flow', passed: true });
    console.log('✓ Sequential Flow tests passed\n');
  } catch (error) {
    results.push({ name: 'Sequential Flow', passed: false, error: error as Error });
    console.error('✗ Sequential Flow tests failed:', error);
    console.error('');
  }
  
  try {
    await runGuildHandlingTests();
    results.push({ name: 'Guild Handling', passed: true });
    console.log('✓ Guild Handling tests passed\n');
  } catch (error) {
    results.push({ name: 'Guild Handling', passed: false, error: error as Error });
    console.error('✗ Guild Handling tests failed:', error);
    console.error('');
  }
  
  try {
    await runBGAbilitiesTests();
    results.push({ name: 'BG Abilities', passed: true });
    console.log('✓ BG Abilities tests passed\n');
  } catch (error) {
    results.push({ name: 'BG Abilities', passed: false, error: error as Error });
    console.error('✗ BG Abilities tests failed:', error);
    console.error('');
  }
  
  try {
    await runAllianceConstraintsTests();
    results.push({ name: 'Alliance Constraints', passed: true });
    console.log('✓ Alliance Constraints tests passed\n');
  } catch (error) {
    results.push({ name: 'Alliance Constraints', passed: false, error: error as Error });
    console.error('✗ Alliance Constraints tests failed:', error);
    console.error('');
  }
  
  try {
    await runOrnithopterFlowTests();
    results.push({ name: 'Ornithopter Flow', passed: true });
    console.log('✓ Ornithopter Flow tests passed\n');
  } catch (error) {
    results.push({ name: 'Ornithopter Flow', passed: false, error: error as Error });
    console.error('✗ Ornithopter Flow tests failed:', error);
    console.error('');
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total} test suites`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');
  
  if (failed > 0) {
    console.log('FAILED TESTS:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ✗ ${r.name}`);
        if (r.error) {
          console.log(`    Error: ${r.error.message}`);
        }
      });
    console.log('');
  }
  
  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

