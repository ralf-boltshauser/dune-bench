/**
 * Shipment & Movement Phase Test Suite
 * 
 * Comprehensive test suite for the shipment-movement phase with various scenarios.
 */

import { testHajrExtraMovement } from './scenarios/hajr-extra-movement';
import { testFremenAbilities } from './scenarios/fremen-abilities';
import { testGuildOutOfOrder } from './scenarios/guild-out-of-order';
import { testGuildCrossShip } from './scenarios/guild-cross-ship';
import { testBGSpiritualAdvisors } from './scenarios/bg-spiritual-advisors';
import { testOrnithopterAccess } from './scenarios/ornithopter-access';
import { testComplexMultiFaction } from './scenarios/complex-multi-faction';
import { runAllCoreSequentialTests } from './scenarios/core-sequential';
import { runAllGuildHandlingTests } from './scenarios/guild-handling';
import { runAllBGIntrusionTests } from './scenarios/bg-intrusion';
import { runAllBGWartimeTests } from './scenarios/bg-wartime';
import { runAllBGTakeUpArmsTests } from './scenarios/bg-take-up-arms';
import { runAllAllianceConstraintTests } from './scenarios/alliance-constraints';
import { runAllNegativeTests } from './scenarios/negative-tests';
import { runAllEdgeCaseTests } from './scenarios/edge-cases';
import { runAllUnitTests } from './unit';
import { runAllIntegrationTests } from './integration/complex-flows.test';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('SHIPMENT & MOVEMENT PHASE TEST SUITE');
  console.log('='.repeat(80));
  
  // Core Sequential Processing Tests
  try {
    await runAllCoreSequentialTests();
  } catch (error) {
    console.error('Core Sequential tests failed:', error);
  }
  
  // Guild Handling Tests
  try {
    await runAllGuildHandlingTests();
  } catch (error) {
    console.error('Guild Handling tests failed:', error);
  }
  
  // BG INTRUSION Tests
  try {
    await runAllBGIntrusionTests();
  } catch (error) {
    console.error('BG INTRUSION tests failed:', error);
  }
  
  // BG WARTIME Tests
  try {
    await runAllBGWartimeTests();
  } catch (error) {
    console.error('BG WARTIME tests failed:', error);
  }
  
  // BG TAKE UP ARMS Tests
  try {
    await runAllBGTakeUpArmsTests();
  } catch (error) {
    console.error('BG TAKE UP ARMS tests failed:', error);
  }
  
  // Alliance Constraint Tests
  try {
    await runAllAllianceConstraintTests();
  } catch (error) {
    console.error('Alliance Constraint tests failed:', error);
  }
  
  // Negative Test Cases
  try {
    await runAllNegativeTests();
  } catch (error) {
    console.error('Negative Test Cases failed:', error);
  }
  
  // Edge Case Tests
  try {
    await runAllEdgeCaseTests();
  } catch (error) {
    console.error('Edge Case Tests failed:', error);
  }
  
  // Unit Tests
  try {
    await runAllUnitTests();
  } catch (error) {
    console.error('Unit Tests failed:', error);
  }
  
  // Integration Tests
  try {
    await runAllIntegrationTests();
  } catch (error) {
    console.error('Integration Tests failed:', error);
  }
  
  // Existing scenario tests
  try {
    await testHajrExtraMovement();
  } catch (error) {
    console.error('HAJR Extra Movement test failed:', error);
  }
  
  try {
    await testFremenAbilities();
  } catch (error) {
    console.error('Fremen Abilities test failed:', error);
  }
  
  try {
    await testGuildOutOfOrder();
  } catch (error) {
    console.error('Guild Out of Order test failed:', error);
  }
  
  try {
    await testGuildCrossShip();
  } catch (error) {
    console.error('Guild Cross-Ship test failed:', error);
  }
  
  try {
    await testBGSpiritualAdvisors();
  } catch (error) {
    console.error('BG Spiritual Advisors test failed:', error);
  }
  
  try {
    await testOrnithopterAccess();
  } catch (error) {
    console.error('Ornithopter Access test failed:', error);
  }
  
  try {
    await testComplexMultiFaction();
  } catch (error) {
    console.error('Complex Multi-Faction test failed:', error);
  }
  
  console.log('\n✅ All tests completed. Check test-logs/shipment-movement/ for log files.');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

