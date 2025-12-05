/**
 * Tests for Forces Validation
 * 
 * Coverage:
 * - Valid forces dialed (0 to max available)
 * - Invalid forces (negative, exceeds available)
 * - Edge cases (multi-sector, Bene Gesserit advisors)
 */

import { validateBattlePlan } from '../../index.js';
import { CombatTestStateBuilder, CombatTestStatePresets } from '../helpers/test-state-builder.js';
import { BattlePlanBuilder, BattlePlanPresets } from '../helpers/battle-plan-builder.js';
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

describe('Forces Validation', () => {
  describe('Valid Forces', () => {
    test('should accept valid forces dialed', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.minimal(Faction.ATREIDES, leaderId, 3);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should accept forces dialed = 0', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(0)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should accept forces dialed = max available forces', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 10)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(10) // All available
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });
  });

  describe('Invalid Forces', () => {
    test('should reject forces dialed < 0', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(-1)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'FORCES_DIALED_EXCEEDS_AVAILABLE');
    });

    test('should reject forces dialed > available forces', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(100) // More than available
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'FORCES_DIALED_EXCEEDS_AVAILABLE');
    });
  });

  describe('Edge Cases', () => {
    test('should handle multi-sector territory force counting (when no sector specified, counts first sector)', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 3)
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      // Note: When no sector is provided, getForceCountInTerritory only counts first stack found (sector 0 = 3 forces)
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(3) // Only sector 0 forces (first stack found)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should validate sector-specific forces when sector provided', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 3)
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(2) // Valid for sector 1
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan, 1);

      CombatAssertions.expectValid(result);
    });

    test('should reject forces exceeding sector-specific count', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 3)
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 1, 2)
        .withForces(Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(5) // Exceeds sector 1 count (2)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan, 1);

      CombatAssertions.expectInvalid(result, 'FORCES_DIALED_EXCEEDS_AVAILABLE');
    });
  });
});

// Test runner
function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

// Run all tests
console.log('Running Forces Validation Tests...\n');
try {
  // All tests are already defined above in describe blocks
  console.log('\n✓ All forces validation tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

