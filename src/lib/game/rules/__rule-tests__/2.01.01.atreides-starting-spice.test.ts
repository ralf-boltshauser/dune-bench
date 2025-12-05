/**
 * Rule test: 2.01.01 ATREIDES STARTING SPICE
 *
 * Rule text (numbered_rules/2.md):
 * "2.01.01 Starting Spice [0.12]: Put 10 spice behind your shield from the bank."
 *
 * These tests exercise the core behavior of Atreides starting spice:
 * - Atreides starts with exactly 10 spice
 * - Other factions are unaffected by this rule
 * - Advanced/basic rules toggle does not change Atreides starting spice
 *
 * @rule-test 2.01.01
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.01.01.atreides-starting-spice.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";

// =============================================================================
// Minimal test harness (console-based, like 1.02.01.blow-the-spice.test.ts)
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

function buildBaseState(advancedRules: boolean): GameState {
  // Use two standard factions to satisfy createGameState validation (2–6 factions)
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules,
  });
}

// =============================================================================
// Tests for 2.01.01
// =============================================================================

function testAtreidesStartingSpice_basicRules(): void {
  section("2.01.01 - Atreides starting spice (basic rules)");

  const state = buildBaseState(false);
  const atreides = state.factions.get(Faction.ATREIDES);
  const harkonnen = state.factions.get(Faction.HARKONNEN);

  assert(!!atreides, "Atreides faction state exists");
  assert(!!harkonnen, "Harkonnen faction state exists");

  // Core rule: Atreides starts with exactly 10 spice
  assert(
    atreides?.spice === 10,
    `Atreides starts with 10 spice (actual: ${atreides?.spice ?? "missing"})`
  );

  // Guard: This rule does not constrain other factions' starting spice
  assert(
    typeof harkonnen?.spice === "number" && harkonnen!.spice !== undefined,
    "Other factions (e.g., Harkonnen) have a defined starting spice amount"
  );
}

function testAtreidesStartingSpice_advancedRules(): void {
  section("2.01.01 - Atreides starting spice (advanced rules)");

  const state = buildBaseState(true);
  const atreides = state.factions.get(Faction.ATREIDES);

  assert(!!atreides, "Atreides faction state exists");

  // Rule 2.01.01 applies regardless of basic/advanced rules mode
  assert(
    atreides?.spice === 10,
    `Atreides starting spice is still 10 with advanced rules enabled (actual: ${
      atreides?.spice ?? "missing"
    })`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.01 ATREIDES STARTING SPICE");
  console.log("=".repeat(80));

  try {
    testAtreidesStartingSpice_basicRules();
  } catch (error) {
    console.error(
      "❌ testAtreidesStartingSpice_basicRules failed:",
      error
    );
    failCount++;
  }

  try {
    testAtreidesStartingSpice_advancedRules();
  } catch (error) {
    console.error(
      "❌ testAtreidesStartingSpice_advancedRules failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.01 tests completed: ${passCount} passed, ${failCount} failed`
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


