/**
 * Unit Tests for Weapon/Defense Resolution
 * 
 * Tests for resolveWeaponDefense, checkLasgunShieldExplosion
 */

import { resolveWeaponDefense, checkLasgunShieldExplosion } from '../weapon-defense.js';
import { BattlePlanBuilder } from './helpers/battle-plan-builder.js';
import { TEST_CARDS } from './helpers/presets.js';
import { Faction, TreacheryCardType } from '../../../types/index.js';

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

describe('resolveWeaponDefense', () => {
  test('should make defense effective for projectile weapon vs projectile defense', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.MAULA_PISTOL, // Projectile weapon
      TEST_CARDS.DEFENSES.SHIELD,      // Projectile defense
      'test_leader'
    );

    // Debug: log the result to see what we're getting
    if (!result.defenseEffective) {
      throw new Error(`Expected defense to be effective but got: ${JSON.stringify(result)}`);
    }
    if (result.leaderKilled) {
      throw new Error('Expected leader not to be killed when defense is effective');
    }
  });

  test('should make defense effective for poison weapon vs poison defense', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.CHAUMAS,  // Poison weapon
      TEST_CARDS.DEFENSES.SNOOPER, // Poison defense
      'test_leader'
    );

    if (!result.defenseEffective) {
      throw new Error('Expected defense to be effective');
    }
    if (result.leaderKilled) {
      throw new Error('Expected leader not to be killed when defense is effective');
    }
  });

  test('should kill leader when defense does not match weapon type', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.MAULA_PISTOL, // Projectile weapon
      TEST_CARDS.DEFENSES.SNOOPER,     // Poison defense (wrong type)
      'test_leader'
    );

    if (result.defenseEffective) {
      throw new Error('Expected defense to be ineffective');
    }
    if (!result.leaderKilled) {
      throw new Error('Expected leader to be killed when defense is ineffective');
    }
  });

  test('should kill leader when no defense played', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.CRYSKNIFE,
      null, // No defense
      'test_leader'
    );

    if (!result.leaderKilled) {
      throw new Error('Expected leader to be killed when no defense');
    }
  });

  test('should not kill when no weapon played', () => {
    const result = resolveWeaponDefense(
      null, // No weapon
      TEST_CARDS.DEFENSES.SHIELD,
      'test_leader'
    );

    if (result.leaderKilled) {
      throw new Error('Expected leader not to be killed when no weapon');
    }
  });

  test('should kill with Lasgun (no defense possible)', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.LASGUN,
      TEST_CARDS.DEFENSES.SHIELD, // Defense doesn't matter for Lasgun
      'test_leader'
    );

    if (!result.leaderKilled) {
      throw new Error('Expected leader to be killed by Lasgun');
    }
    if (result.defenseEffective) {
      throw new Error('Expected defense to be ineffective against Lasgun');
    }
  });

  test('should handle Ellaca Drug (poison weapon, defended by projectile defense)', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.ELLACA_DRUG, // Poison weapon
      TEST_CARDS.DEFENSES.SHIELD,     // Projectile defense (correct for Ellaca Drug)
      'test_leader'
    );

    if (!result.defenseEffective) {
      throw new Error('Expected projectile defense to be effective against Ellaca Drug');
    }
  });

  test('should not defend Ellaca Drug with poison defense', () => {
    const result = resolveWeaponDefense(
      TEST_CARDS.WEAPONS.ELLACA_DRUG, // Poison weapon
      TEST_CARDS.DEFENSES.SNOOPER,    // Poison defense (wrong for Ellaca Drug)
      'test_leader'
    );

    if (result.defenseEffective) {
      throw new Error('Expected poison defense to be ineffective against Ellaca Drug');
    }
  });
});

describe('checkLasgunShieldExplosion', () => {
  test('should detect explosion when Lasgun and Shield in different plans', () => {
    const plan1 = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(1)
      .withWeapon(TEST_CARDS.WEAPONS.LASGUN)
      .build();

    const plan2 = BattlePlanBuilder.create(Faction.HARKONNEN)
      .withLeader('test_leader')
      .withForces(1)
      .withDefense(TEST_CARDS.DEFENSES.SHIELD)
      .build();

    const explosion = checkLasgunShieldExplosion(plan1, plan2);

    if (!explosion) {
      throw new Error('Expected explosion when Lasgun and Shield are present');
    }
  });

  test('should detect explosion when Lasgun and Shield Snooper present', () => {
    const plan1 = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(1)
      .withWeapon(TEST_CARDS.WEAPONS.LASGUN)
      .build();

    const plan2 = BattlePlanBuilder.create(Faction.HARKONNEN)
      .withLeader('test_leader')
      .withForces(1)
      .withDefense(TEST_CARDS.DEFENSES.SHIELD_SNOOPER)
      .build();

    const explosion = checkLasgunShieldExplosion(plan1, plan2);

    if (!explosion) {
      throw new Error('Expected explosion when Lasgun and Shield Snooper are present');
    }
  });

  test('should not detect explosion when no Lasgun', () => {
    const plan1 = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(1)
      .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE)
      .build();

    const plan2 = BattlePlanBuilder.create(Faction.HARKONNEN)
      .withLeader('test_leader')
      .withForces(1)
      .withDefense(TEST_CARDS.DEFENSES.SHIELD)
      .build();

    const explosion = checkLasgunShieldExplosion(plan1, plan2);

    if (explosion) {
      throw new Error('Expected no explosion when no Lasgun');
    }
  });

  test('should not detect explosion when no Shield', () => {
    const plan1 = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(1)
      .withWeapon(TEST_CARDS.WEAPONS.LASGUN)
      .build();

    const plan2 = BattlePlanBuilder.create(Faction.HARKONNEN)
      .withLeader('test_leader')
      .withForces(1)
      .withDefense(TEST_CARDS.DEFENSES.SNOOPER) // Poison defense, not Shield
      .build();

    const explosion = checkLasgunShieldExplosion(plan1, plan2);

    if (explosion) {
      throw new Error('Expected no explosion when no Shield');
    }
  });
});

function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

console.log('Running Weapon/Defense Tests...\n');
try {
  describe('resolveWeaponDefense', () => {
    test('should make defense effective for projectile weapon vs projectile defense', () => {
      const result = resolveWeaponDefense(
        TEST_CARDS.WEAPONS.MAULA_PISTOL,
        TEST_CARDS.DEFENSES.SHIELD,
        'test_leader'
      );
      if (!result.defenseEffective || result.leaderKilled) {
        throw new Error('Defense should be effective');
      }
    });
  });
  console.log('\n✓ All tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

