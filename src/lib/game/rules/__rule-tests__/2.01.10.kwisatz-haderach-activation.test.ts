/**
 * Rule test: 2.01.10 THE SLEEPER HAS AWAKENED
 *
 * Rule text (numbered_rules/2.md):
 * "2.01.10 THE SLEEPER HAS AWAKENED: The Kwisatz Haderach card starts out inactive and the Kwisatz
 * Haderach token may not be used. Use the Kwisatz Haderach card and counter token to secretly keep
 * track of Force losses. Once you have lost 7 or more Forces in a battle or battles, the Kwisatz
 * Haderach token becomes active for the rest of the game."
 *
 * These tests verify that:
 * - Atreides' Kwisatz Haderach state starts inactive with 0 tracked losses.
 * - updateKwisatzHaderach accumulates Atreides force losses across calls.
 * - Kwisatz Haderach becomes active once total tracked losses reach 7 or more and
 *   remains active thereafter.
 *
 * @rule-test 2.01.10
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { updateKwisatzHaderach } from "../../state/mutations/kwisatz-haderach";

// =============================================================================
// Minimal test harness
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

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

// =============================================================================
// Tests for 2.01.10
// =============================================================================

function testKwisatzStartsInactive(): void {
  section("2.01.10 - Kwisatz Haderach starts inactive with zero losses");

  const state = buildBaseState();
  const atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    !!atreides.kwisatzHaderach,
    "Atreides kwisatzHaderach state exists on faction state"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === false,
    "Kwisatz Haderach starts inactive"
  );
  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 0,
    "Kwisatz Haderach starts with 0 tracked force losses"
  );
}

function testKwisatzActivatesAtSevenLosses(): void {
  section("2.01.10 - Kwisatz Haderach activates when 7+ forces are lost");

  let state = buildBaseState();

  // First, lose 3 forces in one or more battles
  state = updateKwisatzHaderach(state, 3);
  let atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 3,
    "forcesLostCount accumulates initial 3 losses"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === false,
    "Kwisatz Haderach remains inactive below 7 losses"
  );

  // Then, lose 4 more forces (3 + 4 = 7)
  state = updateKwisatzHaderach(state, 4);
  atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 7,
    "forcesLostCount accumulates to 7 total losses"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === true,
    "Kwisatz Haderach becomes active once total losses reach 7"
  );

  // Additional losses should not deactivate it
  state = updateKwisatzHaderach(state, 2);
  atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 9,
    "forcesLostCount continues to accumulate beyond activation"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === true,
    "Kwisatz Haderach remains active after activation"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.10 THE SLEEPER HAS AWAKENED");
  console.log("=".repeat(80));

  try {
    testKwisatzStartsInactive();
  } catch (error) {
    console.error("❌ testKwisatzStartsInactive failed:", error);
    failCount++;
  }

  try {
    testKwisatzActivatesAtSevenLosses();
  } catch (error) {
    console.error("❌ testKwisatzActivatesAtSevenLosses failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.10 tests completed: ${passCount} passed, ${failCount} failed`
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


