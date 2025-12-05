/**
 * Rule test: 2.03.04 EMPEROR PAYMENT FOR TREACHERY
 * @rule-test 2.03.04
 *
 * Rule text (numbered_rules/2.md):
 * "2.03.04 PAYMENT FOR TREACHERY: During Buying A Card [1.04.06.02], when any other faction pays spice for a Treachery Card, they pay it to you instead of the Spice Bank.✷"
 *
 * This rule ensures that when other factions buy cards, the spice goes to Emperor instead of the bank.
 * Implemented in payEmperor() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.03.04.emperor-payment-for-treachery.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState, getFactionState, removeSpice } from "../../state";
import { payEmperor } from "../../phases/handlers/bidding/emperor";

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
    factions: [Faction.EMPEROR, Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

// =============================================================================
// Tests for 2.03.04
// =============================================================================

function testPaymentForTreachery_otherFactionPaysEmperor(): void {
  section("2.03.04 - other faction pays Emperor when buying card");

  let state = buildBaseState();
  const emperorBefore = getFactionState(state, Faction.EMPEROR);
  const atreidesBefore = getFactionState(state, Faction.ATREIDES);

  // Atreides pays 5 spice for a card
  state = removeSpice(state, Faction.ATREIDES, 5);
  state = payEmperor(state, Faction.ATREIDES, 5);

  const emperorAfter = getFactionState(state, Faction.EMPEROR);
  const atreidesAfter = getFactionState(state, Faction.ATREIDES);

  assert(
    emperorAfter.spice === emperorBefore.spice + 5,
    `Emperor receives 5 spice (before: ${emperorBefore.spice}, after: ${emperorAfter.spice})`
  );
  assert(
    atreidesAfter.spice === atreidesBefore.spice - 5,
    `Atreides pays 5 spice (before: ${atreidesBefore.spice}, after: ${atreidesAfter.spice})`
  );
}

function testPaymentForTreachery_emperorDoesNotPayHimself(): void {
  section("2.03.04 - Emperor does not pay himself when buying card");

  let state = buildBaseState();
  const emperorBefore = getFactionState(state, Faction.EMPEROR);

  // Emperor pays 5 spice for a card
  state = removeSpice(state, Faction.EMPEROR, 5);
  state = payEmperor(state, Faction.EMPEROR, 5);

  const emperorAfter = getFactionState(state, Faction.EMPEROR);

  assert(
    emperorAfter.spice === emperorBefore.spice - 5,
    `Emperor pays 5 spice to bank (does not pay himself, before: ${emperorBefore.spice}, after: ${emperorAfter.spice})`
  );
}

function testPaymentForTreachery_noPaymentWhenEmperorNotInGame(): void {
  section("2.03.04 - no payment to Emperor when Emperor not in game");

  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN], // No Emperor
    advancedRules: true,
  });
  const atreidesBefore = getFactionState(state, Faction.ATREIDES);

  // Atreides pays 5 spice for a card
  state = removeSpice(state, Faction.ATREIDES, 5);
  state = payEmperor(state, Faction.ATREIDES, 5);

  const atreidesAfter = getFactionState(state, Faction.ATREIDES);

  assert(
    atreidesAfter.spice === atreidesBefore.spice - 5,
    `Atreides pays 5 spice to bank (Emperor not in game, before: ${atreidesBefore.spice}, after: ${atreidesAfter.spice})`
  );
  assert(
    !state.factions.has(Faction.EMPEROR),
    "Emperor is not in game"
  );
}

function testPaymentForTreachery_multipleFactionsPayEmperor(): void {
  section("2.03.04 - multiple factions can pay Emperor");

  let state = buildBaseState();
  const emperorBefore = getFactionState(state, Faction.EMPEROR);

  // Atreides pays 3 spice
  state = removeSpice(state, Faction.ATREIDES, 3);
  state = payEmperor(state, Faction.ATREIDES, 3);

  // Harkonnen pays 7 spice
  state = removeSpice(state, Faction.HARKONNEN, 7);
  state = payEmperor(state, Faction.HARKONNEN, 7);

  const emperorAfter = getFactionState(state, Faction.EMPEROR);

  assert(
    emperorAfter.spice === emperorBefore.spice + 10,
    `Emperor receives total of 10 spice from multiple factions (before: ${emperorBefore.spice}, after: ${emperorAfter.spice})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.03.04 EMPEROR PAYMENT FOR TREACHERY");
  console.log("=".repeat(80));

  try {
    testPaymentForTreachery_otherFactionPaysEmperor();
  } catch (error) {
    console.error("❌ testPaymentForTreachery_otherFactionPaysEmperor failed:", error);
    failCount++;
  }

  try {
    testPaymentForTreachery_emperorDoesNotPayHimself();
  } catch (error) {
    console.error("❌ testPaymentForTreachery_emperorDoesNotPayHimself failed:", error);
    failCount++;
  }

  try {
    testPaymentForTreachery_noPaymentWhenEmperorNotInGame();
  } catch (error) {
    console.error("❌ testPaymentForTreachery_noPaymentWhenEmperorNotInGame failed:", error);
    failCount++;
  }

  try {
    testPaymentForTreachery_multipleFactionsPayEmperor();
  } catch (error) {
    console.error("❌ testPaymentForTreachery_multipleFactionsPayEmperor failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.03.04 tests completed: ${passCount} passed, ${failCount} failed`
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

