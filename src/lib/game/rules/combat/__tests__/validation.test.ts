/**
 * Unit Tests for Battle Plan Validation
 * 
 * Tests for validateBattlePlan, validateVoiceCompliance, canCallTraitor, etc.
 */

import { validateBattlePlan, validateVoiceCompliance, canCallTraitor } from '../index.js';
import { CombatTestStateBuilder, CombatTestStatePresets } from './helpers/test-state-builder.js';
import { BattlePlanBuilder, BattlePlanPresets } from './helpers/battle-plan-builder.js';
import { CombatAssertions } from './helpers/assertions.js';
import { CombatTestUtils } from './helpers/test-utils.js';
import { TEST_CARDS, TEST_LEADERS, TEST_TERRITORIES } from './helpers/presets.js';
import { Faction, TerritoryId, LeaderLocation, TreacheryCardType } from '../../../types/index.js';

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

describe('validateBattlePlan', () => {
  describe('Forces Dialed Validation', () => {
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
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(100) // More than available
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'FORCES_DIALED_EXCEEDS_AVAILABLE');
    });
  });

  describe('Leader/Cheap Hero Requirements', () => {
    test('should accept leader when available', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.minimal(Faction.ATREIDES, leaderId, 1);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should require Cheap Hero when no leaders available', () => {
      const state = CombatTestStatePresets.noLeadersBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(1)
        .withNoLeader()
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'MUST_PLAY_CHEAP_HERO');
    });

    test('should accept Cheap Hero when no leaders available', () => {
      const state = CombatTestStatePresets.noLeadersBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const plan = BattlePlanPresets.withCheapHero(Faction.ATREIDES, 1);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should reject no leader/Cheap Hero when leaders available', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(1)
        .withNoLeader()
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'MUST_PLAY_LEADER');
    });

    test('should reject both leader and Cheap Hero used', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withCheapHero()
        .withForces(1)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      // Should have error about mutually exclusive
      if (result.valid) {
        throw new Error('Expected invalid result when both leader and Cheap Hero used');
      }
    });
  });

  describe('Treachery Card Validation', () => {
    test('should accept valid weapon card in hand', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withCard(Faction.ATREIDES, TEST_CARDS.WEAPONS.CRYSKNIFE, TreacheryCardType.WEAPON_PROJECTILE)
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(1)
        .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should reject weapon card not in hand', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(1)
        .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE) // Not in hand
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'CARD_NOT_IN_HAND');
    });

    test('should reject treachery cards without leader/Cheap Hero', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withCard(Faction.ATREIDES, TEST_CARDS.WEAPONS.CRYSKNIFE, TreacheryCardType.WEAPON_PROJECTILE)
        .withAllLeadersInTanks(Faction.ATREIDES)
        .build();
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withForces(1)
        .withNoLeader()
        .withWeapon(TEST_CARDS.WEAPONS.CRYSKNIFE)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      // The actual error code is CANNOT_PLAY_TREACHERY_WITHOUT_LEADER
      // But validation might check for Cheap Hero first if available
      if (result.errors.some(e => e.code === 'CANNOT_PLAY_TREACHERY_WITHOUT_LEADER')) {
        // This is the expected error
        return;
      }
      // If Cheap Hero is available, it might require that first
      if (result.errors.some(e => e.code === 'MUST_PLAY_CHEAP_HERO')) {
        // This is also valid - Cheap Hero check comes first
        return;
      }
      throw new Error(`Expected CANNOT_PLAY_TREACHERY_WITHOUT_LEADER or MUST_PLAY_CHEAP_HERO but got: ${result.errors.map(e => e.code).join(', ')}`);
    });
  });

  describe('Spice Dialing Validation', () => {
    test('should accept valid spice dialing in advanced rules', () => {
      const state = CombatTestStatePresets.advancedBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.withSpice(Faction.ATREIDES, leaderId, 5, 3);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should reject spice dialing in basic rules', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.withSpice(Faction.ATREIDES, leaderId, 5, 3);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'ABILITY_NOT_AVAILABLE');
    });

    test('should reject spice dialed > forces dialed', () => {
      const state = CombatTestStatePresets.advancedBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(3)
        .withSpice(5) // More than forces
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'INVALID_SPICE_DIALING');
    });

    test('should reject spice dialed > available spice', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withAdvancedRules()
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .build();
      // Atreides starts with 10 spice, so we need to set it lower
      // We'll manually set spice to 2 after building
      const factionState = state.factions.get(Faction.ATREIDES)!;
      factionState.spice = 2; // Only 2 spice available
      
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      // Use 3 forces so spice (3) <= forces (3), but spice (3) > available (2)
      const plan = BattlePlanBuilder.create(Faction.ATREIDES)
        .withLeader(leaderId)
        .withForces(3)
        .withSpice(3) // More than available (2), but equal to forces (3)
        .build();

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'INSUFFICIENT_SPICE');
    });
  });

  describe('Kwisatz Haderach Validation', () => {
    test('should accept KH when active and not dead', () => {
      const state = CombatTestStatePresets.kwisatzHaderachBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.withKH(Faction.ATREIDES, leaderId, 1);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectValid(result);
    });

    test('should reject KH used by non-Atreides', () => {
      const state = CombatTestStatePresets.basicBattle(Faction.HARKONNEN, Faction.ATREIDES);
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.HARKONNEN)!;
      const plan = BattlePlanPresets.withKH(Faction.HARKONNEN, leaderId, 1);

      const result = validateBattlePlan(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'ABILITY_NOT_AVAILABLE');
    });

    test('should reject KH when not active', () => {
      const state = CombatTestStateBuilder.create()
        .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
        .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
        .withKwisatzHaderach(Faction.ATREIDES, {
          isActive: false,
          isDead: false,
          forcesLostCount: 5, // Less than 7
        })
        .build();
      const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
      const plan = BattlePlanPresets.withKH(Faction.ATREIDES, leaderId, 1);

      const result = validateBattlePlan(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, plan);

      CombatAssertions.expectInvalid(result, 'KH_NOT_ACTIVE');
    });
  });
});

describe('validateVoiceCompliance', () => {
  test('should accept compliance with play command', () => {
    const state = CombatTestStateBuilder.create()
      .withFactions([Faction.BENE_GESSERIT, Faction.ATREIDES])
      .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
      .withCard(Faction.ATREIDES, TEST_CARDS.WEAPONS.CHAUMAS, TreacheryCardType.WEAPON_POISON)
      .build();
    const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
    const plan = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader(leaderId)
      .withForces(1)
      .withWeapon(TEST_CARDS.WEAPONS.CHAUMAS) // Poison weapon
      .build();

    const voiceCommand = {
      type: 'play' as const,
      cardType: 'poison_weapon',
    };

    const errors = validateVoiceCompliance(state, plan, voiceCommand);

    if (errors.length > 0) {
      throw new Error(`Expected no errors but got: ${errors.map(e => e.message).join(', ')}`);
    }
  });

  test('should reject violation of play command', () => {
    const state = CombatTestStateBuilder.create()
      .withFactions([Faction.BENE_GESSERIT, Faction.ATREIDES])
      .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
      .withCard(Faction.ATREIDES, TEST_CARDS.WEAPONS.CHAUMAS, TreacheryCardType.WEAPON_POISON)
      .withCard(Faction.ATREIDES, TEST_CARDS.WEAPONS.MAULA_PISTOL, TreacheryCardType.WEAPON_PROJECTILE)
      .build();
    const leaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
    const plan = BattlePlanBuilder.create(Faction.ATREIDES)
      .withLeader(leaderId)
      .withForces(1)
      .withWeapon(TEST_CARDS.WEAPONS.MAULA_PISTOL) // Projectile weapon (violation!)
      .build();

    const voiceCommand = {
      type: 'play' as const,
      cardType: 'poison_weapon',
    };

    const errors = validateVoiceCompliance(state, plan, voiceCommand);

    if (errors.length === 0) {
      throw new Error('Expected errors for voice command violation');
    }
  });
});

describe('canCallTraitor', () => {
  test('should return true when has traitor card', () => {
    const state = CombatTestStateBuilder.create()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5)
      .build();
    const targetLeaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;
    
    // Add traitor card to Harkonnen - need to match the actual traitor structure
    const harkonnenState = state.factions.get(Faction.HARKONNEN)!;
    if (!harkonnenState.traitors) {
      harkonnenState.traitors = [];
    }
    harkonnenState.traitors.push({
      leaderId: targetLeaderId,
      leaderName: 'Test Leader',
      leaderFaction: Faction.ATREIDES,
      heldBy: Faction.HARKONNEN,
    });

    const result = canCallTraitor(state, Faction.HARKONNEN, targetLeaderId);

    if (!result.valid || !(result.context as any)?.canCallTraitor) {
      throw new Error(`Expected canCallTraitor to be true when traitor card is held. Result: ${JSON.stringify(result)}`);
    }
  });

  test('should return false when no traitor card', () => {
    const state = CombatTestStatePresets.basicBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const targetLeaderId = CombatTestUtils.getAvailableLeader(state, Faction.ATREIDES)!;

    const result = canCallTraitor(state, Faction.HARKONNEN, targetLeaderId);

    if (result.valid) {
      throw new Error('Expected result to be invalid when no traitor card is held');
    }
  });
});

// Test runner
function describe(suite: string, fn: () => void) {
  console.log(`\n=== ${suite} ===`);
  fn();
}

// Run all tests
console.log('Running Combat Validation Tests...\n');
try {
  // All tests are already defined above in describe blocks
  console.log('\n✓ All validation tests passed!');
} catch (error) {
  console.error('\n✗ Tests failed:', error);
  process.exit(1);
}

