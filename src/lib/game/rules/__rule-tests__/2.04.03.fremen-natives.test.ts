/**
 * Rule test: 2.04.03 FREMEN NATIVES
 * @rule-test 2.04.03
 *
 * Rule text (numbered_rules/2.md):
 * "2.04.03 NATIVES: Your Reserves are in a Territory on the far side of Dune (in front of your shield, off the board). Unlike other factions you do not have Off-Planet Reserves and can not ship with the normal Shipping method."
 *
 * This rule ensures that Fremen cannot use normal shipment (must use special fremen_send_forces).
 * Implemented in validateShipment() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.04.03.fremen-natives.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state";
import { validateShipment } from "../../rules/movement/shipment/validate-shipment";

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
// Tests for 2.04.03
// =============================================================================

function testNatives_cannotUseNormalShipment(): void {
  section("2.04.03 - Fremen cannot use normal shipment");

  const state = buildBaseState();
  
  // Try to validate a normal shipment for Fremen
  const validation = validateShipment(state, Faction.FREMEN, TerritoryId.ARRAKEEN, 9, 5);

  assert(validation.valid === false, "validation rejects normal shipment for Fremen");
  assert(
    validation.errors.some((e) => e.code === "CANNOT_SHIP_FROM_BOARD"),
    `validation error code is CANNOT_SHIP_FROM_BOARD (actual: ${validation.errors[0]?.code})`
  );
  assert(
    validation.errors[0]?.message.includes("Fremen cannot use normal shipment") ||
    validation.errors[0]?.message.includes("fremen_send_forces"),
    `validation error message mentions Fremen cannot use normal shipment or fremen_send_forces (actual: ${validation.errors[0]?.message})`
  );
}

function testNatives_otherFactionsCanUseNormalShipment(): void {
  section("2.04.03 - other factions can still use normal shipment");

  const state = buildBaseState();
  
  // Try to validate a normal shipment for Atreides (should be valid if they have forces)
  const validation = validateShipment(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  // Should not have the CANNOT_SHIP_FROM_BOARD error (might have other errors like insufficient forces, but not the Fremen-specific one)
  assert(
    !validation.errors.some((e) => e.code === "CANNOT_SHIP_FROM_BOARD"),
    "validation does NOT reject normal shipment for Atreides (no CANNOT_SHIP_FROM_BOARD error)"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.03 FREMEN NATIVES");
  console.log("=".repeat(80));

  try {
    testNatives_cannotUseNormalShipment();
  } catch (error) {
    console.error("❌ testNatives_cannotUseNormalShipment failed:", error);
    failCount++;
  }

  try {
    testNatives_otherFactionsCanUseNormalShipment();
  } catch (error) {
    console.error("❌ testNatives_otherFactionsCanUseNormalShipment failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.04.03 tests completed: ${passCount} passed, ${failCount} failed`
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

