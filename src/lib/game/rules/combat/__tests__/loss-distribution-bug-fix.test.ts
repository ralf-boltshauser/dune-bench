/**
 * Test for Bug Fix: getForceCountForLoss
 * 
 * This test verifies that the critical bug fix works correctly:
 * - Loser loses ALL forces in territory, not just dialed forces
 * - Winner loses only dialed forces
 */

import { resolveBattle } from '../index.js';
import { CombatTestStatePresets } from './helpers/test-state-builder.js';
import { BattlePlanPresets } from './helpers/battle-plan-builder.js';
import { CombatAssertions } from './helpers/assertions.js';
import { CombatTestUtils } from './helpers/test-utils.js';
import { Faction, TerritoryId } from '../../../types/index.js';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

describe('Bug Fix: Loser Loses All Forces', () => {
  test('should make loser lose ALL forces in territory, not just dialed', () => {
    // Setup: Aggressor has 10 forces, Defender has 8 forces
    const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const stateWithMoreForces = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
    
    const aggressorLeader = CombatTestUtils.getAvailableLeader(stateWithMoreForces, Faction.ATREIDES)!;
    const defenderLeader = CombatTestUtils.getAvailableLeader(stateWithMoreForces, Faction.HARKONNEN)!;

    // Aggressor dials 3, Defender dials 1
    const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 3);
    const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 1);

    const result = resolveBattle(
      stateWithMoreForces,
      TerritoryId.ARRAKEEN,
      0,
      Faction.ATREIDES,
      Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan
    );

    // Winner (aggressor) should lose only dialed forces (3)
    CombatAssertions.expectForcesLost(result.aggressorResult, 3);
    
    // Loser (defender) should lose ALL forces in territory (5), not just dialed (1)
    // This is the critical bug fix - previously it would only lose 1
    CombatAssertions.expectForcesLost(result.defenderResult, 5);
  });

  test('should handle case where loser dialed fewer forces than available', () => {
    const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
    const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

    // Defender has 5 forces but only dials 2
    const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 6);
    const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 2);

    const result = resolveBattle(
      state,
      TerritoryId.ARRAKEEN,
      0,
      Faction.ATREIDES,
      Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan
    );

    // Loser should lose ALL 5 forces, not just the 2 dialed
    CombatAssertions.expectForcesLost(result.defenderResult, 5);
  });
});

// Test runner
function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

// Run all tests
console.log('Running Loss Distribution Bug Fix Tests...\n');
try {
  // All tests are already defined above in describe blocks
  console.log('\n✓ All bug fix tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

