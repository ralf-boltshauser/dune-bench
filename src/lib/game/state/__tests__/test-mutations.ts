/**
 * Mutation Tests Runner
 * 
 * Main test runner for all mutation tests.
 * Uses the same pattern as other phase tests in the project.
 */

import { runCommonTests } from './mutations/common.test';
import { runSpiceTests } from './mutations/spice.test';
import { runPhaseTests } from './mutations/phase.test';
import { runStormTests } from './mutations/storm.test';
import { runForcesTests } from './mutations/forces.test';
import { runCardsTests } from './mutations/cards.test';
import { runAlliancesTests } from './mutations/alliances.test';
import { runLeadersTests } from './mutations/leaders.test';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('MUTATION TESTS');
  console.log('='.repeat(80));
  console.log('');

  const results: Array<{ name: string; passed: boolean; error?: Error }> = [];

  // Common mutations
  try {
    runCommonTests();
    results.push({ name: 'Common Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Common Mutations', passed: false, error: error as Error });
  }

  // Spice mutations
  try {
    runSpiceTests();
    results.push({ name: 'Spice Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Spice Mutations', passed: false, error: error as Error });
  }

  // Phase mutations
  try {
    runPhaseTests();
    results.push({ name: 'Phase Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Phase Mutations', passed: false, error: error as Error });
  }

  // Storm mutations
  try {
    runStormTests();
    results.push({ name: 'Storm Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Storm Mutations', passed: false, error: error as Error });
  }

  // Force mutations
  try {
    runForcesTests();
    results.push({ name: 'Force Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Force Mutations', passed: false, error: error as Error });
  }

  // Card mutations
  try {
    runCardsTests();
    results.push({ name: 'Card Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Card Mutations', passed: false, error: error as Error });
  }

  // Alliance mutations
  try {
    runAlliancesTests();
    results.push({ name: 'Alliance Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Alliance Mutations', passed: false, error: error as Error });
  }

  // Leader mutations
  try {
    runLeadersTests();
    results.push({ name: 'Leader Mutations', passed: true });
  } catch (error) {
    results.push({ name: 'Leader Mutations', passed: false, error: error as Error });
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
      if (result.error.stack) {
        console.log(`   Stack: ${result.error.stack.split('\n')[1]?.trim()}`);
      }
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

