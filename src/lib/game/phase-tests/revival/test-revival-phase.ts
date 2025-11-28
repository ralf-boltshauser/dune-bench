/**
 * Revival Phase Test Suite
 * 
 * Comprehensive test suite for the revival phase with all scenarios.
 */

import { testBasicForceRevival } from './scenarios/basic-force-revival';
import { testFremenFedaykinRevival } from './scenarios/fremen-fedaykin-revival';
import {
  testFremenAllianceBoost,
  testFremenAllianceBoostDenied,
} from './scenarios/fremen-alliance-boost';
import { testEmperorAllyRevival } from './scenarios/emperor-ally-revival';
import {
  testLeaderRevival,
  testLeaderRevivalCannotRevive,
} from './scenarios/leader-revival';
import {
  testKwisatzHaderachRevival,
  testKwisatzHaderachCannotRevive,
} from './scenarios/kwisatz-haderach-revival';
import {
  testTleilaxuGholaForceRevival,
  testTleilaxuGholaLeaderRevival,
} from './scenarios/tleilaxu-ghola';
import {
  testComplexMultiFactionRevival,
  testInsufficientSpiceRevival,
} from './scenarios/complex-multi-faction';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('REVIVAL PHASE TEST SUITE');
  console.log('='.repeat(80));
  console.log('');

  try {
    await testBasicForceRevival();
  } catch (error) {
    console.error('Basic Force Revival failed:', error);
  }

  try {
    await testFremenFedaykinRevival();
  } catch (error) {
    console.error('Fremen Fedaykin Revival failed:', error);
  }

  try {
    await testFremenAllianceBoost();
  } catch (error) {
    console.error('Fremen Alliance Boost failed:', error);
  }

  try {
    await testFremenAllianceBoostDenied();
  } catch (error) {
    console.error('Fremen Alliance Boost Denied failed:', error);
  }

  try {
    await testEmperorAllyRevival();
  } catch (error) {
    console.error('Emperor Ally Revival failed:', error);
  }

  try {
    await testLeaderRevival();
  } catch (error) {
    console.error('Leader Revival failed:', error);
  }

  try {
    await testLeaderRevivalCannotRevive();
  } catch (error) {
    console.error('Leader Revival Cannot Revive failed:', error);
  }

  try {
    await testKwisatzHaderachRevival();
  } catch (error) {
    console.error('Kwisatz Haderach Revival failed:', error);
  }

  try {
    await testKwisatzHaderachCannotRevive();
  } catch (error) {
    console.error('Kwisatz Haderach Cannot Revive failed:', error);
  }

  try {
    await testTleilaxuGholaForceRevival();
  } catch (error) {
    console.error('Tleilaxu Ghola Force Revival failed:', error);
  }

  try {
    await testTleilaxuGholaLeaderRevival();
  } catch (error) {
    console.error('Tleilaxu Ghola Leader Revival failed:', error);
  }

  try {
    await testComplexMultiFactionRevival();
  } catch (error) {
    console.error('Complex Multi-Faction Revival failed:', error);
  }

  try {
    await testInsufficientSpiceRevival();
  } catch (error) {
    console.error('Insufficient Spice Revival failed:', error);
  }

  console.log('\n✅ All tests completed. Check test-logs/revival/ for log files.');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

