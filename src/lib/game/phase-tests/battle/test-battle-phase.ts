/**
 * Battle Phase Test Suite
 * 
 * Main test runner for all battle phase scenarios.
 * 
 * Tests:
 * 1. Stronghold Battle: Atreides vs Bene Gesserit
 * 2. Multi-Faction Battle: Fremen vs Harkonnen vs Emperor
 */

import { Faction } from '../../types';
import { testStrongholdBattle } from './scenarios/stronghold-battle';
import { testMultiFactionBattle } from './scenarios/multi-faction-battle';
import {
  assertBattleResolved,
  assertPrescienceUsed,
  assertVoiceUsed,
  assertWinnerCardDiscardChoice,
  assertLeaderCaptured,
  assertFactionSpice,
  runAssertions,
} from './assertions/battle-assertions';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('BATTLE PHASE TEST SUITE');
  console.log('='.repeat(80));
  console.log('\nRunning all battle phase scenarios...\n');

  const results: Array<{
    name: string;
    result: Awaited<ReturnType<typeof testStrongholdBattle>>;
    assertions: ReturnType<typeof runAssertions>;
  }> = [];

  // ============================================================================
  // Test 1: Stronghold Battle
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const strongholdResult = await testStrongholdBattle();
    
    const strongholdAssertions = runAssertions(strongholdResult, [
      assertBattleResolved(),
      assertPrescienceUsed(),
      assertVoiceUsed(),
      assertWinnerCardDiscardChoice(),
    ]);

    results.push({
      name: 'Stronghold Battle',
      result: strongholdResult,
      assertions: strongholdAssertions,
    });
  } catch (error) {
    console.error('\n✗ Stronghold Battle Test Failed:');
    console.error(error);
    results.push({
      name: 'Stronghold Battle',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
      assertions: { passed: 0, failed: 1, failures: [(error as Error).message] },
    });
  }

  // ============================================================================
  // Test 2: Multi-Faction Battle
  // ============================================================================
  try {
    console.log('\n' + '='.repeat(80));
    const multiFactionResult = await testMultiFactionBattle();
    
    const multiFactionAssertions = runAssertions(multiFactionResult, [
      assertBattleResolved(),
      assertLeaderCaptured(Faction.HARKONNEN, Faction.FREMEN),
      assertLeaderCaptured(Faction.HARKONNEN, Faction.EMPEROR),
      // Harkonnen should have gained spice from killing Emperor's leader
      assertFactionSpice(Faction.HARKONNEN, 25 + 2, 5), // 2 spice from kill, tolerance 5
    ]);

    results.push({
      name: 'Multi-Faction Battle',
      result: multiFactionResult,
      assertions: multiFactionAssertions,
    });
  } catch (error) {
    console.error('\n✗ Multi-Faction Battle Test Failed:');
    console.error(error);
    results.push({
      name: 'Multi-Faction Battle',
      result: {
        state: {} as any,
        events: [],
        stepCount: 0,
        completed: false,
        error: error as Error,
      },
      assertions: { passed: 0, failed: 1, failures: [(error as Error).message] },
    });
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(80));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const test of results) {
    const status = test.result.completed && test.assertions.failed === 0 ? '✓' : '✗';
    console.log(`\n${status} ${test.name}`);
    console.log(`  Steps: ${test.result.stepCount}`);
    console.log(`  Completed: ${test.result.completed ? 'Yes' : 'No'}`);
    console.log(`  Assertions: ${test.assertions.passed} passed, ${test.assertions.failed} failed`);
    
    if (test.assertions.failures.length > 0) {
      console.log(`  Failures:`);
      test.assertions.failures.forEach(f => console.log(`    - ${f}`));
    }

    if (test.result.error) {
      console.log(`  Error: ${test.result.error.message}`);
    }

    totalPassed += test.assertions.passed;
    totalFailed += test.assertions.failed;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${totalPassed} assertions passed, ${totalFailed} failed`);
  console.log('='.repeat(80));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };

