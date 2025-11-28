/**
 * Spice Blow Phase Test Suite
 * 
 * Comprehensive test suite for the spice blow phase.
 * Tests write detailed log files for manual review.
 */

import { testTurn1MultipleWorms } from './scenarios/turn-1-multiple-worms';
import { testMultipleWormsDevouring } from './scenarios/multiple-worms-devouring';
import { testFremenWormImmunity } from './scenarios/fremen-worm-immunity';
import { testFremenAllyProtection } from './scenarios/fremen-ally-protection';
import { testSpiceInStorm } from './scenarios/spice-in-storm';
import { testNexusAllianceNegotiations } from './scenarios/nexus-alliance-negotiations';
import { testComplexMultiFactionDevouring } from './scenarios/complex-multi-faction-devouring';
import { testManualReviewScenario } from './scenarios/manual-review-scenario';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('SPICE BLOW PHASE TEST SUITE');
  console.log('='.repeat(80));
  
  const results = [];

  try {
    results.push(await testTurn1MultipleWorms());
  } catch (error) {
    console.error('❌ Turn 1 Multiple Worms failed:', error);
  }
  
  try {
    results.push(await testMultipleWormsDevouring());
  } catch (error) {
    console.error('❌ Multiple Worms Devouring failed:', error);
  }
  
  try {
    results.push(await testFremenWormImmunity());
  } catch (error) {
    console.error('❌ Fremen Worm Immunity failed:', error);
  }
  
  try {
    results.push(await testFremenAllyProtection());
  } catch (error) {
    console.error('❌ Fremen Ally Protection failed:', error);
  }
  
  try {
    results.push(await testSpiceInStorm());
  } catch (error) {
    console.error('❌ Spice in Storm failed:', error);
  }
  
  try {
    results.push(await testNexusAllianceNegotiations());
  } catch (error) {
    console.error('❌ Nexus Alliance Negotiations failed:', error);
  }
  
  try {
    results.push(await testComplexMultiFactionDevouring());
  } catch (error) {
    console.error('❌ Complex Multi-Faction Devouring failed:', error);
  }
  
  try {
    results.push(await testManualReviewScenario());
  } catch (error) {
    console.error('❌ Manual Review Scenario failed:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests completed. Check test-logs/spice-blow/ for log files.');
  console.log('='.repeat(80));
  
  const completed = results.filter(r => r.completed).length;
  const total = results.length;
  console.log(`\nCompleted: ${completed}/${total} scenarios`);
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

