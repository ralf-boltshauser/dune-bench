/**
 * Tests for Leader/Cheap Hero Validation
 * 
 * Coverage:
 * - Valid leader usage (pool, on board, same territory)
 * - Invalid leader usage (tanks, captured, wrong territory)
 * - Cheap Hero requirements
 * - NO TREACHERY rule
 */

import { validateBattlePlan } from '../../index.js';
import { CombatTestStateBuilder, CombatTestStatePresets } from '../helpers/test-state-builder.js';
import { BattlePlanBuilder, BattlePlanPresets } from '../helpers/battle-plan-builder.js';
import { CombatAssertions } from '../helpers/assertions.js';
import { CombatTestUtils } from '../helpers/test-utils.js';
import { Faction, TerritoryId, LeaderLocation, TreacheryCardType } from '../../../../types/index.js';
import { TEST_LEADERS, TEST_CARDS } from '../helpers/presets.js';

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

describe('Leader/Cheap Hero Validation', () => {
  describe('Valid Leader Usage', () => {
    test('should accept valid leader from pool', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.minimal(Faction.ATREIDES, leaderId, 3);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should accept leader on board in same territory (DEDICATED LEADER)', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withLeader(Faction.ATREIDES, TEST_LEADERS.ATREIDES.LADY_JESSICA, LeaderLocation.ON_BOARD)
        .build();
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(TEST_LEADERS.ATREIDES.LADY_JESSICA)
        .withForces(3)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should accept Cheap Hero when no leaders available', () => {
      const state = CombatTestStatePresets.noLeadersBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const plan = BattlePlanPresets.withCheapHero(Faction.ATREIDES, 3);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should accept Cheap Hero in lieu of leader (player choice)', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const stateWithCheapHero = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withCard(Faction.ATREIDES, TEST_CARDS.SPECIAL.CHEAP_HERO, TreacheryCardType.SPECIAL)
        .build();
      const plan = BattlePlanPresets.withCheapHero(Faction.ATREIDES, 3);

      const result = validateBattlePlan(stateWithCheapHero, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should accept announcedNoLeader when neither available', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withAllLeadersInTanks(Faction.ATREIDES)
        // No Cheap Hero card added - neither leader nor Cheap Hero available
        .build();
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(3)
        .withNoLeader() // Announces inability
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });
  });

  describe('Invalid Leader Usage', () => {
    test('should reject missing leader/Cheap Hero when available', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(3)
        .build(); // No leader, no Cheap Hero

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'MUST_PLAY_LEADER');
    });

    test('should reject leader not in pool (in tanks)', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withLeader(Faction.ATREIDES, TEST_LEADERS.ATREIDES.LADY_JESSICA, LeaderLocation.TANKS_FACE_UP)
        .build();
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(TEST_LEADERS.ATREIDES.LADY_JESSICA)
        .withForces(3)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'LEADER_NOT_IN_POOL');
    });

    test('should reject Cheap Hero used but not in hand', () => {
      // Setup: No leaders available, but also no Cheap Hero card
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withAllLeadersInTanks(Faction.ATREIDES)
        // No Cheap Hero card added
        .build();
      const plan = BattlePlanPresets.withCheapHero(Faction.ATREIDES, 3);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      // Should fail because Cheap Hero card is not in hand
      CombatAssertions.expectInvalid(result, 'CARD_NOT_IN_HAND');
    });

    test('should reject both leader and Cheap Hero used simultaneously', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withCard(Faction.ATREIDES, TEST_CARDS.SPECIAL.CHEAP_HERO, TreacheryCardType.SPECIAL)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      // Manually create plan with both set (builder prevents this)
      const plan = {
        factionId: Faction.ATREIDES,
        forcesDialed: 3,
        leaderId: leaderId,
        cheapHeroUsed: true, // Both set - should be invalid
        weaponCardId: null,
        defenseCardId: null,
        spiceDialed: 0,
        kwisatzHaderachUsed: false,
        announcedNoLeader: false,
      };

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'MUST_PLAY_LEADER_OR_CHEAP_HERO');
    });

    test('should reject treachery cards without leader/Cheap Hero (NO TREACHERY rule)', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withAllLeadersInTanks(Faction.ATREIDES)
        .withCard(Faction.ATREIDES, TEST_CARDS.WEAPONS.CRYSKNIFE, TreacheryCardType.WEAPON_PROJECTILE)
        .build();
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(3)
        .withNoLeader()
        .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'CANNOT_PLAY_TREACHERY_WITHOUT_LEADER');
    });
  });

  describe('Edge Cases', () => {
    test('should require Cheap Hero when no leaders (mandatory, not optional)', () => {
      const state = CombatTestStatePresets.noLeadersBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(3)
        .withNoLeader()
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'MUST_PLAY_CHEAP_HERO');
    });

    test('should require announcement when neither leader nor Cheap Hero available', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .withAllLeadersInTanks(Faction.ATREIDES)
        // No Cheap Hero card added
        .build();
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(3)
        .build(); // No leader, no Cheap Hero, no announcement

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'MUST_ANNOUNCE_NO_LEADER');
    });
  });
});

// Test runner
function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

// Run all tests
console.log('Running Leader/Cheap Hero Validation Tests...\n');
try {
  // All tests are already defined above in describe blocks
  console.log('\n✓ All leader validation tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

