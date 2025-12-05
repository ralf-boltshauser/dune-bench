/**
 * Rule test: 1.04.06.02 FIRST BID REQUIREMENT
 * @rule-test 1.04.06.02
 *
 * Rule text (numbered_rules/1.md):
 * "The player who bids first must bid 1 spice or more otherwise they must pass. Bidding then proceeds to the bidder's immediate right. The next bidder may raise the bid or pass, this continues around the table until a top bid is made and all other players have passed."
 *
 * These tests exercise the core behavior of first bid requirement:
 * - First bid must be at least 1 spice
 * - Bid of 0 is invalid
 * - Subsequent bids must be higher than current bid
 * - Players can pass instead of bidding
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.06.02.first-bid.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateBid } from "../../rules/bidding";

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
// Tests for 1.04.06.02
// =============================================================================

function testFirstBid_MustBeAtLeast1(): void {
  section("1.04.06.02 - first bid must be at least 1 spice");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 5);

  // Opening bid of 1 is valid
  const result1 = validateBid(state, Faction.ATREIDES, 1, 0, true);
  assert(
    result1.valid === true,
    "opening bid of 1 spice is valid"
  );

  // Opening bid of 0 is invalid
  const result0 = validateBid(state, Faction.ATREIDES, 0, 0, true);
  assert(
    result0.valid === false,
    "opening bid of 0 spice is invalid"
  );
  assert(
    result0.errors && result0.errors.some((e) => e.code === "BID_TOO_LOW"),
    "error code is BID_TOO_LOW for bid of 0"
  );
}

function testFirstBid_CanBeMoreThan1(): void {
  section("1.04.06.02 - first bid can be more than 1");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 5);

  // Opening bid of 3 is valid
  const result = validateBid(state, Faction.ATREIDES, 3, 0, true);
  assert(
    result.valid === true,
    "opening bid of 3 spice is valid"
  );
}

function testSubsequentBid_MustBeHigher(): void {
  section("1.04.06.02 - subsequent bid must be higher than current");

  const state = setFactionSpice(buildBaseState(), Faction.HARKONNEN, 5);

  // Current bid is 2, bid of 3 is valid
  const resultValid = validateBid(state, Faction.HARKONNEN, 3, 2, false);
  assert(
    resultValid.valid === true,
    "bid of 3 when current is 2 is valid"
  );

  // Current bid is 2, bid of 2 is invalid (must be higher)
  const resultEqual = validateBid(state, Faction.HARKONNEN, 2, 2, false);
  assert(
    resultEqual.valid === false,
    "bid equal to current bid is invalid"
  );

  // Current bid is 2, bid of 1 is invalid (must be higher)
  const resultLower = validateBid(state, Faction.HARKONNEN, 1, 2, false);
  assert(
    resultLower.valid === false,
    "bid lower than current bid is invalid"
  );
}

function testBid_CanPassInstead(): void {
  section("1.04.06.02 - players can pass instead of bidding");

  // Passing is handled at a higher level (agent response), not in validateBid
  // But we can verify that a valid bid is still possible when player has spice
  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 1);

  // Player can bid 1 (minimum)
  const result = validateBid(state, Faction.ATREIDES, 1, 0, true);
  assert(
    result.valid === true,
    "player with 1 spice can bid 1 (or pass)"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.06.02 FIRST BID REQUIREMENT tests...\n");

  testFirstBid_MustBeAtLeast1();
  testFirstBid_CanBeMoreThan1();
  testSubsequentBid_MustBeHigher();
  testBid_CanPassInstead();

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total:  ${passCount + failCount}`);
  console.log("=".repeat(50) + "\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests();

