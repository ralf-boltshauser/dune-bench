/**
 * Rule test: 1.04.06.04 BID LIMIT
 * @rule-test 1.04.06.04
 *
 * Rule text (numbered_rules/1.md):
 * "Players may not bid more spice than they have."
 *
 * These tests exercise the core behavior of bid limit:
 * - Player cannot bid more than their spice
 * - Player can bid exactly their spice
 * - Player can bid less than their spice
 * - Karama exception (handled separately, not tested here)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.06.04.bid-limit.test.ts
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
// Tests for 1.04.06.04
// =============================================================================

function testBidLimit_CannotBidMoreThanSpice(): void {
  section("1.04.06.04 - cannot bid more than spice");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 5);

  // Bid of 6 when player has 5 is invalid
  const result = validateBid(state, Faction.ATREIDES, 6, 0, true);
  assert(
    result.valid === false,
    "bid of 6 when player has 5 spice is invalid"
  );
  assert(
    result.errors.some((e) => e.code === "BID_EXCEEDS_SPICE"),
    "error code is BID_EXCEEDS_SPICE"
  );
}

function testBidLimit_CanBidExactlySpice(): void {
  section("1.04.06.04 - can bid exactly spice amount");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 5);

  // Bid of 5 when player has 5 is valid
  const result = validateBid(state, Faction.ATREIDES, 5, 0, true);
  assert(
    result.valid === true,
    "bid of 5 when player has 5 spice is valid"
  );
}

function testBidLimit_CanBidLessThanSpice(): void {
  section("1.04.06.04 - can bid less than spice");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 5);

  // Bid of 3 when player has 5 is valid
  const result = validateBid(state, Faction.ATREIDES, 3, 0, true);
  assert(
    result.valid === true,
    "bid of 3 when player has 5 spice is valid"
  );
}

function testBidLimit_WithCurrentBid(): void {
  section("1.04.06.04 - bid limit applies with current bid");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 5);

  // Current bid is 3, player can bid up to 5
  const resultValid = validateBid(state, Faction.ATREIDES, 5, 3, false);
  assert(
    resultValid.valid === true,
    "bid of 5 (all spice) when current is 3 is valid"
  );

  // Current bid is 3, player cannot bid 6
  const resultInvalid = validateBid(state, Faction.ATREIDES, 6, 3, false);
  assert(
    resultInvalid.valid === false,
    "bid of 6 when player has 5 spice is invalid"
  );
}

function testBidLimit_ZeroSpice(): void {
  section("1.04.06.04 - player with 0 spice cannot bid");

  const state = setFactionSpice(buildBaseState(), Faction.ATREIDES, 0);

  // Player with 0 spice cannot bid 1
  const result = validateBid(state, Faction.ATREIDES, 1, 0, true);
  assert(
    result.valid === false,
    "bid of 1 when player has 0 spice is invalid"
  );
  assert(
    result.errors.some((e) => e.code === "BID_EXCEEDS_SPICE"),
    "error code is BID_EXCEEDS_SPICE for 0 spice"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.06.04 BID LIMIT tests...\n");

  testBidLimit_CannotBidMoreThanSpice();
  testBidLimit_CanBidExactlySpice();
  testBidLimit_CanBidLessThanSpice();
  testBidLimit_WithCurrentBid();
  testBidLimit_ZeroSpice();

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

