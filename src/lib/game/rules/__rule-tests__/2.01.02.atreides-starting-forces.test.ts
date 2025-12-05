/**
 * Rule test: 2.01.02 ATREIDES STARTING FORCES
 *
 * Rule text (numbered_rules/2.md):
 * "2.01.02 Starting Forces [0.13]: Place 10 Forces in Arrakeen and 10 in reserves (off-planet)."
 *
 * These tests exercise the core behavior of Atreides starting forces:
 * - Atreides starts with exactly 10 forces in Arrakeen
 * - Atreides starts with exactly 10 forces in reserves (off-planet)
 * - Forces in Arrakeen are regular forces (no elites)
 * - Other factions' starting forces are not constrained by this rule
 *
 * @rule-test 2.01.02
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.01.02.atreides-starting-forces.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
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
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules,
  });
}

// =============================================================================
// Tests for 2.01.02
// =============================================================================

function testAtreidesStartingForces_basicRules(): void {
  section("2.01.02 - Atreides starting forces (basic rules)");

  const state = buildBaseState(false);
  const atreides = state.factions.get(Faction.ATREIDES);
  const harkonnen = state.factions.get(Faction.HARKONNEN);

  assert(!!atreides, "Atreides faction state exists");
  assert(!!harkonnen, "Harkonnen faction state exists");

  const atreidesForces = atreides!.forces;

  const arrakeenStack = atreidesForces.onBoard.find(
    (stack) => stack.territoryId === TerritoryId.ARRAKEEN
  );

  assert(
    !!arrakeenStack,
    "Atreides has a force stack in Arrakeen at game start"
  );

  const arrakeenRegular = arrakeenStack?.forces.regular ?? 0;
  const arrakeenElite = arrakeenStack?.forces.elite ?? 0;

  assert(
    arrakeenRegular === 10 && arrakeenElite === 0,
    `Atreides has 10 regular forces and 0 elite forces in Arrakeen (actual: regular=${arrakeenRegular}, elite=${arrakeenElite})`
  );

  const reservesRegular = atreidesForces.reserves.regular;
  const reservesElite = atreidesForces.reserves.elite;

  assert(
    reservesRegular === 10 && reservesElite === 0,
    `Atreides has 10 regular forces and 0 elite forces in reserves (actual: regular=${reservesRegular}, elite=${reservesElite})`
  );

  // Guard: rule does not constrain other factions' starting forces, but they should be initialized
  const harkonnenForces = harkonnen!.forces;
  const totalHarkonnen =
    harkonnenForces.reserves.regular +
    harkonnenForces.reserves.elite +
    harkonnenForces.tanks.regular +
    harkonnenForces.tanks.elite +
    harkonnenForces.onBoard.reduce(
      (sum, stack) => sum + stack.forces.regular + stack.forces.elite,
      0
    );

  assert(
    totalHarkonnen === 20,
    `Harkonnen has all 20 forces accounted for (actual: ${totalHarkonnen})`
  );
}

function testAtreidesStartingForces_advancedRules(): void {
  section("2.01.02 - Atreides starting forces (advanced rules)");

  const state = buildBaseState(true);
  const atreides = state.factions.get(Faction.ATREIDES);

  assert(!!atreides, "Atreides faction state exists");

  const atreidesForces = atreides!.forces;

  const arrakeenStack = atreidesForces.onBoard.find(
    (stack) => stack.territoryId === TerritoryId.ARRAKEEN
  );

  assert(
    !!arrakeenStack,
    "Atreides has a force stack in Arrakeen at game start with advanced rules"
  );

  const arrakeenRegular = arrakeenStack?.forces.regular ?? 0;
  const arrakeenElite = arrakeenStack?.forces.elite ?? 0;

  assert(
    arrakeenRegular === 10 && arrakeenElite === 0,
    `Atreides still has 10 regular forces and 0 elite forces in Arrakeen with advanced rules (actual: regular=${arrakeenRegular}, elite=${arrakeenElite})`
  );

  const reservesRegular = atreidesForces.reserves.regular;
  const reservesElite = atreidesForces.reserves.elite;

  assert(
    reservesRegular === 10 && reservesElite === 0,
    `Atreides still has 10 regular forces and 0 elite forces in reserves with advanced rules (actual: regular=${reservesRegular}, elite=${reservesElite})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.02 ATREIDES STARTING FORCES");
  console.log("=".repeat(80));

  try {
    testAtreidesStartingForces_basicRules();
  } catch (error) {
    console.error(
      "❌ testAtreidesStartingForces_basicRules failed:",
      error
    );
    failCount++;
  }

  try {
    testAtreidesStartingForces_advancedRules();
  } catch (error) {
    console.error(
      "❌ testAtreidesStartingForces_advancedRules failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.02 tests completed: ${passCount} passed, ${failCount} failed`
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


