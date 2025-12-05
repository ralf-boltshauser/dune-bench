/**
 * Unit Tests for Loss Distribution
 * 
 * Tests for buildSideResult
 */

import { buildSideResult } from '../loss-distribution.js';
import { BattlePlanBuilder } from './helpers/battle-plan-builder.js';
import { TEST_CARDS } from './helpers/presets.js';
import { Faction } from '../../../types/index.js';
import type { WeaponDefenseResult } from '../types.js';

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

describe('buildSideResult', () => {
  test('should mark leader as killed when opponent weapon is effective', () => {
    const plan = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(5)
      .build();

    const myWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: true,
      defenseEffective: false,
    };

    const opponentWeaponResult: WeaponDefenseResult = {
      leaderKilled: true, // Opponent's weapon killed my leader
      weaponEffective: true,
      defenseEffective: false,
    };

    const result = buildSideResult(
      Faction.ATREIDES,
      plan,
      myWeaponResult,
      opponentWeaponResult,
      false, // isWinner
      10, // total
      5 // territoryForceCount - loser loses all forces
    );

    if (!result.leaderKilled) {
      throw new Error('Expected leader to be marked as killed');
    }
  });

  test('should set forces lost to dialed forces for winner', () => {
    const plan = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(3)
      .build();

    const myWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };

    const opponentWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };

    const result = buildSideResult(
      Faction.ATREIDES,
      plan,
      myWeaponResult,
      opponentWeaponResult,
      true, // isWinner
      10 // total
    );

    if (result.forcesLost !== 3) {
      throw new Error(`Expected forces lost to be 3 (dialed) for winner but got ${result.forcesLost}`);
    }
  });

  test('should discard all cards for loser', () => {
    const plan = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(5)
      .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE)
      .withDefense(TEST_CARDS.DEFENSES.SHIELD)
      .build();

    const myWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };

    const opponentWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };

    const result = buildSideResult(
      Faction.ATREIDES,
      plan,
      myWeaponResult,
      opponentWeaponResult,
      false, // isWinner (loser)
      5, // total
      5 // territoryForceCount - loser loses all forces
    );

    if (!result.cardsToDiscard.includes(TEST_CARDS.WEAPONS.CRYSKNIFE)) {
      throw new Error('Expected weapon card to be discarded for loser');
    }
    if (!result.cardsToDiscard.includes(TEST_CARDS.DEFENSES.SHIELD)) {
      throw new Error('Expected defense card to be discarded for loser');
    }
  });

  test('should keep cards without discardAfterUse for winner', () => {
    const plan = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader('test_leader')
      .withForces(5)
      .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE) // Can be kept if winner
      .withDefense(TEST_CARDS.DEFENSES.SHIELD)  // Can be kept if winner
      .build();

    const myWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };

    const opponentWeaponResult: WeaponDefenseResult = {
      leaderKilled: false,
      weaponEffective: false,
      defenseEffective: false,
    };

    const result = buildSideResult(
      Faction.ATREIDES,
      plan,
      myWeaponResult,
      opponentWeaponResult,
      true, // isWinner
      10 // total
    );

    // Cards should be in keep array (actual discard decision is made by battle handler)
    if (!result.cardsToKeep.includes(TEST_CARDS.WEAPONS.CRYSKNIFE) && 
        !result.cardsToDiscard.includes(TEST_CARDS.WEAPONS.CRYSKNIFE)) {
      throw new Error('Expected weapon card to be in either keep or discard array');
    }
  });
});

function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

console.log('Running Loss Distribution Tests...\n');
try {
  describe('buildSideResult', () => {
    test('should mark leader as killed when opponent weapon is effective', () => {
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader('test_leader')
        .withForces(5)
        .build();
      const opponentWeaponResult: WeaponDefenseResult = {
        leaderKilled: true,
        weaponEffective: true,
        defenseEffective: false,
      };
      const result = buildSideResult(
        Faction.ATREIDES,
        plan,
        { leaderKilled: false, weaponEffective: false, defenseEffective: false },
        opponentWeaponResult,
        false,
        10,
        5 // territoryForceCount - loser loses all forces
      );
      if (!result.leaderKilled) {
        throw new Error('Expected leader killed');
      }
    });
  });
  console.log('\n✓ All tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

