/**
 * Rule tests: 2.03.01, 2.03.02, 2.03.03 (Emperor Starting Resources & Free Revival)
 *
 * @rule-test 2.03.01
 * @rule-test 2.03.02
 * @rule-test 2.03.03
 *
 * Rule text (numbered_rules/2.md):
 * 2.03.01 Starting Spice [0.12]: Put 10 spice behind your shield from the bank.
 * 2.03.02 Starting Forces [0.13]: Place 20 Forces in reserves (off-planet).
 * 2.03.03 FREE REVIVAL: 1 Force.
 *
 * These tests verify that:
 * - Emperor starts with 10 spice.
 * - Emperor starts with 20 forces in reserves.
 * - Emperor has a free revival limit of 1 force.
 * - These values are consistent across basic and advanced rules (where applicable).
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getRevivalLimits } from "../../rules/revival";

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

function buildBaseState(advancedRules: boolean = false): GameState {
  return createGameState({
    factions: [Faction.EMPEROR, Faction.ATREIDES],
    advancedRules,
  });
}

// =============================================================================
// Tests for 2.03.01, 2.03.02
// =============================================================================

function testEmperorStartingResources_basicRules(): void {
  section("2.03.01/02 - Emperor starting spice and forces (basic rules)");
  const state = buildBaseState(false);
  const emperor = getFactionState(state, Faction.EMPEROR);
  const atreides = getFactionState(state, Faction.ATREIDES);

  assert(emperor !== undefined, "Emperor faction state exists");
  assert(atreides !== undefined, "Atreides faction state exists"); // For comparison

  assert(emperor.spice === 10, `Emperor starts with 10 spice (actual: ${emperor.spice})`);

  assert(
    emperor.forces.reserves.regular === 20 && emperor.forces.reserves.elite === 0,
    `Emperor has 20 regular forces and 0 elite forces in reserves (actual: regular=${emperor.forces.reserves.regular}, elite=${emperor.forces.reserves.elite})`
  );
  assert(
    emperor.forces.onBoard.length === 0,
    `Emperor has no forces on board at game start (actual: ${emperor.forces.onBoard.length})`
  );
}

function testEmperorStartingResources_advancedRules(): void {
  section("2.03.01/02 - Emperor starting spice and forces (advanced rules)");
  const state = buildBaseState(true);
  const emperor = getFactionState(state, Faction.EMPEROR);

  assert(emperor !== undefined, "Emperor faction state exists");
  assert(emperor.spice === 10, `Emperor starting spice remains 10 with advanced rules (actual: ${emperor.spice})`);

  assert(
    emperor.forces.reserves.regular === 20 && emperor.forces.reserves.elite === 0,
    `Emperor still has 20 regular forces and 0 elite forces in reserves with advanced rules (actual: regular=${emperor.forces.reserves.regular}, elite=${emperor.forces.reserves.elite})`
  );
}

// =============================================================================
// Tests for 2.03.03
// =============================================================================

function testEmperorFreeRevival(): void {
  section("2.03.03 - Emperor free revival is 1 force");
  const state = buildBaseState(false);
  const limits = getRevivalLimits(state, Faction.EMPEROR);
  assert(limits.freeForces === 1, `Emperor free revival is 1 force in basic rules (actual: ${limits.freeForces})`);

  const advancedState = buildBaseState(true);
  const advancedLimits = getRevivalLimits(advancedState, Faction.EMPEROR);
  assert(advancedLimits.freeForces === 1, `Emperor free revival remains 1 force with advanced rules (actual: ${advancedLimits.freeForces})`);
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.03.01, 2.03.02, 2.03.03 EMPEROR STARTING RESOURCES & FREE REVIVAL");
  console.log("=".repeat(80));

  try {
    testEmperorStartingResources_basicRules();
  } catch (error) {
    console.error("❌ testEmperorStartingResources_basicRules failed:", error);
    failCount++;
  }

  try {
    testEmperorStartingResources_advancedRules();
  } catch (error) {
    console.error("❌ testEmperorStartingResources_advancedRules failed:", error);
    failCount++;
  }

  try {
    testEmperorFreeRevival();
  } catch (error) {
    console.error("❌ testEmperorFreeRevival failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.03.01/02/03 tests completed: ${passCount} passed, ${failCount} failed`
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

