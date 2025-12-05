/**
 * Rule test: 2.04.06 FREMEN MOVEMENT
 * @rule-test 2.04.06
 *
 * Rule text (numbered_rules/2.md):
 * "2.04.06 MOVEMENT: During movement you may Move your Forces two territories instead of one.✷"
 *
 * This rule allows Fremen to move 2 territories instead of 1 (without ornithopters).
 * Implemented in RequestBuilder.getMovementRange() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.04.06.fremen-movement.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state";
import { RequestBuilder } from "../../phases/handlers/shipment-movement/builders/request-builders";

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

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// Tests for 2.04.06
// =============================================================================

function testFremenMovement_baseRangeIs2(): void {
  section("2.04.06 - Fremen base movement range is 2 territories (without ornithopters)");

  const builder = new RequestBuilder();
  
  // Fremen without ornithopters
  const range = builder.getMovementRange(Faction.FREMEN, false);
  
  assert(range === 2, `Fremen movement range is 2 without ornithopters (actual: ${range})`);
}

function testFremenMovement_withOrnithoptersIs3(): void {
  section("2.04.06 - Fremen with ornithopters gets 3 territories");

  const builder = new RequestBuilder();
  
  // Fremen with ornithopters
  const range = builder.getMovementRange(Faction.FREMEN, true);
  
  assert(range === 3, `Fremen movement range is 3 with ornithopters (actual: ${range})`);
}

function testFremenMovement_otherFactionsGet1(): void {
  section("2.04.06 - other factions get 1 territory without ornithopters");

  const builder = new RequestBuilder();
  
  // Atreides without ornithopters
  const range = builder.getMovementRange(Faction.ATREIDES, false);
  
  assert(range === 1, `Atreides movement range is 1 without ornithopters (actual: ${range})`);
}

function testFremenMovement_otherFactionsWithOrnithoptersGet3(): void {
  section("2.04.06 - other factions with ornithopters get 3 territories");

  const builder = new RequestBuilder();
  
  // Atreides with ornithopters
  const range = builder.getMovementRange(Faction.ATREIDES, true);
  
  assert(range === 3, `Atreides movement range is 3 with ornithopters (actual: ${range})`);
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.06 FREMEN MOVEMENT");
  console.log("=".repeat(80));

  try {
    testFremenMovement_baseRangeIs2();
  } catch (error) {
    console.error("❌ testFremenMovement_baseRangeIs2 failed:", error);
    failCount++;
  }

  try {
    testFremenMovement_withOrnithoptersIs3();
  } catch (error) {
    console.error("❌ testFremenMovement_withOrnithoptersIs3 failed:", error);
    failCount++;
  }

  try {
    testFremenMovement_otherFactionsGet1();
  } catch (error) {
    console.error("❌ testFremenMovement_otherFactionsGet1 failed:", error);
    failCount++;
  }

  try {
    testFremenMovement_otherFactionsWithOrnithoptersGet3();
  } catch (error) {
    console.error("❌ testFremenMovement_otherFactionsWithOrnithoptersGet3 failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.04.06 tests completed: ${passCount} passed, ${failCount} failed`
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

