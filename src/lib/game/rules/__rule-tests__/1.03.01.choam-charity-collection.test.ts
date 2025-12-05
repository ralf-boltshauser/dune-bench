/**
 * Rule test: 1.03.01 COLLECTING CHOAM CHARITY
 * @rule-test 1.03.01
 *
 * Rule text (numbered_rules/1.md):
 * "All players with 0 or 1 spice can collect spice from the bank to bring their total to 2 by calling out 'CHOAM Charity'."
 *
 * These tests exercise the core behavior of CHOAM Charity:
 * - Eligibility check (0 or 1 spice)
 * - Amount calculation (0 spice → 2 spice, 1 spice → 1 spice)
 * - Bene Gesserit advanced ability (always receives at least 2 spice)
 * - State updates (spice added to faction)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.03.01.choam-charity-collection.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import {
  isEligibleForCharity,
  calculateCharityAmount,
  getEligibleFactions,
} from "../choam-charity";
import { getFactionState } from "../../state";

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
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });
}

function setFactionSpice(state: GameState, faction: Faction, spice: number): GameState {
  const factionState = getFactionState(state, faction);
  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      spice,
    }),
  };
}

// =============================================================================
// Tests for 1.03.01
// =============================================================================

function testEligibility_0SpiceIsEligible(): void {
  section("1.03.01 - eligibility: 0 spice is eligible");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 0);
  const eligibility = isEligibleForCharity(state, Faction.ATREIDES);

  assert(eligibility.isEligible === true, "faction with 0 spice is eligible");
  assert(
    eligibility.reason.includes("0 spice"),
    "eligibility reason mentions 0 spice"
  );
}

function testEligibility_1SpiceIsEligible(): void {
  section("1.03.01 - eligibility: 1 spice is eligible");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 1);
  const eligibility = isEligibleForCharity(state, Faction.ATREIDES);

  assert(eligibility.isEligible === true, "faction with 1 spice is eligible");
  assert(
    eligibility.reason.includes("1 spice"),
    "eligibility reason mentions 1 spice"
  );
}

function testEligibility_2OrMoreSpiceIsNotEligible(): void {
  section("1.03.01 - eligibility: 2+ spice is NOT eligible");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 2);
  const eligibility = isEligibleForCharity(state, Faction.ATREIDES);

  assert(
    eligibility.isEligible === false,
    "faction with 2 spice is NOT eligible"
  );
  assert(
    eligibility.reason.includes("not eligible"),
    "eligibility reason indicates not eligible"
  );
}

function testAmountCalculation_0SpiceReceives2(): void {
  section("1.03.01 - amount calculation: 0 spice → receives 2 spice");

  const state = buildBaseState();
  const amount = calculateCharityAmount(state, Faction.ATREIDES, 0);

  assert(amount === 2, "faction with 0 spice receives 2 spice");
}

function testAmountCalculation_1SpiceReceives1(): void {
  section("1.03.01 - amount calculation: 1 spice → receives 1 spice");

  const state = buildBaseState();
  const amount = calculateCharityAmount(state, Faction.ATREIDES, 1);

  assert(amount === 1, "faction with 1 spice receives 1 spice");
}

function testAmountCalculation_2OrMoreSpiceReceives0(): void {
  section("1.03.01 - amount calculation: 2+ spice → receives 0 spice");

  const state = buildBaseState();
  const amount2 = calculateCharityAmount(state, Faction.ATREIDES, 2);
  const amount5 = calculateCharityAmount(state, Faction.ATREIDES, 5);

  assert(amount2 === 0, "faction with 2 spice receives 0 spice");
  assert(amount5 === 0, "faction with 5 spice receives 0 spice");
}

function testBeneGesseritAdvanced_AlwaysEligible(): void {
  section("1.03.01 - Bene Gesserit (Advanced): always eligible regardless of spice");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Test with various spice amounts
  const state0 = setFactionSpice(state, Faction.BENE_GESSERIT, 0);
  const state1 = setFactionSpice(state, Faction.BENE_GESSERIT, 1);
  const state2 = setFactionSpice(state, Faction.BENE_GESSERIT, 2);
  const state5 = setFactionSpice(state, Faction.BENE_GESSERIT, 5);

  assert(
    isEligibleForCharity(state0, Faction.BENE_GESSERIT).isEligible === true,
    "Bene Gesserit with 0 spice is eligible (Advanced)"
  );
  assert(
    isEligibleForCharity(state1, Faction.BENE_GESSERIT).isEligible === true,
    "Bene Gesserit with 1 spice is eligible (Advanced)"
  );
  assert(
    isEligibleForCharity(state2, Faction.BENE_GESSERIT).isEligible === true,
    "Bene Gesserit with 2 spice is eligible (Advanced)"
  );
  assert(
    isEligibleForCharity(state5, Faction.BENE_GESSERIT).isEligible === true,
    "Bene Gesserit with 5 spice is eligible (Advanced)"
  );
}

function testBeneGesseritAdvanced_AlwaysReceives2(): void {
  section("1.03.01 - Bene Gesserit (Advanced): always receives at least 2 spice");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Test with various spice amounts - all should receive 2 spice
  const amount0 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 0);
  const amount1 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 1);
  const amount2 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 2);
  const amount5 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 5);

  assert(amount0 === 2, "Bene Gesserit with 0 spice receives 2 spice (Advanced)");
  assert(amount1 === 2, "Bene Gesserit with 1 spice receives 2 spice (Advanced)");
  assert(amount2 === 2, "Bene Gesserit with 2 spice receives 2 spice (Advanced)");
  assert(amount5 === 2, "Bene Gesserit with 5 spice receives 2 spice (Advanced)");
}

function testBeneGesseritBasic_NotSpecial(): void {
  section("1.03.01 - Bene Gesserit (Basic): follows standard rules");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: false,
  });

  const state0 = setFactionSpice(state, Faction.BENE_GESSERIT, 0);
  const state2 = setFactionSpice(state, Faction.BENE_GESSERIT, 2);

  assert(
    isEligibleForCharity(state0, Faction.BENE_GESSERIT).isEligible === true,
    "Bene Gesserit with 0 spice is eligible (Basic)"
  );
  assert(
    isEligibleForCharity(state2, Faction.BENE_GESSERIT).isEligible === false,
    "Bene Gesserit with 2 spice is NOT eligible (Basic)"
  );

  const amount0 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 0);
  const amount2 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 2);

  assert(amount0 === 2, "Bene Gesserit with 0 spice receives 2 spice (Basic)");
  assert(amount2 === 0, "Bene Gesserit with 2 spice receives 0 spice (Basic)");
}

function testGetEligibleFactions_FiltersCorrectly(): void {
  section("1.03.01 - getEligibleFactions: returns only eligible factions");

  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
    advancedRules: false,
  });

  let testState = setFactionSpice(state, Faction.ATREIDES, 0);
  testState = setFactionSpice(testState, Faction.HARKONNEN, 1);
  testState = setFactionSpice(testState, Faction.FREMEN, 2);

  const eligible = getEligibleFactions(testState);

  assert(
    eligible.includes(Faction.ATREIDES),
    "Atreides with 0 spice is in eligible list"
  );
  assert(
    eligible.includes(Faction.HARKONNEN),
    "Harkonnen with 1 spice is in eligible list"
  );
  assert(
    !eligible.includes(Faction.FREMEN),
    "Fremen with 2 spice is NOT in eligible list"
  );
  assert(eligible.length === 2, "exactly 2 factions are eligible");
}

// =============================================================================
// Main
// =============================================================================

async function runAllTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.03.01 COLLECTING CHOAM CHARITY");
  console.log("=".repeat(80));

  try {
    testEligibility_0SpiceIsEligible();
  } catch (error) {
    console.error("❌ testEligibility_0SpiceIsEligible failed:", error);
    failCount++;
  }

  try {
    testEligibility_1SpiceIsEligible();
  } catch (error) {
    console.error("❌ testEligibility_1SpiceIsEligible failed:", error);
    failCount++;
  }

  try {
    testEligibility_2OrMoreSpiceIsNotEligible();
  } catch (error) {
    console.error("❌ testEligibility_2OrMoreSpiceIsNotEligible failed:", error);
    failCount++;
  }

  try {
    testAmountCalculation_0SpiceReceives2();
  } catch (error) {
    console.error("❌ testAmountCalculation_0SpiceReceives2 failed:", error);
    failCount++;
  }

  try {
    testAmountCalculation_1SpiceReceives1();
  } catch (error) {
    console.error("❌ testAmountCalculation_1SpiceReceives1 failed:", error);
    failCount++;
  }

  try {
    testAmountCalculation_2OrMoreSpiceReceives0();
  } catch (error) {
    console.error("❌ testAmountCalculation_2OrMoreSpiceReceives0 failed:", error);
    failCount++;
  }

  try {
    testBeneGesseritAdvanced_AlwaysEligible();
  } catch (error) {
    console.error("❌ testBeneGesseritAdvanced_AlwaysEligible failed:", error);
    failCount++;
  }

  try {
    testBeneGesseritAdvanced_AlwaysReceives2();
  } catch (error) {
    console.error("❌ testBeneGesseritAdvanced_AlwaysReceives2 failed:", error);
    failCount++;
  }

  try {
    testBeneGesseritBasic_NotSpecial();
  } catch (error) {
    console.error("❌ testBeneGesseritBasic_NotSpecial failed:", error);
    failCount++;
  }

  try {
    testGetEligibleFactions_FiltersCorrectly();
  } catch (error) {
    console.error("❌ testGetEligibleFactions_FiltersCorrectly failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.03.01 tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runAllTests();
}

export async function runRuleTests() {
  await runAllTests();
}

