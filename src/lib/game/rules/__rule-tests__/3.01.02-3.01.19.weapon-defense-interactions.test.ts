/**
 * Rule tests: 3.01.02–3.01.03, 3.01.05–3.01.08, 3.01.15–3.01.19 WEAPON/DEFENSE CARDS
 *
 * Rule text (numbered_rules/3.md):
 * - 3.01.02 CHAUMAS: Weapon-Poison - ... Kills opponent's leader before battle is resolved.
 *   Opponent may protect their leader with a Poison Defense. You may keep this card if you win this battle.
 * - 3.01.03 CHAUMURKY: Weapon-Poison - same structure as Chaumas.
 * - 3.01.05 CRYSKNIFE: Weapon-Projectile - ... Opponent may protect their leader with a Projectile Defense.
 * - 3.01.06 ELLACA DRUG: Weapon-Poison - ... Opponent may protect their leader with a Projectile Defense.
 * - 3.01.08 GOM JABBAR: Weapon-Poison - ... Opponent may protect their leader with a Poison Defense.
 * - 3.01.15 MAULA PISTOL: Weapon-Projectile - ... Opponent may protect their leader with a Projectile Defense.
 * - 3.01.16 SHIELD: Defense-Projectile - ... Protects your leader from a projectile weapon in this battle.
 * - 3.01.17 SLIP TIP: Weapon-Projectile - ... Opponent may protect their leader with a Projectile Defense.
 * - 3.01.18 SNOOPER: Defense-Poison - ... Protects your leader from a poison weapon in this battle.
 * - 3.01.19 STUNNER: Weapon-Projectile - ... Opponent may protect their leader with a Projectile Defense.
 *
 * These rules are enforced by resolveWeaponDefense:
 * - Poison weapons kill leaders unless defended by poison defense (Snooper)
 * - Projectile weapons kill leaders unless defended by projectile defense (Shield)
 * - Ellaca Drug is poison but is defended by projectile defense
 *
 * @rule-test 3.01.02
 * @rule-test 3.01.03
 * @rule-test 3.01.05
 * @rule-test 3.01.06
 * @rule-test 3.01.08
 * @rule-test 3.01.15
 * @rule-test 3.01.16
 * @rule-test 3.01.17
 * @rule-test 3.01.18
 * @rule-test 3.01.19
 */

import { ALL_TREACHERY_CARDS, getTreacheryCardDefinition } from "../../data";
import { TreacheryCardType } from "../../types";
import {
  resolveWeaponDefense,
} from "../combat/weapon-defense";

// =============================================================================
// Minimal console-based test harness
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

function requireCardIdOfType(expectedType: TreacheryCardType): string {
  const def = ALL_TREACHERY_CARDS.find((card) => card.type === expectedType);
  if (!def) {
    throw new Error(
      `Could not find treachery card of type ${expectedType} in ALL_TREACHERY_CARDS`
    );
  }
  return def.id;
}

// =============================================================================
// Tests
// =============================================================================

function testProjectileWeaponsKillWithoutProjectileDefense(): void {
  section("3.01.05/15/17/19 - projectile weapons kill without projectile defense");

  const weaponId = requireCardIdOfType(TreacheryCardType.WEAPON_PROJECTILE);

  const result = resolveWeaponDefense(weaponId, null, "leader_x");

  assert(result.weaponEffective, "projectile weapon is effective without defense");
  assert(result.leaderKilled, "leader is killed without projectile defense");
  assert(!result.defenseEffective, "no defense is effective");
}

function testProjectileWeaponsBlockedByProjectileDefense(): void {
  section("3.01.05/15/17/19/16 - projectile weapons blocked by projectile defense");

  const weaponId = requireCardIdOfType(TreacheryCardType.WEAPON_PROJECTILE);
  const defenseId = requireCardIdOfType(TreacheryCardType.DEFENSE_PROJECTILE);

  const result = resolveWeaponDefense(weaponId, defenseId, "leader_x");

  assert(!result.weaponEffective, "projectile weapon is not effective with projectile defense");
  assert(!result.leaderKilled, "leader survives with projectile defense");
  assert(result.defenseEffective, "projectile defense is effective");
}

function testPoisonWeaponsKillWithoutPoisonDefense(): void {
  section("3.01.02/3/8 - poison weapons kill without poison defense");

  const weaponId = requireCardIdOfType(TreacheryCardType.WEAPON_POISON);

  const result = resolveWeaponDefense(weaponId, null, "leader_x");

  assert(result.weaponEffective, "poison weapon is effective without defense");
  assert(result.leaderKilled, "leader is killed without poison defense");
  assert(!result.defenseEffective, "no defense is effective");
}

function testPoisonWeaponsBlockedByPoisonDefense(): void {
  section("3.01.02/3/8/18 - poison weapons blocked by poison defense");

  const weaponId = requireCardIdOfType(TreacheryCardType.WEAPON_POISON);
  const defenseId = requireCardIdOfType(TreacheryCardType.DEFENSE_POISON);

  const result = resolveWeaponDefense(weaponId, defenseId, "leader_x");

  assert(!result.weaponEffective, "poison weapon is not effective with poison defense");
  assert(!result.leaderKilled, "leader survives with poison defense");
  assert(result.defenseEffective, "poison defense is effective");
}

function testEllacaDrugDefendedByProjectileDefense(): void {
  section("3.01.06 - Ellaca Drug defended by projectile defense");

  const ellacaDef = getTreacheryCardDefinition("ellaca_drug");
  if (!ellacaDef) {
    throw new Error("Expected ellaca_drug definition for tests");
  }
  const defenseId = requireCardIdOfType(TreacheryCardType.DEFENSE_PROJECTILE);

  const result = resolveWeaponDefense(ellacaDef.id, defenseId, "leader_x");

  assert(
    !result.weaponEffective,
    "Ellaca Drug is not effective when projectile defense is present"
  );
  assert(
    !result.leaderKilled,
    "Ellaca Drug does not kill leader when projectile defense is present"
  );
  assert(result.defenseEffective, "projectile defense is effective against Ellaca Drug");
}

function testNoWeaponOrNoTargetLeaderDoesNothing(): void {
  section("3.01.xx - no weapon or no target leader results in no effect");

  const someWeaponId = requireCardIdOfType(TreacheryCardType.WEAPON_PROJECTILE);

  const noWeapon = resolveWeaponDefense(null, null, "leader_x");
  assert(
    !noWeapon.weaponEffective &&
      !noWeapon.leaderKilled &&
      !noWeapon.defenseEffective,
    "no weapon => no effect"
  );

  const noLeader = resolveWeaponDefense(someWeaponId, null, null);
  assert(
    !noLeader.weaponEffective &&
      !noLeader.leaderKilled &&
      !noLeader.defenseEffective,
    "no target leader => no effect"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.02–3.01.03, 3.01.05–3.01.08, 3.01.15–3.01.19 WEAPON/DEFENSE INTERACTIONS");
  console.log("=".repeat(80));

  try {
    testProjectileWeaponsKillWithoutProjectileDefense();
  } catch (error) {
    console.error(
      "❌ testProjectileWeaponsKillWithoutProjectileDefense failed:",
      error
    );
    failCount++;
  }

  try {
    testProjectileWeaponsBlockedByProjectileDefense();
  } catch (error) {
    console.error(
      "❌ testProjectileWeaponsBlockedByProjectileDefense failed:",
      error
    );
    failCount++;
  }

  try {
    testPoisonWeaponsKillWithoutPoisonDefense();
  } catch (error) {
    console.error(
      "❌ testPoisonWeaponsKillWithoutPoisonDefense failed:",
      error
    );
    failCount++;
  }

  try {
    testPoisonWeaponsBlockedByPoisonDefense();
  } catch (error) {
    console.error(
      "❌ testPoisonWeaponsBlockedByPoisonDefense failed:",
      error
    );
    failCount++;
  }

  try {
    testEllacaDrugDefendedByProjectileDefense();
  } catch (error) {
    console.error(
      "❌ testEllacaDrugDefendedByProjectileDefense failed:",
      error
    );
    failCount++;
  }

  try {
    testNoWeaponOrNoTargetLeaderDoesNothing();
  } catch (error) {
    console.error(
      "❌ testNoWeaponOrNoTargetLeaderDoesNothing failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.02–3.01.03, 3.01.05–3.01.08, 3.01.15–3.01.19 tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // Allow this file to be run directly via tsx
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRuleTests();
}


