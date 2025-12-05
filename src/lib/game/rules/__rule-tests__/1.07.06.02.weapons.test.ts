/**
 * Rule test: 1.07.06.02 WEAPONS
 * @rule-test 1.07.06.02
 *
 * Rule text (numbered_rules/1.md):
 * "WEAPONS: Check to see if your opponent protected their leader from your weapon with the proper Defense, if they did not, do not add their leader's fighting strength to their number dialed. Next, see if your weapon affects your leader, if it does check to see if you played the proper Defense, if not do not add your leader's fighting strength to your number dialed. Note: Some weapons may not kill leaders but still make the leader's fighting strength nonapplicable."
 *
 * This rule establishes how weapons affect leader strength:
 * - Opponent's leader strength not added if not protected from your weapon
 * - Your leader strength not added if your weapon affects your leader and you didn't defend
 * - Defense must match weapon type (projectile vs projectile, poison vs poison)
 * - Lasgun has no defense (special weapon)
 * - Ellaca Drug special case (poison weapon but defended by projectile defense)
 * - Weapon/defense resolution is bidirectional (both sides checked)
 *
 * These tests verify:
 * - Weapon kills leader when no defense
 * - Weapon kills leader when wrong defense type
 * - Defense protects leader when correct type
 * - Projectile weapon vs projectile defense
 * - Poison weapon vs poison defense
 * - Lasgun (special weapon, no defense)
 * - Ellaca Drug special case
 * - Bidirectional weapon resolution (both sides)
 * - Leader strength not added when killed
 * - Leader strength added when protected
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState, type BattlePlan } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { resolveBattle } from "../../rules/combat/resolution/resolve-battle";
import { resolveWeaponDefense } from "../../rules/combat/weapon-defense";
import { getLeaderDefinition } from "../../data";

// =============================================================================
// Minimal test harness (console-based)
// =============================================================================

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.log(`  ✗ ${message}`);
    failCount++;
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

// =============================================================================
// Helpers
// =============================================================================

function buildBaseState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): GameState {
  // Ensure at least 2 factions for createGameState requirement
  const actualFactions = factions.length >= 2 ? factions : [Faction.ATREIDES, Faction.HARKONNEN];
  const state = createGameState({
    factions: actualFactions,
    turn: 1,
    phase: Phase.BATTLE,
    advancedRules: false, // Disable advanced rules to avoid spice dialing
  });
  return {
    ...state,
    stormOrder: actualFactions,
    stormSector: 0,
  };
}

function createBattlePlan(
  faction: Faction,
  forcesDialed: number,
  leaderId: string | null = null,
  weaponCardId: string | null = null,
  defenseCardId: string | null = null
): BattlePlan {
  return {
    factionId: faction,
    forcesDialed,
    leaderId,
    cheapHeroUsed: false,
    weaponCardId,
    defenseCardId,
    kwisatzHaderachUsed: false,
    spiceDialed: 0,
    announcedNoLeader: false,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testWeapons_WeaponKillsLeaderWhenNoDefense(): void {
  section("Weapon Kills Leader When No Defense");

  // Test direct weapon/defense resolution
  const result = resolveWeaponDefense(
    "crysknife", // Projectile weapon
    null,        // No defense
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.leaderKilled === true,
    `Leader should be killed when no defense, got leaderKilled: ${result.leaderKilled}`
  );
  assert(
    result.weaponEffective === true,
    `Weapon should be effective when no defense, got weaponEffective: ${result.weaponEffective}`
  );
  assert(
    result.defenseEffective === false,
    `Defense should not be effective when not played, got defenseEffective: ${result.defenseEffective}`
  );
}

function testWeapons_WeaponKillsLeaderWhenWrongDefenseType(): void {
  section("Weapon Kills Leader When Wrong Defense Type");

  // Projectile weapon vs poison defense (wrong type)
  const result = resolveWeaponDefense(
    "crysknife",  // Projectile weapon
    "snooper_1",  // Poison defense (wrong type)
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.leaderKilled === true,
    `Leader should be killed when wrong defense type, got leaderKilled: ${result.leaderKilled}`
  );
  assert(
    result.weaponEffective === true,
    `Weapon should be effective when wrong defense type, got weaponEffective: ${result.weaponEffective}`
  );
  assert(
    result.defenseEffective === false,
    `Defense should not be effective when wrong type, got defenseEffective: ${result.defenseEffective}`
  );
}

function testWeapons_DefenseProtectsLeaderWhenCorrectType(): void {
  section("Defense Protects Leader When Correct Type");

  // Projectile weapon vs projectile defense (correct type)
  const result = resolveWeaponDefense(
    "crysknife",  // Projectile weapon
    "shield_1",   // Projectile defense (correct type)
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.leaderKilled === false,
    `Leader should NOT be killed when correct defense, got leaderKilled: ${result.leaderKilled}`
  );
  assert(
    result.weaponEffective === false,
    `Weapon should NOT be effective when correct defense, got weaponEffective: ${result.weaponEffective}`
  );
  assert(
    result.defenseEffective === true,
    `Defense should be effective when correct type, got defenseEffective: ${result.defenseEffective}`
  );
}

function testWeapons_ProjectileWeaponVsProjectileDefense(): void {
  section("Projectile Weapon vs Projectile Defense");

  const result = resolveWeaponDefense(
    "maula_pistol", // Projectile weapon
    "shield_1",     // Projectile defense
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.defenseEffective === true,
    `Projectile defense should protect against projectile weapon`
  );
  assert(
    result.leaderKilled === false,
    `Leader should NOT be killed when protected by projectile defense`
  );
}

function testWeapons_PoisonWeaponVsPoisonDefense(): void {
  section("Poison Weapon vs Poison Defense");

  // Test with a poison weapon and poison defense
  // Using gom_jabbar (poison) vs snooper_1 (poison defense)
  const result = resolveWeaponDefense(
    "gom_jabbar", // Poison weapon
    "snooper_1",  // Poison defense
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.defenseEffective === true,
    `Poison defense should protect against poison weapon, got defenseEffective: ${result.defenseEffective}`
  );
  assert(
    result.leaderKilled === false,
    `Leader should NOT be killed when protected by poison defense, got leaderKilled: ${result.leaderKilled}`
  );
}

function testWeapons_LasgunNoDefense(): void {
  section("Lasgun (Special Weapon, No Defense)");

  // Lasgun kills leader regardless of defense
  const result = resolveWeaponDefense(
    "lasgun",    // Special weapon (Lasgun)
    "shield_1",  // Defense doesn't matter for Lasgun
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.leaderKilled === true,
    `Lasgun should kill leader regardless of defense`
  );
  assert(
    result.weaponEffective === true,
    `Lasgun should always be effective`
  );
  assert(
    result.defenseEffective === false,
    `Defense should not be effective against Lasgun`
  );
}

function testWeapons_EllacaDrugSpecialCase(): void {
  section("Ellaca Drug Special Case (Poison Weapon, Projectile Defense)");

  // Ellaca Drug is a poison weapon but defended by projectile defense
  const result = resolveWeaponDefense(
    "ellaca_drug", // Poison weapon (but special case)
    "shield_1",    // Projectile defense (correct for Ellaca Drug)
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.defenseEffective === true,
    `Projectile defense should protect against Ellaca Drug (special case)`
  );
  assert(
    result.leaderKilled === false,
    `Leader should NOT be killed when protected by projectile defense against Ellaca Drug`
  );
  
  // Ellaca Drug should NOT be defended by poison defense
  const result2 = resolveWeaponDefense(
    "ellaca_drug", // Poison weapon (but special case)
    "snooper_1",   // Poison defense (wrong for Ellaca Drug)
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result2.defenseEffective === false,
    `Poison defense should NOT protect against Ellaca Drug (special case)`
  );
  assert(
    result2.leaderKilled === true,
    `Leader should be killed when wrong defense type against Ellaca Drug`
  );
}

function testWeapons_BidirectionalResolution(): void {
  section("Bidirectional Weapon Resolution (Both Sides)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Atreides uses weapon (crysknife) against Harkonnen's leader
  // Harkonnen has no defense
  // Harkonnen's leader should be killed (strength not added)
  // Atreides' leader should not be affected (no weapon against them)
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 2, "atreides_duncan_idaho", "crysknife");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Harkonnen's leader should be killed
  assert(
    result.defenderResult.leaderKilled === true,
    `Defender leader should be killed by aggressor's weapon`
  );
  assert(
    result.defenderResult.leaderStrength === 0,
    `Defender leader strength should be 0 when killed, got ${result.defenderResult.leaderStrength}`
  );
  
  // Atreides' leader should not be killed
  assert(
    result.aggressorResult.leaderKilled === false,
    `Aggressor leader should NOT be killed (no weapon against them)`
  );
  
  const duncanStrength = getLeaderDefinition("atreides_duncan_idaho")?.strength ?? 0;
  assert(
    result.aggressorResult.leaderStrength === duncanStrength,
    `Aggressor leader strength should be added (${duncanStrength}), got ${result.aggressorResult.leaderStrength}`
  );
}

function testWeapons_BothSidesUseWeapons(): void {
  section("Both Sides Use Weapons (Bidirectional)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Both use weapons, both have no defense
  // Both leaders should be killed
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 2, "atreides_duncan_idaho", "crysknife");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban", "maula_pistol");
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Both leaders should be killed
  assert(
    result.aggressorResult.leaderKilled === true,
    `Aggressor leader should be killed by defender's weapon`
  );
  assert(
    result.defenderResult.leaderKilled === true,
    `Defender leader should be killed by aggressor's weapon`
  );
  
  // Both leader strengths should be 0
  assert(
    result.aggressorResult.leaderStrength === 0,
    `Aggressor leader strength should be 0 when killed`
  );
  assert(
    result.defenderResult.leaderStrength === 0,
    `Defender leader strength should be 0 when killed`
  );
  
  // Totals should be just forces (no leader strength)
  assert(
    result.aggressorResult.total === 2,
    `Aggressor total should be just forces (2), got ${result.aggressorResult.total}`
  );
  assert(
    result.defenderResult.total === 2,
    `Defender total should be just forces (2), got ${result.defenderResult.total}`
  );
}

function testWeapons_DefenseProtectsBothSides(): void {
  section("Defense Protects Both Sides");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Both use weapons, both have correct defense
  // Both leaders should survive
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 2, "atreides_duncan_idaho", "crysknife", "shield_1");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban", "maula_pistol", "shield_1");
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Both leaders should survive
  assert(
    result.aggressorResult.leaderKilled === false,
    `Aggressor leader should survive when protected by defense`
  );
  assert(
    result.defenderResult.leaderKilled === false,
    `Defender leader should survive when protected by defense`
  );
  
  // Both leader strengths should be added
  const duncanStrength = getLeaderDefinition("atreides_duncan_idaho")?.strength ?? 0;
  const rabbanStrength = getLeaderDefinition("harkonnen_glossu_rabban")?.strength ?? 0;
  
  assert(
    result.aggressorResult.leaderStrength === duncanStrength,
    `Aggressor leader strength should be added (${duncanStrength}), got ${result.aggressorResult.leaderStrength}`
  );
  assert(
    result.defenderResult.leaderStrength === rabbanStrength,
    `Defender leader strength should be added (${rabbanStrength}), got ${result.defenderResult.leaderStrength}`
  );
}

function testWeapons_LeaderStrengthNotAddedWhenKilled(): void {
  section("Leader Strength Not Added When Killed by Weapon");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Atreides kills Harkonnen's leader
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "atreides_duncan_idaho", "crysknife");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  const duncanStrength = getLeaderDefinition("atreides_duncan_idaho")?.strength ?? 0;
  const rabbanStrength = getLeaderDefinition("harkonnen_glossu_rabban")?.strength ?? 0;
  
  // Atreides: 3 forces + duncan strength = 3 + duncanStrength
  // Harkonnen: 2 forces + 0 (leader killed) = 2
  const expectedAtreidesTotal = 3 + duncanStrength;
  const expectedHarkonnenTotal = 2; // No leader strength
  
  assert(
    result.aggressorResult.total === expectedAtreidesTotal,
    `Aggressor total should include leader strength (${expectedAtreidesTotal}), got ${result.aggressorResult.total}`
  );
  assert(
    result.defenderResult.total === expectedHarkonnenTotal,
    `Defender total should NOT include leader strength (killed), got ${result.defenderResult.total}, expected ${expectedHarkonnenTotal}`
  );
  assert(
    result.defenderResult.leaderStrength === 0,
    `Defender leader strength should be 0 when killed, got ${result.defenderResult.leaderStrength}`
  );
}

function testWeapons_NoWeaponNoEffect(): void {
  section("No Weapon: No Effect on Leader");

  const result = resolveWeaponDefense(
    null,        // No weapon
    "shield_1",  // Defense doesn't matter
    "harkonnen_glossu_rabban"
  );
  
  assert(
    result.leaderKilled === false,
    `Leader should NOT be killed when no weapon`
  );
  assert(
    result.weaponEffective === false,
    `Weapon should NOT be effective when not played`
  );
  assert(
    result.defenseEffective === false,
    `Defense should NOT be effective when no weapon (nothing to defend against)`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.06.02: WEAPONS");
  console.log("=".repeat(80));

  testWeapons_WeaponKillsLeaderWhenNoDefense();
  testWeapons_WeaponKillsLeaderWhenWrongDefenseType();
  testWeapons_DefenseProtectsLeaderWhenCorrectType();
  testWeapons_ProjectileWeaponVsProjectileDefense();
  testWeapons_PoisonWeaponVsPoisonDefense();
  testWeapons_LasgunNoDefense();
  testWeapons_EllacaDrugSpecialCase();
  testWeapons_BidirectionalResolution();
  testWeapons_BothSidesUseWeapons();
  testWeapons_DefenseProtectsBothSides();
  testWeapons_LeaderStrengthNotAddedWhenKilled();
  testWeapons_NoWeaponNoEffect();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

