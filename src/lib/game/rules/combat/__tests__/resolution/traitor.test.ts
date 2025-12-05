/**
 * Tests for Traitor Battle Resolution
 * 
 * Coverage:
 * - Traitor called by aggressor
 * - Traitor called by defender
 * - Winner loses nothing
 * - Loser loses all forces
 * - Spice payout
 * - Card handling
 */

import { resolveBattle } from '../../index.js';
import { CombatTestStatePresets } from '../helpers/test-state-builder.js';
import { BattlePlanPresets } from '../helpers/battle-plan-builder.js';
import { CombatAssertions } from '../helpers/assertions.js';
import { CombatTestUtils } from '../helpers/test-utils.js';
import { Faction, TerritoryId, TreacheryCardType } from '../../../../types/index.js';
import { TEST_LEADERS } from '../helpers/presets.js';
import { CombatTestStateBuilder } from '../helpers/test-state-builder.js';

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

describe('Traitor Battle Resolution', () => {
  describe('Traitor Called by Aggressor', () => {
    test('should make aggressor win when traitor called', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = TEST_LEADERS.HARKONNEN.FEYD_RAUTHA;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 10);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan,
        Faction.ATREIDES, // Traitor called by aggressor
        defenderLeader
      );

      CombatAssertions.expectWinner(result, Faction.ATREIDES);
      CombatAssertions.expectTraitor(result, Faction.ATREIDES);
    });

    test('should make winner lose nothing', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = TEST_LEADERS.HARKONNEN.FEYD_RAUTHA;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 10);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan,
        Faction.ATREIDES,
        defenderLeader
      );

      CombatAssertions.expectForcesLost(result.aggressorResult, 0); // Winner loses nothing
    });

    test('should make loser lose all forces', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = TEST_LEADERS.HARKONNEN.FEYD_RAUTHA;

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 10);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan,
        Faction.ATREIDES,
        defenderLeader
      );

      CombatAssertions.expectForcesLost(result.defenderResult, 5); // Loser loses ALL forces
    });

    test('should pay spice for traitor leader strength', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = TEST_LEADERS.HARKONNEN.FEYD_RAUTHA;
      const traitorStrength = CombatTestUtils.getLeaderStrength(defenderLeader);

      const aggressorPlan = BattlePlanPresets.minimal(Faction.ATREIDES, aggressorLeader, 5);
      const defenderPlan = BattlePlanPresets.minimal(Faction.HARKONNEN, defenderLeader, 10);

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan,
        Faction.ATREIDES,
        defenderLeader
      );

      CombatAssertions.expectSpicePayouts(result, [
        { faction: Faction.ATREIDES, amount: traitorStrength }
      ]);
    });
  });

  describe('Traitor Called by Defender', () => {
    test('should make defender win when traitor called', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = TEST_LEADERS.ATREIDES.LADY_JESSICA;
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
        defenderPlan,
        Faction.HARKONNEN, // Traitor called by defender
        aggressorLeader
      );

      CombatAssertions.expectWinner(result, Faction.HARKONNEN);
      CombatAssertions.expectTraitor(result, Faction.HARKONNEN);
    });
  });

  describe('Edge Cases', () => {
    test('should work even with lasgun/shield present', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const aggressorLeader = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const defenderLeader = TEST_LEADERS.HARKONNEN.FEYD_RAUTHA;

      const aggressorPlan = BattlePlanPresets.withCards(
        Faction.ATREIDES,
        aggressorLeader,
        5,
        'lasgun',
        null as any
      );
      const defenderPlan = BattlePlanPresets.withCards(
        Faction.HARKONNEN,
        defenderLeader,
        10,
        null as any,
        'shield_1'
      );

      const result = resolveBattle(
        state,
        TerritoryId.ARRAKEEN,
        0,
        Faction.ATREIDES,
        Faction.HARKONNEN,
        aggressorPlan,
        defenderPlan,
        Faction.ATREIDES, // Traitor overrides explosion
        defenderLeader
      );

      // Traitor should override explosion
      CombatAssertions.expectWinner(result, Faction.ATREIDES);
      if (result.lasgunjShieldExplosion) {
        throw new Error('Expected traitor to override explosion');
      }
    });
  });
});

// Test runner
function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

// Run all tests
console.log('Running Traitor Battle Resolution Tests...\n');
try {
  // All tests are already defined above in describe blocks
  console.log('\n✓ All traitor battle resolution tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

