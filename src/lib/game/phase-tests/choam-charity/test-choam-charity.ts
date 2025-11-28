/**
 * CHOAM Charity Phase Test Suite
 * 
 * Main test runner for all CHOAM Charity phase scenarios.
 * 
 * Tests:
 * 1. Standard Charity - Zero Spice
 * 2. Standard Charity - One Spice
 * 3. Bene Gesserit Advanced - High Spice
 * 4. Bene Gesserit Advanced - One Spice
 * 5. Bene Gesserit Basic Rules
 * 6. Multiple Factions Simultaneous
 * 7. Mixed Claim and Decline
 * 8. Fraud Safeguards
 * 9. No Eligible Factions
 * 10. Complex Mixed Scenario
 */

import { testStandardZeroSpice } from './scenarios/standard-zero-spice';
import { testStandardOneSpice } from './scenarios/standard-one-spice';
import { testBGAdvancedHighSpice } from './scenarios/bg-advanced-high-spice';
import { testBGAdvancedOneSpice } from './scenarios/bg-advanced-one-spice';
import { testBGBasicRules } from './scenarios/bg-basic-rules';
import { testMultipleFactions } from './scenarios/multiple-factions';
import { testMixedClaimDecline } from './scenarios/mixed-claim-decline';
import { testFraudSafeguards } from './scenarios/fraud-safeguards';
import { testNoEligibleFactions } from './scenarios/no-eligible-factions';
import { testComplexMixed } from './scenarios/complex-mixed';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('CHOAM CHARITY PHASE TEST SUITE');
  console.log('='.repeat(80));
  console.log('\nRunning all CHOAM Charity phase scenarios...\n');

  const results: Array<{
    name: string;
    result: Awaited<ReturnType<typeof testStandardZeroSpice>>;
  }> = [];

  // ============================================================================
  // Test 1: Standard Charity - Zero Spice
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testStandardZeroSpice();
    results.push({ name: 'Standard Charity - Zero Spice', result });
  } catch (error) {
    console.error('\n✗ Standard Charity - Zero Spice Test Failed:');
    console.error(error);
    results.push({
      name: 'Standard Charity - Zero Spice',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 2: Standard Charity - One Spice
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testStandardOneSpice();
    results.push({ name: 'Standard Charity - One Spice', result });
  } catch (error) {
    console.error('\n✗ Standard Charity - One Spice Test Failed:');
    console.error(error);
    results.push({
      name: 'Standard Charity - One Spice',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 3: Bene Gesserit Advanced - High Spice
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testBGAdvancedHighSpice();
    results.push({ name: 'BG Advanced - High Spice', result });
  } catch (error) {
    console.error('\n✗ BG Advanced - High Spice Test Failed:');
    console.error(error);
    results.push({
      name: 'BG Advanced - High Spice',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 4: Bene Gesserit Advanced - One Spice
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testBGAdvancedOneSpice();
    results.push({ name: 'BG Advanced - One Spice', result });
  } catch (error) {
    console.error('\n✗ BG Advanced - One Spice Test Failed:');
    console.error(error);
    results.push({
      name: 'BG Advanced - One Spice',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 5: Bene Gesserit Basic Rules
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testBGBasicRules();
    results.push({ name: 'BG Basic Rules', result });
  } catch (error) {
    console.error('\n✗ BG Basic Rules Test Failed:');
    console.error(error);
    results.push({
      name: 'BG Basic Rules',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 6: Multiple Factions Simultaneous
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testMultipleFactions();
    results.push({ name: 'Multiple Factions Simultaneous', result });
  } catch (error) {
    console.error('\n✗ Multiple Factions Simultaneous Test Failed:');
    console.error(error);
    results.push({
      name: 'Multiple Factions Simultaneous',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 7: Mixed Claim and Decline
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testMixedClaimDecline();
    results.push({ name: 'Mixed Claim and Decline', result });
  } catch (error) {
    console.error('\n✗ Mixed Claim and Decline Test Failed:');
    console.error(error);
    results.push({
      name: 'Mixed Claim and Decline',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 8: Fraud Safeguards
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testFraudSafeguards();
    results.push({ name: 'Fraud Safeguards', result });
  } catch (error) {
    console.error('\n✗ Fraud Safeguards Test Failed:');
    console.error(error);
    results.push({
      name: 'Fraud Safeguards',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 9: No Eligible Factions
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testNoEligibleFactions();
    results.push({ name: 'No Eligible Factions', result });
  } catch (error) {
    console.error('\n✗ No Eligible Factions Test Failed:');
    console.error(error);
    results.push({
      name: 'No Eligible Factions',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Test 10: Complex Mixed Scenario
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const result = await testComplexMixed();
    results.push({ name: 'Complex Mixed Scenario', result });
  } catch (error) {
    console.error('\n✗ Complex Mixed Scenario Test Failed:');
    console.error(error);
    results.push({
      name: 'Complex Mixed Scenario',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
    });
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(80));

  let totalCompleted = 0;
  let totalFailed = 0;

  for (const test of results) {
    const status = test.result.completed ? '✓' : '✗';
    console.log(`\n${status} ${test.name}`);
    console.log(`  Steps: ${test.result.stepCount}`);
    console.log(`  Completed: ${test.result.completed ? 'Yes' : 'No'}`);
    console.log(`  Events: ${test.result.events.length}`);
    
    if (test.result.error) {
      console.log(`  Error: ${test.result.error.message}`);
      totalFailed++;
    } else if (test.result.completed) {
      totalCompleted++;
    } else {
      totalFailed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${totalCompleted} completed, ${totalFailed} failed`);
  console.log('='.repeat(80));
  console.log('\n✅ All tests completed. Check test-logs/choam-charity/ for log files.');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };

