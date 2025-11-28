/**
 * Storm Phase Test Suite
 * 
 * Comprehensive test suite for the storm phase.
 * Tests write detailed log files for manual review.
 */

import { testTurn1InitialPlacement } from './scenarios/turn1-initial-placement';
import { testStandardMovementDestruction } from './scenarios/standard-movement-destruction';
import { testWeatherControl } from './scenarios/weather-control';
import { testFremenHalfLosses } from './scenarios/fremen-half-losses';
import { testProtectedTerritories } from './scenarios/protected-territories';
import { testComplexMultiFaction } from './scenarios/complex-multi-faction';
import { testSpiceDestructionRules } from './scenarios/spice-destruction-rules';
import { testStormWrapsAround } from './scenarios/storm-wraps-around';
import { testMinimalMaximumMovement } from './scenarios/minimal-maximum-movement';
import { testMultiSectorTerritory } from './scenarios/multi-sector-territory';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('STORM PHASE TEST SUITE');
  console.log('='.repeat(80));
  
  try {
    await testTurn1InitialPlacement();
  } catch (error) {
    console.error('Turn 1 Initial Placement failed:', error);
  }
  
  try {
    await testStandardMovementDestruction();
  } catch (error) {
    console.error('Standard Movement Destruction failed:', error);
  }
  
  try {
    await testWeatherControl();
  } catch (error) {
    console.error('Weather Control failed:', error);
  }
  
  try {
    await testFremenHalfLosses();
  } catch (error) {
    console.error('Fremen Half Losses failed:', error);
  }
  
  try {
    await testProtectedTerritories();
  } catch (error) {
    console.error('Protected Territories failed:', error);
  }
  
  try {
    await testComplexMultiFaction();
  } catch (error) {
    console.error('Complex Multi-Faction failed:', error);
  }
  
  try {
    await testSpiceDestructionRules();
  } catch (error) {
    console.error('Spice Destruction Rules failed:', error);
  }
  
  try {
    await testStormWrapsAround();
  } catch (error) {
    console.error('Storm Wraps Around failed:', error);
  }
  
  try {
    await testMinimalMaximumMovement();
  } catch (error) {
    console.error('Minimal Maximum Movement failed:', error);
  }
  
  try {
    await testMultiSectorTerritory();
  } catch (error) {
    console.error('Multi-Sector Territory failed:', error);
  }
  
  console.log('\n✅ All tests completed. Check test-logs/storm/ for log files.');
  console.log('📝 Review logs manually to validate correctness of storm phase implementation.');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

