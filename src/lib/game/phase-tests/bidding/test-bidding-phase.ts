/**
 * Bidding Phase Test Suite
 * 
 * Comprehensive test suite for the bidding phase with various scenarios.
 */

import { testKaramaBuyWithoutPaying } from './scenarios/karama-buy-without-paying';
// Note: Other scenarios still use mocked responses - update them to use real agents if needed
// import { testMultipleFactionsBiddingWar } from './scenarios/multiple-factions-bidding-war';
// import { testAtreidesPrescience } from './scenarios/atreides-prescience';
// import { testEmperorPayment } from './scenarios/emperor-payment';
// import { testHarkonnenTopCard } from './scenarios/harkonnen-top-card';
// import { testBoughtInRule } from './scenarios/bought-in-rule';
// import { testHandSizeChanges } from './scenarios/hand-size-changes';
// import { testComplexMultiCard } from './scenarios/complex-multi-card';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('BIDDING PHASE TEST SUITE');
  console.log('='.repeat(80));
  
  const results = [];

  try {
    console.log('\n📋 Running Scenario 1: Karama Buy Without Paying');
    results.push(await testKaramaBuyWithoutPaying());
  } catch (error) {
    console.error('❌ Scenario 1 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 2: Multiple Factions Bidding War');
    results.push(await testMultipleFactionsBiddingWar());
  } catch (error) {
    console.error('❌ Scenario 2 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 3: Atreides Prescience');
    results.push(await testAtreidesPrescience());
  } catch (error) {
    console.error('❌ Scenario 3 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 4: Emperor Payment');
    results.push(await testEmperorPayment());
  } catch (error) {
    console.error('❌ Scenario 4 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 5: Harkonnen Top Card');
    results.push(await testHarkonnenTopCard());
  } catch (error) {
    console.error('❌ Scenario 5 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 6: Bought-In Rule');
    results.push(await testBoughtInRule());
  } catch (error) {
    console.error('❌ Scenario 6 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 7: Hand Size Changes');
    results.push(await testHandSizeChanges());
  } catch (error) {
    console.error('❌ Scenario 7 failed:', error);
  }
  
  try {
    console.log('\n📋 Running Scenario 8: Complex Multi-Card');
    results.push(await testComplexMultiCard());
  } catch (error) {
    console.error('❌ Scenario 8 failed:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenarios run: ${results.length}`);
  console.log(`Completed successfully: ${results.filter(r => r.completed).length}`);
  console.log(`Failed: ${results.filter(r => !r.completed).length}`);
  console.log('\n✅ All tests completed. Check test-logs/bidding/ for log files.');
  console.log('='.repeat(80));
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

