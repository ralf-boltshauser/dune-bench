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
// Edge case tests
import { testEdgeCaseOnlyTwoFactions } from './scenarios/edge-case-only-two-factions';
import { testEdgeCaseDuplicateDialers } from './scenarios/edge-case-duplicate-dialers';
import { testEdgeCaseSingleDial } from './scenarios/edge-case-single-dial';
import { testEdgeCaseEmptyResponses } from './scenarios/edge-case-empty-responses';
import { testEdgeCaseTurn1SingleFaction } from './scenarios/edge-case-turn1-single-faction';
import { testEdgeCaseAllClustered } from './scenarios/edge-case-all-clustered';
import { testEdgeCaseSameSide } from './scenarios/edge-case-same-side';
import { testEdgeCaseInvalidMovement } from './scenarios/edge-case-invalid-movement';

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
  
  console.log('\n' + '='.repeat(80));
  console.log('EDGE CASE TESTS');
  console.log('='.repeat(80));
  
  try {
    await testEdgeCaseOnlyTwoFactions();
  } catch (error) {
    console.error('Edge Case: Only 2 Factions failed:', error);
  }
  
  try {
    await testEdgeCaseDuplicateDialers();
  } catch (error) {
    console.error('Edge Case: Duplicate Dialers failed:', error);
  }
  
  try {
    await testEdgeCaseSingleDial();
  } catch (error) {
    console.error('Edge Case: Single Dial failed:', error);
  }
  
  try {
    await testEdgeCaseEmptyResponses();
  } catch (error) {
    console.error('Edge Case: Empty Responses failed:', error);
  }
  
  try {
    await testEdgeCaseTurn1SingleFaction();
  } catch (error) {
    console.error('Edge Case: Turn 1 Single Faction failed:', error);
  }
  
  try {
    await testEdgeCaseAllClustered();
  } catch (error) {
    console.error('Edge Case: All Clustered failed:', error);
  }
  
  try {
    await testEdgeCaseSameSide();
  } catch (error) {
    console.error('Edge Case: Same Side failed:', error);
  }
  
  try {
    await testEdgeCaseInvalidMovement();
  } catch (error) {
    console.error('Edge Case: Invalid Movement failed:', error);
  }
  
  console.log('\n✅ All tests completed. Check test-logs/storm/ for log files.');
  console.log('📝 Review logs manually to validate correctness of storm phase implementation.');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

