/**
 * Mentat Pause Phase Test Suite
 * 
 * Comprehensive tests for the Mentat Pause phase covering:
 * - Bribe collection
 * - Solo stronghold victory
 * - Alliance stronghold victory
 * - Contested strongholds
 * - Multiple winners
 * - Special victories (Fremen, Guild, BG)
 * - Endgame default victory
 */

import { testBribeCollection } from './scenarios/bribe-collection';
import {
  testSoloVictory3Strongholds,
  testSoloVictoryExactly2Strongholds,
} from './scenarios/solo-victory';
import {
  testAllianceVictory4Strongholds,
  testAllianceVictoryMixedControl,
} from './scenarios/alliance-victory';
import {
  testContestedStrongholdNoVictory,
  testAllianceVsSoloContested,
} from './scenarios/contested-strongholds';
import { testMultipleWinnersStormOrder } from './scenarios/multiple-winners';
import {
  testFremenSpecialVictory,
  testGuildSpecialVictory,
  testBeneGesseritPrediction,
} from './scenarios/special-victories';
import {
  testEndgameMostStrongholds,
  testEndgameSpiceTiebreaker,
  testEndgameStormOrderTiebreaker,
} from './scenarios/endgame-victory';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('MENTAT PAUSE PHASE TEST SUITE');
  console.log('='.repeat(80));
  console.log('');

  const tests = [
    { name: 'Bribe Collection', fn: testBribeCollection },
    { name: 'Solo Victory - 3 Strongholds', fn: testSoloVictory3Strongholds },
    { name: 'Solo Victory - 2 Strongholds (No Victory)', fn: testSoloVictoryExactly2Strongholds },
    { name: 'Alliance Victory - 4 Strongholds', fn: testAllianceVictory4Strongholds },
    { name: 'Alliance Victory - Mixed Control', fn: testAllianceVictoryMixedControl },
    { name: 'Contested Stronghold - No Victory', fn: testContestedStrongholdNoVictory },
    { name: 'Alliance vs Solo - Contested', fn: testAllianceVsSoloContested },
    { name: 'Multiple Winners - Storm Order', fn: testMultipleWinnersStormOrder },
    { name: 'Fremen Special Victory', fn: testFremenSpecialVictory },
    { name: 'Guild Special Victory', fn: testGuildSpecialVictory },
    { name: 'Bene Gesserit Prediction', fn: testBeneGesseritPrediction },
    { name: 'Endgame - Most Strongholds', fn: testEndgameMostStrongholds },
    { name: 'Endgame - Spice Tiebreaker', fn: testEndgameSpiceTiebreaker },
    { name: 'Endgame - Storm Order Tiebreaker', fn: testEndgameStormOrderTiebreaker },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\nRunning: ${test.name}`);
      await test.fn();
      passed++;
      console.log(`  ✅ ${test.name} - PASS`);
    } catch (error) {
      failed++;
      console.error(`  ❌ ${test.name} - FAIL`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('\n✅ All tests completed. Check test-logs/mentat-pause/ for log files.');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

