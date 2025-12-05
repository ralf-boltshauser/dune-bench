/**
 * Rule tests: 3.01.01, 3.01.10, 3.01.12, 3.01.13, 3.01.21 WORTHLESS CARDS
 *
 * Rule text (numbered_rules/3.md):
 * "3.01.01 BALISET: Worthless Card - Play as part of your Battle Plan in place of a weapon, defense, or both.
 *  This card has no value in play. You can discard it by playing it in your Battle Plan."
 * "3.01.10 JUBBA CLOAK: Worthless Card - Play as part of your Battle Plan in place of a weapon, defense, or both.
 *  This card has no value in play. You can discard it by playing it in your Battle Plan."
 * "3.01.12 KULON: Worthless Card - Play as part of your Battle Plan in place of a weapon, defense, or both.
 *  This card has no value in play. You can discard it by playing it in your Battle Plan."
 * "3.01.13 LA, LA, LA: Worthless Card - Play as part of your Battle Plan in place of a weapon, defense, or both.
 *  This card has no value in play. You can discard it by playing it in your Battle Plan."
 * "3.01.21 TRIP TO GAMONT: Worthless Card - Play as part of your Battle Plan in place of a weapon, defense, or both.
 *  This card has no value in play. You can discard it by playing it in your Battle Plan."
 *
 * These rules are enforced by treachery card validation:
 * - Worthless cards may be played in the weapon slot
 * - Worthless cards may be played in the defense slot
 * - Non-weapon/non-defense, non-worthless cards are rejected for those slots
 *
 * @rule-test 3.01.01
 * @rule-test 3.01.10
 * @rule-test 3.01.12
 * @rule-test 3.01.13
 * @rule-test 3.01.21
 */

import { getTreacheryCardDefinition, isWorthless } from "../../data";
import type { TreacheryCard } from "../../types";
import {
  createError,
  type ValidationError,
} from "../types";
import {
  validateTreacheryCard,
} from "../combat/validation/validate-cards";

// =============================================================================
// Minimal console-based test harness (same pattern as 1.02.01.blow-the-spice)
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

function makeCardFromDefId(definitionId: string): TreacheryCard {
  const def = getTreacheryCardDefinition(definitionId);
  if (!def) {
    throw new Error(`Unknown treachery card definition: ${definitionId}`);
  }
  return {
    definitionId: def.id,
    location: def.location,
    ownerId: null,
  } as TreacheryCard;
}

function expectNoError(error: ValidationError | null): void {
  assert(error === null, "validation passes (no error)");
}

function expectErrorCode(
  error: ValidationError | null,
  code: string
): void {
  assert(error !== null, "validation failed as expected");
  if (error) {
    assert(error.code === code, `error code is ${code}`);
  }
}

// =============================================================================
// Tests
// =============================================================================

function testWorthlessCardsAllowedAsWeapon(): void {
  section("3.01.01/10/12/13/21 - worthless cards allowed as weapon");

  const worthlessIds = [
    "baliset",
    "jubba_cloak",
    "kulon",
    "la_la_la",
    "trip_to_gamont",
  ];

  for (const id of worthlessIds) {
    const card = makeCardFromDefId(id);
    const hand: TreacheryCard[] = [card];

    // Should be valid when used as weapon
    const error = validateTreacheryCard(
      hand,
      card.definitionId,
      "weapon",
      "weaponCardId"
    );

    console.log(`\nCard ${id} as weapon:`);
    expectNoError(error);
  }
}

function testWorthlessCardsAllowedAsDefense(): void {
  section("3.01.01/10/12/13/21 - worthless cards allowed as defense");

  const worthlessIds = [
    "baliset",
    "jubba_cloak",
    "kulon",
    "la_la_la",
    "trip_to_gamont",
  ];

  for (const id of worthlessIds) {
    const card = makeCardFromDefId(id);
    const hand: TreacheryCard[] = [card];

    // Should be valid when used as defense
    const error = validateTreacheryCard(
      hand,
      card.definitionId,
      "defense",
      "defenseCardId"
    );

    console.log(`\nCard ${id} as defense:`);
    expectNoError(error);
  }
}

function testNonWorthlessCardsRejectedInWrongSlot(): void {
  section("3.01.xx - non-worthless cards rejected when type does not match slot");

  // Pick a projectile weapon (e.g., CRYSKNIFE or MAULA PISTOL) and try as defense
  const projectileWeaponDef = getTreacheryCardDefinition("crysknife");
  if (!projectileWeaponDef) {
    throw new Error("Expected crysknife definition for tests");
  }
  const projectileCard = makeCardFromDefId("crysknife");

  const hand: TreacheryCard[] = [projectileCard];

  const defenseError = validateTreacheryCard(
    hand,
    projectileCard.definitionId,
    "defense",
    "defenseCardId"
  );

  console.log("\nProjectile weapon used as defense:");
  expectErrorCode(defenseError, "INVALID_DEFENSE_CARD");
}

function testWorthlessDetectionMatchesData(): void {
  section("3.01.xx - worthless flag consistency with data definitions");

  const worthlessIds = [
    "baliset",
    "jubba_cloak",
    "kulon",
    "la_la_la",
    "trip_to_gamont",
  ];

  for (const id of worthlessIds) {
    const def = getTreacheryCardDefinition(id);
    if (!def) {
      throw new Error(`Missing definition for worthless card ${id}`);
    }
    console.log(`\nChecking worthless flag for ${id}:`);
    assert(
      isWorthless(def),
      "card definition is marked as worthless in data layer"
    );
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.01 / 3.01.10 / 3.01.12 / 3.01.13 / 3.01.21 WORTHLESS CARDS");
  console.log("=".repeat(80));

  try {
    testWorthlessCardsAllowedAsWeapon();
  } catch (error) {
    console.error(
      "❌ testWorthlessCardsAllowedAsWeapon failed:",
      error
    );
    failCount++;
  }

  try {
    testWorthlessCardsAllowedAsDefense();
  } catch (error) {
    console.error(
      "❌ testWorthlessCardsAllowedAsDefense failed:",
      error
    );
    failCount++;
  }

  try {
    testNonWorthlessCardsRejectedInWrongSlot();
  } catch (error) {
    console.error(
      "❌ testNonWorthlessCardsRejectedInWrongSlot failed:",
      error
    );
    failCount++;
  }

  try {
    testWorthlessDetectionMatchesData();
  } catch (error) {
    console.error(
      "❌ testWorthlessDetectionMatchesData failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.01/10/12/13/21 tests completed: ${passCount} passed, ${failCount} failed`
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


