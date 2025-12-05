/**
 * Rule test: 2.04.21 BATTLE HARDENED
 * @rule-test 2.04.21
 *
 * Rule text (numbered_rules/2.md):
 * "2.04.21 ✷BATTLE HARDENED: Your Forces do not require spice to count at full strength in battles."
 *
 * These tests verify:
 * - Fremen forces count at full strength without spice payment in advanced rules
 * - This applies to both regular and elite (Fedaykin) forces
 * - Other factions still require spice for full strength
 * - Only applies in advanced rules (spice dialing is advanced rules only)
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { calculateSpicedForceStrength } from "../../rules/combat/strength-calculation";

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
// 2.04.21 – BATTLE HARDENED: Fremen don't need spice for full strength
// =============================================================================

function testBattleHardened_FremenFullStrengthWithoutSpice(): void {
  section("2.04.21 - Fremen forces count at full strength without spice (advanced rules)");

  // Fremen with 10 forces, NO spice (advanced rules enabled)
  const fremenStrength = calculateSpicedForceStrength(
    Faction.FREMEN,
    10, // base strength (10 regular forces)
    10, // forces dialed
    0,  // NO spice paid
    true // advanced rules enabled
  );

  assert(
    fremenStrength === 10,
    `Fremen gets full strength (10) without spice payment (got ${fremenStrength})`
  );
}

function testBattleHardened_FremenEliteForcesFullStrength(): void {
  section("2.04.21 - Fremen elite forces (Fedaykin) count at full strength without spice");

  // Fremen with 10 Fedaykin (elite forces worth 2x = 20 base strength), NO spice
  const fremenElite = calculateSpicedForceStrength(
    Faction.FREMEN,
    20, // base strength (10 Fedaykin worth 2x = 20)
    10, // forces dialed
    0,  // NO spice paid
    true // advanced rules enabled
  );

  assert(
    fremenElite === 20,
    `Fremen elite forces get full strength (20) without spice payment (got ${fremenElite})`
  );
}

function testBattleHardened_OtherFactionsNeedSpice(): void {
  section("2.04.21 - Other factions still require spice for full strength");

  // Atreides with 10 forces, NO spice (should be half strength)
  const atreidesStrength = calculateSpicedForceStrength(
    Faction.ATREIDES,
    10, // base strength
    10, // forces dialed
    0,  // NO spice paid
    true // advanced rules enabled
  );

  assert(
    atreidesStrength === 5,
    `Atreides gets half strength (5) without spice payment (got ${atreidesStrength})`
  );

  // Atreides with 10 forces, 10 spice (full strength)
  const atreidesFullSpiced = calculateSpicedForceStrength(
    Faction.ATREIDES,
    10, // base strength
    10, // forces dialed
    10, // Full spice paid
    true // advanced rules enabled
  );

  assert(
    atreidesFullSpiced === 10,
    `Atreides gets full strength (10) with spice payment (got ${atreidesFullSpiced})`
  );
}

function testBattleHardened_OnlyAppliesInAdvancedRules(): void {
  section("2.04.21 - BATTLE HARDENED only relevant in advanced rules (spice dialing is advanced only)");

  // In basic rules, spice dialing doesn't apply, so all factions get full strength
  const basicRules = calculateSpicedForceStrength(
    Faction.ATREIDES,
    10, // base strength
    10, // forces dialed
    0,  // NO spice paid
    false // basic rules (no spice dialing)
  );

  assert(
    basicRules === 10,
    `In basic rules, all factions get full strength without spice (got ${basicRules})`
  );
}

function testBattleHardened_MixedSpicePayment(): void {
  section("2.04.21 - Fremen always gets full strength regardless of spice dialed");

  // Fremen with 10 forces, 5 spice (should still get full strength)
  const fremenWithSpice = calculateSpicedForceStrength(
    Faction.FREMEN,
    10, // base strength
    10, // forces dialed
    5,  // Some spice paid (but not needed)
    true // advanced rules enabled
  );

  assert(
    fremenWithSpice === 10,
    `Fremen gets full strength (10) even when spice is dialed (got ${fremenWithSpice})`
  );

  // Compare with Harkonnen: 10 forces, 5 spice (should be mixed: 5 spiced + 5 unspiced)
  const harkonnenMixed = calculateSpicedForceStrength(
    Faction.HARKONNEN,
    10, // base strength
    10, // forces dialed
    5,  // Half spice paid
    true // advanced rules enabled
  );

  assert(
    harkonnenMixed === 7.5,
    `Harkonnen gets mixed strength (7.5) with partial spice: 5 spiced at 1x + 5 unspiced at 0.5x (got ${harkonnenMixed})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.21 BATTLE HARDENED");
  console.log("=".repeat(80));

  try {
    testBattleHardened_FremenFullStrengthWithoutSpice();
    testBattleHardened_FremenEliteForcesFullStrength();
    testBattleHardened_OtherFactionsNeedSpice();
    testBattleHardened_OnlyAppliesInAdvancedRules();
    testBattleHardened_MixedSpicePayment();
  } catch (error) {
    console.error("Unexpected error during 2.04.21 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.04.21 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

