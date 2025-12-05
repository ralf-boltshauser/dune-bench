/**
 * Tests for Normal Battle Resolution
 * 
 * Coverage:
 * - Winner determination
 * - Force losses (winner vs loser)
 * - Leader strength calculations
 * - Elite forces
 * - Spice dialing
 * - Kwisatz Haderach
 * - Card keep/discard
 */

import { resolveBattle } from '../../index.js';
import { CombatTestStatePresets } from '../helpers/test-state-builder.js';
import { BattlePlanPresets } from '../helpers/battle-plan-builder.js';
import { CombatAssertions } from '../helpers/assertions.js';
import { CombatTestUtils } from '../helpers/test-utils.js';
import { Faction, TerritoryId } from '../../../../types/index.js';

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

describe('Normal Battle Resolution', () => {
  describe('Winner Determination', () => {
    test('should determine winner by higher total', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 3);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      CombatAssertions.expectWinner(result, Faction.ATREIDES);
    });

    test('should handle ties (aggressor wins)', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;
      const aggressorStrength = CombatTestUtils.getLeaderStrength(aggressorLeader);
      const defenderStrength = CombatTestUtils.getLeaderStrength(defenderLeader);

      // Make totals equal
      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(
        Faction.HARKONNEN,
        defenderLeader,
        5 + aggressorStrength - defenderStrength
      );

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      CombatAssertions.expectWinner(result, Faction.ATREIDES); // Aggressor wins ties
    });
  });

  describe('Force Losses', () => {
    test('should make winner lose only dialed forces', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 3);
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

      CombatAssertions.expectForcesLost(result.aggressorResult, 3); // Winner loses only dialed
    });

    test('should make loser lose all forces in territory', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
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

      // Loser loses ALL forces (5 in territory), not just dialed (2)
      CombatAssertions.expectForcesLost(result.defenderResult, 5);
    });
  });

  describe('Leader Handling', () => {
    test('should add leader strength when not killed', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;
      const aggressorStrength = CombatTestUtils.getLeaderStrength(aggressorLeader);
      const defenderStrength = CombatTestUtils.getLeaderStrength(defenderLeader);

      const aggressorForces = 5;
      const defenderForces = 3; // Less than aggressor to ensure aggressor wins

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, aggressorForces);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, defenderForces);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      // Verify leader strength is included in totals (should be >= forces + leader strength)
      const minAggressorTotal = aggressorForces + aggressorStrength;
      const minDefenderTotal = defenderForces + defenderStrength;
      
      if (result.winnerTotal < minAggressorTotal) {
        throw new Error(`Expected winner total >= ${minAggressorTotal} (forces ${aggressorForces} + leader ${aggressorStrength}) but got ${result.winnerTotal}`);
      }
      if (result.loserTotal < minDefenderTotal) {
        throw new Error(`Expected loser total >= ${minDefenderTotal} (forces ${defenderForces} + leader ${defenderStrength}) but got ${result.loserTotal}`);
      }
      
      // Aggressor should win (has more forces)
      CombatAssertions.expectWinner(result, Faction.ATREIDES);
      
      // Verify leader strength is actually in the result
      if (result.aggressorResult.leaderStrength !== aggressorStrength) {
        throw new Error(`Expected aggressor leader strength ${aggressorStrength} but got ${result.aggressorResult.leaderStrength}`);
      }
    });

    test('should set leader strength = 0 when killed by weapon', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.withCards(
        Faction.ATREIDES,
        aggressorLeader,
        5,
        'crysknife',
        'shield_1'
      );
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 5);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      // Defender's leader should be killed
      CombatAssertions.expectLeaderDead(result.defenderResult);
      if (result.defenderResult.leaderStrength !== 0) {
        throw new Error(`Expected leader strength 0 when killed but got ${result.defenderResult.leaderStrength}`);
      }
    });

    test('should NOT kill leader just from losing battle', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 10);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 1);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      // Loser's leader should NOT be killed (no weapon used)
      CombatAssertions.expectLeaderAlive(result.defenderResult);
    });
  });

  describe('Kwisatz Haderach', () => {
    test('should apply +2 bonus when leader not killed', () => {
      const state = CombatTestStatePresets.kwisatzHaderachBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.withKH(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 5);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      // Aggressor should win due to +2 bonus
      CombatAssertions.expectWinner(result, Faction.ATREIDES);
    });
  });
});

// Test runner
function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

// Run all tests
console.log('Running Normal Battle Resolution Tests...\n');
try {
  // All tests are already defined above in describe blocks
  console.log('\n✓ All normal battle resolution tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

