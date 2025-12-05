/**
 * Unit Tests for Battle Resolution
 * 
 * Tests for resolveBattle, resolveTwoTraitorsBattle
 */

import { resolveBattle, resolveTwoTraitorsBattle } from '../index.js';
import { CombatTestStatePresets } from './helpers/test-state-builder.js';
import { BattlePlanPresets } from './helpers/battle-plan-builder.js';
import { CombatAssertions } from './helpers/assertions.js';
import { CombatTestUtils } from './helpers/test-utils.js';
import { TEST_CARDS } from './helpers/presets.js';
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

describe('resolveBattle', () => {
  describe('Normal Battle Resolution', () => {
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

    test('should apply Kwisatz Haderach +2 bonus when leader not killed', () => {
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

  describe('Lasgun/Shield Explosion', () => {
    test('should trigger explosion when Lasgun and Shield present', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.withCards(
        Faction.ATREIDES,
        aggressorLeader,
        5,
        TEST_CARDS.WEAPONS.LASGUN,
        null as any
      );
      const defenderPlan = BattlePlanPresets.withCards(
        Faction.HARKONNEN,
        defenderLeader,
        5,
        null as any,
        TEST_CARDS.DEFENSES.SHIELD
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

      CombatAssertions.expectExplosion(result);
    });
  });
});

function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

console.log('Running Battle Resolution Tests...\n');
try {
  describe('resolveBattle', () => {
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
  });
  console.log('\n✓ All tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

