/**
 * Rule test: 2.02.09 BENE GESSERIT CHARITY
 * @rule-test 2.02.09
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.09 CHARITY: You always receive CHOAM Charity of at least 2 spice regardless of how much spice you already have.✷"
 *
 * This rule overrides the standard CHOAM Charity eligibility (1.03.01) for Bene Gesserit in Advanced Rules.
 * Standard rules: Only factions with 0 or 1 spice are eligible.
 * Bene Gesserit (Advanced): Always eligible, always receives at least 2 spice.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.09.bg-charity.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import {
  isEligibleForCharity,
  calculateCharityAmount,
  getCharityAmount,
  getEligibleFactions,
} from "../../rules/choam-charity";

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
// Tests for 2.02.09
// =============================================================================

function testBGCharity_AlwaysEligibleInAdvancedRules(): void {
  section("2.02.09 - Bene Gesserit is always eligible in Advanced Rules regardless of spice");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Test with various spice amounts (0, 1, 2, 5, 10)
  const testCases = [0, 1, 2, 5, 10];
  for (const spice of testCases) {
    const testState = setFactionSpice(state, Faction.BENE_GESSERIT, spice);
    const eligibility = isEligibleForCharity(testState, Faction.BENE_GESSERIT);
    assert(
      eligibility.isEligible === true,
      `Bene Gesserit with ${spice} spice is eligible (Advanced Rules)`
    );
    assert(
      eligibility.reason.includes("Bene Gesserit (Advanced)"),
      `eligibility reason mentions Bene Gesserit Advanced (actual: ${eligibility.reason})`
    );
  }
}

function testBGCharity_NotSpecialInBasicRules(): void {
  section("2.02.09 - Bene Gesserit follows standard rules in Basic Rules (ability not active)");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: false, // Basic rules
  });

  // With 0 spice: eligible (standard rule)
  const state0 = setFactionSpice(state, Faction.BENE_GESSERIT, 0);
  const eligibility0 = isEligibleForCharity(state0, Faction.BENE_GESSERIT);
  assert(
    eligibility0.isEligible === true,
    "Bene Gesserit with 0 spice is eligible (Basic Rules - standard rule)"
  );

  // With 1 spice: eligible (standard rule)
  const state1 = setFactionSpice(state, Faction.BENE_GESSERIT, 1);
  const eligibility1 = isEligibleForCharity(state1, Faction.BENE_GESSERIT);
  assert(
    eligibility1.isEligible === true,
    "Bene Gesserit with 1 spice is eligible (Basic Rules - standard rule)"
  );

  // With 2+ spice: NOT eligible (standard rule - ability not active in Basic)
  const state2 = setFactionSpice(state, Faction.BENE_GESSERIT, 2);
  const eligibility2 = isEligibleForCharity(state2, Faction.BENE_GESSERIT);
  assert(
    eligibility2.isEligible === false,
    "Bene Gesserit with 2 spice is NOT eligible (Basic Rules - standard rule)"
  );
}

function testBGCharity_AlwaysReceivesAtLeast2Spice(): void {
  section("2.02.09 - Bene Gesserit always receives at least 2 spice in Advanced Rules");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Test with various spice amounts
  const testCases = [
    { current: 0, expected: 2 },
    { current: 1, expected: 2 },
    { current: 2, expected: 2 },
    { current: 5, expected: 2 },
    { current: 10, expected: 2 },
  ];

  for (const { current, expected } of testCases) {
    const amount = calculateCharityAmount(state, Faction.BENE_GESSERIT, current);
    assert(
      amount === expected,
      `Bene Gesserit with ${current} spice receives ${expected} spice (actual: ${amount})`
    );

    // Also test getCharityAmount (wrapper function)
    const amountViaGet = getCharityAmount(state, Faction.BENE_GESSERIT, current);
    assert(
      amountViaGet === expected,
      `getCharityAmount returns ${expected} for BG with ${current} spice (actual: ${amountViaGet})`
    );
  }
}

function testBGCharity_StandardAmountInBasicRules(): void {
  section("2.02.09 - Bene Gesserit receives standard amount in Basic Rules");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.HARKONNEN],
    advancedRules: false, // Basic rules
  });

  // With 0 spice: receives 2 (standard)
  const amount0 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 0);
  assert(amount0 === 2, "Bene Gesserit with 0 spice receives 2 spice (Basic Rules - standard)");

  // With 1 spice: receives 1 (standard)
  const amount1 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 1);
  assert(amount1 === 1, "Bene Gesserit with 1 spice receives 1 spice (Basic Rules - standard)");

  // With 2+ spice: receives 0 (standard - not eligible)
  const amount2 = calculateCharityAmount(state, Faction.BENE_GESSERIT, 2);
  assert(amount2 === 0, "Bene Gesserit with 2 spice receives 0 spice (Basic Rules - not eligible)");
}

function testBGCharity_AppearsInEligibleFactionsList(): void {
  section("2.02.09 - Bene Gesserit appears in eligible factions list regardless of spice (Advanced)");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Set BG to 10 spice (normally not eligible)
  const stateWithHighSpice = setFactionSpice(state, Faction.BENE_GESSERIT, 10);
  // Set Atreides to 0 spice (eligible)
  const stateWithEligible = setFactionSpice(stateWithHighSpice, Faction.ATREIDES, 0);
  // Set Harkonnen to 5 spice (not eligible)
  const finalState = setFactionSpice(stateWithEligible, Faction.HARKONNEN, 5);

  const eligible = getEligibleFactions(finalState);

  assert(
    eligible.includes(Faction.BENE_GESSERIT),
    "Bene Gesserit with 10 spice appears in eligible factions list (Advanced Rules)"
  );
  assert(
    eligible.includes(Faction.ATREIDES),
    "Atreides with 0 spice appears in eligible factions list (standard rule)"
  );
  assert(
    !eligible.includes(Faction.HARKONNEN),
    "Harkonnen with 5 spice does NOT appear in eligible factions list"
  );
  assert(eligible.length === 2, `exactly 2 factions are eligible (actual: ${eligible.length})`);
}

function testBGCharity_OnlyBGGetsSpecialTreatment(): void {
  section("2.02.09 - Only Bene Gesserit gets special treatment, other factions follow standard rules");

  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Set all factions to 5 spice
  let testState = setFactionSpice(state, Faction.BENE_GESSERIT, 5);
  testState = setFactionSpice(testState, Faction.ATREIDES, 5);
  testState = setFactionSpice(testState, Faction.HARKONNEN, 5);

  const bgEligibility = isEligibleForCharity(testState, Faction.BENE_GESSERIT);
  const atreidesEligibility = isEligibleForCharity(testState, Faction.ATREIDES);
  const harkonnenEligibility = isEligibleForCharity(testState, Faction.HARKONNEN);

  assert(
    bgEligibility.isEligible === true,
    "Bene Gesserit with 5 spice is eligible (Advanced Rules - special ability)"
  );
  assert(
    atreidesEligibility.isEligible === false,
    "Atreides with 5 spice is NOT eligible (standard rule)"
  );
  assert(
    harkonnenEligibility.isEligible === false,
    "Harkonnen with 5 spice is NOT eligible (standard rule)"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.09 BENE GESSERIT CHARITY");
  console.log("=".repeat(80));

  try {
    testBGCharity_AlwaysEligibleInAdvancedRules();
  } catch (error) {
    console.error("❌ testBGCharity_AlwaysEligibleInAdvancedRules failed:", error);
    failCount++;
  }

  try {
    testBGCharity_NotSpecialInBasicRules();
  } catch (error) {
    console.error("❌ testBGCharity_NotSpecialInBasicRules failed:", error);
    failCount++;
  }

  try {
    testBGCharity_AlwaysReceivesAtLeast2Spice();
  } catch (error) {
    console.error("❌ testBGCharity_AlwaysReceivesAtLeast2Spice failed:", error);
    failCount++;
  }

  try {
    testBGCharity_StandardAmountInBasicRules();
  } catch (error) {
    console.error("❌ testBGCharity_StandardAmountInBasicRules failed:", error);
    failCount++;
  }

  try {
    testBGCharity_AppearsInEligibleFactionsList();
  } catch (error) {
    console.error("❌ testBGCharity_AppearsInEligibleFactionsList failed:", error);
    failCount++;
  }

  try {
    testBGCharity_OnlyBGGetsSpecialTreatment();
  } catch (error) {
    console.error("❌ testBGCharity_OnlyBGGetsSpecialTreatment failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.09 tests completed: ${passCount} passed, ${failCount} failed`
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

