/**
 * Unit and Integration Test Runner for Bidding Phase
 * 
 * Runs all unit tests and integration tests
 */

import { runHelpersTests } from './unit/helpers.test';
import { runEmperorTests } from './unit/emperor.test';
import { runInitializationTests } from './unit/initialization.test';
import { runAuctionTests } from './unit/auction.test';
import { runBidProcessingTests } from './unit/bid-processing.test';
import { runResolutionTests } from './unit/resolution.test';
import { runNegativeValidationTests } from './unit/negative-validation.test';
import { runAuctionCycleTests } from './integration/auction-cycle.test';
import { runMultipleAuctionsTests } from './integration/multiple-auctions.test';
import { runAtreidesPeekFlowTests } from './integration/atreides-peek-flow.test';
import { runKaramaFlowTests } from './integration/karama-flow.test';
import { runEmperorPaymentFlowTests } from './integration/emperor-payment-flow.test';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('BIDDING PHASE - UNIT & INTEGRATION TESTS');
  console.log('='.repeat(80));
  console.log('');
  
  const results: Array<{ name: string; passed: boolean; error?: Error }> = [];
  
  // Unit Tests
  try {
    runHelpersTests();
    results.push({ name: 'Helpers Module', passed: true });
  } catch (error) {
    results.push({ name: 'Helpers Module', passed: false, error: error as Error });
  }
  
  try {
    runEmperorTests();
    results.push({ name: 'Emperor Module', passed: true });
  } catch (error) {
    results.push({ name: 'Emperor Module', passed: false, error: error as Error });
  }
  
  try {
    runInitializationTests();
    results.push({ name: 'Initialization Module', passed: true });
  } catch (error) {
    results.push({ name: 'Initialization Module', passed: false, error: error as Error });
  }
  
  try {
    runAuctionTests();
    results.push({ name: 'Auction Module', passed: true });
  } catch (error) {
    results.push({ name: 'Auction Module', passed: false, error: error as Error });
  }
  
  try {
    runBidProcessingTests();
    results.push({ name: 'Bid Processing Module', passed: true });
  } catch (error) {
    results.push({ name: 'Bid Processing Module', passed: false, error: error as Error });
  }
  
  try {
    runResolutionTests();
    results.push({ name: 'Resolution Module', passed: true });
  } catch (error) {
    results.push({ name: 'Resolution Module', passed: false, error: error as Error });
  }
  
  try {
    runNegativeValidationTests();
    results.push({ name: 'Negative Validation', passed: true });
  } catch (error) {
    results.push({ name: 'Negative Validation', passed: false, error: error as Error });
  }
  
  // Integration Tests
  try {
    runAuctionCycleTests();
    results.push({ name: 'Auction Cycle Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Auction Cycle Integration', passed: false, error: error as Error });
  }
  
  try {
    runMultipleAuctionsTests();
    results.push({ name: 'Multiple Auctions Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Multiple Auctions Integration', passed: false, error: error as Error });
  }
  
  try {
    runAtreidesPeekFlowTests();
    results.push({ name: 'Atreides Peek Flow Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Atreides Peek Flow Integration', passed: false, error: error as Error });
  }
  
  try {
    runKaramaFlowTests();
    results.push({ name: 'Karama Flow Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Karama Flow Integration', passed: false, error: error as Error });
  }
  
  try {
    runEmperorPaymentFlowTests();
    results.push({ name: 'Emperor Payment Flow Integration', passed: true });
  } catch (error) {
    results.push({ name: 'Emperor Payment Flow Integration', passed: false, error: error as Error });
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.error) {
        console.log(`    Error: ${r.error.message}`);
      }
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

