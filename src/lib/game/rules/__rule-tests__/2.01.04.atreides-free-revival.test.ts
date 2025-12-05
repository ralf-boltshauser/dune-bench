/**
 * Rule test: 2.01.04 ATREIDES FREE REVIVAL
 *
 * Rule text (numbered_rules/2.md):
 * "2.01.04 FREE REVIVAL: 2 Forces."
 *
 * These tests exercise the core behavior of Atreides free revival:
 * - Atreides has a free revival limit of 2 forces per turn
 * - getRevivalLimits exposes freeForces = 2 for Atreides
 * - Free revival is available regardless of advanced/basic rules mode
 *
 * @rule-test 2.01.04
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.01.04.atreides-free-revival.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getRevivalLimits } from "../../rules";

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

function buildBaseState(advancedRules: boolean): GameState {
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules,
  });
}

// =============================================================================
// Tests for 2.01.04
// =============================================================================

function testAtreidesFreeRevival_basicRules(): void {
  section("2.01.04 - Atreides free revival (basic rules)");

  const state = buildBaseState(false);

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    limits.freeForces === 2,
    `Atreides free revival is 2 forces (actual: ${limits.freeForces})`
  );
}

function testAtreidesFreeRevival_advancedRules(): void {
  section("2.01.04 - Atreides free revival (advanced rules)");

  const state = buildBaseState(true);

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    limits.freeForces === 2,
    `Atreides free revival remains 2 forces with advanced rules (actual: ${limits.freeForces})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.04 ATREIDES FREE REVIVAL");
  console.log("=".repeat(80));

  try {
    testAtreidesFreeRevival_basicRules();
  } catch (error) {
    console.error(
      "❌ testAtreidesFreeRevival_basicRules failed:",
      error
    );
    failCount++;
  }

  try {
    testAtreidesFreeRevival_advancedRules();
  } catch (error) {
    console.error(
      "❌ testAtreidesFreeRevival_advancedRules failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.04 tests completed: ${passCount} passed, ${failCount} failed`
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


