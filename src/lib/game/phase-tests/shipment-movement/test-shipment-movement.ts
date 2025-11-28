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

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('SHIPMENT & MOVEMENT PHASE TEST SUITE');
  console.log('='.repeat(80));
  
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

