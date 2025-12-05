/**
 * Unit Tests for Strength Calculations
 * 
 * Tests for getLeaderStrength, calculateForcesDialedStrength, calculateSpicedForceStrength
 */

import { getLeaderStrength, calculateForcesDialedStrength, calculateSpicedForceStrength } from '../strength-calculation.js';
import { CombatTestStatePresets } from './helpers/test-state-builder.js';
import { BattlePlanPresets } from './helpers/battle-plan-builder.js';
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

describe('getLeaderStrength', () => {
  test('should return leader strength from plan', () => {
    const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
    const plan = BattlePlanPresets.minimal(Faction.ATREIDES, leaderId, 1);

    const strength = getLeaderStrength(plan);
    const expectedStrength = CombatTestUtils.getLeaderStrength(leaderId);

    if (strength !== expectedStrength) {
      throw new Error(`Expected strength ${expectedStrength} but got ${strength}`);
    }
  });

  test('should return 0 for Cheap Hero', () => {
    const plan = BattlePlanPresets.withCheapHero(Faction.ATREIDES, 1);

    const strength = getLeaderStrength(plan);

    if (strength !== 0) {
      throw new Error(`Expected strength 0 for Cheap Hero but got ${strength}`);
    }
  });

  test('should return 0 when no leader', () => {
    const plan = BattlePlanPresets.minimal(Faction.ATREIDES, 'nonexistent', 1);
    plan.leaderId = null;

    const strength = getLeaderStrength(plan);

    if (strength !== 0) {
      throw new Error(`Expected strength 0 when no leader but got ${strength}`);
    }
  });
});

describe('calculateForcesDialedStrength', () => {
  test('should return 1x for regular forces', () => {
    const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);

    const strength = calculateForcesDialedStrength(
      state,
      Faction.ATREIDES,
      TerritoryId.ARRAKEEN,
      0,
      5, // 5 regular forces
      Faction.HARKONNEN
    );

    if (strength !== 5) {
      throw new Error(`Expected strength 5 for 5 regular forces but got ${strength}`);
    }
  });

  test('should return 2x for elite forces (Sardaukar)', () => {
    const state = CombatTestStatePresets.eliteForcesBattle(Faction.EMPEROR, Faction.HARKONNEN);

    const strength = calculateForcesDialedStrength(
      state,
      Faction.EMPEROR,
      TerritoryId.ARRAKEEN,
      0,
      5, // 5 elite forces
      Faction.HARKONNEN
    );

    if (strength !== 10) {
      throw new Error(`Expected strength 10 for 5 elite forces (2x) but got ${strength}`);
    }
  });

  test('should return 1x for Sardaukar vs Fremen', () => {
    const state = CombatTestStatePresets.eliteForcesBattle(Faction.EMPEROR, Faction.FREMEN);

    const strength = calculateForcesDialedStrength(
      state,
      Faction.EMPEROR,
      TerritoryId.ARRAKEEN,
      0,
      5, // 5 elite forces
      Faction.FREMEN // Special case: 1x instead of 2x
    );

    if (strength !== 5) {
      throw new Error(`Expected strength 5 for Sardaukar vs Fremen (1x) but got ${strength}`);
    }
  });
});

describe('calculateSpicedForceStrength', () => {
  test('should return full strength in basic rules', () => {
    const strength = calculateSpicedForceStrength(
      Faction.ATREIDES,
      10, // base strength
      10, // forces dialed
      0,  // spice dialed (ignored in basic rules)
      false // basic rules
    );

    if (strength !== 10) {
      throw new Error(`Expected strength 10 in basic rules but got ${strength}`);
    }
  });

  test('should return full strength for spiced forces in advanced rules', () => {
    const strength = calculateSpicedForceStrength(
      Faction.ATREIDES,
      10, // base strength
      10, // forces dialed
      10, // spice dialed (all spiced)
      true // advanced rules
    );

    if (strength !== 10) {
      throw new Error(`Expected strength 10 for fully spiced forces but got ${strength}`);
    }
  });

  test('should return half strength for unspiced forces in advanced rules', () => {
    const strength = calculateSpicedForceStrength(
      Faction.ATREIDES,
      10, // base strength
      10, // forces dialed
      0,  // no spice dialed
      true // advanced rules
    );

    if (strength !== 5) {
      throw new Error(`Expected strength 5 (half) for unspiced forces but got ${strength}`);
    }
  });

  test('should return mixed strength for partially spiced forces', () => {
    const strength = calculateSpicedForceStrength(
      Faction.ATREIDES,
      10, // base strength
      10, // forces dialed
      6,  // 6 spiced, 4 unspiced
      true // advanced rules
    );

    // 6 spiced (1.0x) + 4 unspiced (0.5x) = 6 + 2 = 8
    const expected = 10 * 0.6 + 10 * 0.4 * 0.5; // 6 + 2 = 8
    if (Math.abs(strength - expected) > 0.01) {
      throw new Error(`Expected strength ~${expected} for mixed spiced forces but got ${strength}`);
    }
  });

  test('should return full strength for Fremen (BATTLE HARDENED)', () => {
    const strength = calculateSpicedForceStrength(
      Faction.FREMEN,
      10, // base strength
      10, // forces dialed
      0,  // no spice dialed
      true // advanced rules
    );

    if (strength !== 10) {
      throw new Error(`Expected strength 10 for Fremen (BATTLE HARDENED) but got ${strength}`);
    }
  });

  test('should handle spice dialed > forces dialed (capped)', () => {
    const strength = calculateSpicedForceStrength(
      Faction.ATREIDES,
      10, // base strength
      5,  // forces dialed
      10, // spice dialed (more than forces, should be capped)
      true // advanced rules
    );

    // Should be treated as all spiced (5 forces, 5 spice)
    if (strength !== 10) {
      throw new Error(`Expected strength 10 (all spiced) but got ${strength}`);
    }
  });
});

function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

console.log('Running Strength Calculation Tests...\n');
try {
  describe('getLeaderStrength', () => {
    test('should return 0 for Cheap Hero', () => {
      const plan = BattlePlanPresets.withCheapHero(Faction.ATREIDES, 1);
      const strength = getLeaderStrength(plan);
      if (strength !== 0) {
        throw new Error(`Expected 0 but got ${strength}`);
      }
    });
  });
  console.log('\n✓ All tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

