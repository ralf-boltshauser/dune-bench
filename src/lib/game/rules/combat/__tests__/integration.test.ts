/**
 * Integration Tests for Combat Rules
 * 
 * Tests for multi-module interactions and complete battle scenarios
 */

import { validateBattlePlan, resolveBattle } from '../index.js';
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

function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

console.log('Running Integration Tests...\n');
try {
  describe('Complete Battle Scenarios', () => {
    test('should handle complete normal battle flow', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;
      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 3);
      
      const aggressorValidation = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, aggressorPlan);
      CombatAssertions.expectValid(aggressorValidation);
      
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

    test('should handle battle with spice dialing', () => {
      const state = CombatTestStatePresets.advancedBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;

      const aggressorPlan = BattlePlanPresets.withSpice(Faction.ATREIDES, aggressorLeader, 5, 3);
      const defenderPlan = BattlePlanPresets.withSpice(Faction.HARKONNEN, defenderLeader, 5, 2);

      const aggressorValidation = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, aggressorPlan);
      CombatAssertions.expectValid(aggressorValidation);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan
      );

      if (!result.winner) {
        throw new Error('Expected battle to have a winner');
      }
    });
  });
  console.log('\n✓ All integration tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}
