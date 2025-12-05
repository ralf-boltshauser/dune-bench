/**
 * Rule tests: 2.01.14–2.01.15 (Reawaken & Ascension)
 *
 * @rule-test 2.01.14
 * @rule-test 2.01.15
 *
 * Rule text (numbered_rules/2.md):
 * 2.01.14 REAWAKEN: When killed, the Kwisatz Haderach must be revived like any other leader.
 *                   When all other leaders have died once and/or become unavailable you may
 *                   use your one leader revival action to revive this token instead of a leader.
 * 2.01.15 ASCENSION: Alive or dead, the Kwisatz Haderach does not prevent the Atreides from reviving leaders.
 *
 * These tests verify that:
 * - reviveKwisatzHaderach clears the isDead flag for Kwisatz Haderach (2.01.14).
 * - Leader revival validation does not depend on Kwisatz Haderach state; Atreides can revive
 *   a leader regardless of whether Kwisatz is alive or dead (2.01.15).
 */

import { Faction, LeaderLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, updateFactionState } from "../../state";
import { reviveKwisatzHaderach } from "../../state/mutations/kwisatz-haderach";
import { validateLeaderRevival } from "../../rules/revival";

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

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

// =============================================================================
// Tests for 2.01.14 – REAWAKEN
// =============================================================================

function testReawaken_reviveKwisatzClearsIsDead(): void {
  section("2.01.14 - reviveKwisatzHaderach clears isDead flag");

  let state = buildBaseState();
  let atreides = getFactionState(state, Faction.ATREIDES);

  // Simulate dead Kwisatz Haderach
  state = updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach!,
      isDead: true,
    },
  });

  const revivedState = reviveKwisatzHaderach(state);
  const atreidesAfter = getFactionState(revivedState, Faction.ATREIDES);

  assert(
    atreidesAfter.kwisatzHaderach?.isDead === false,
    "reviveKwisatzHaderach sets isDead back to false"
  );
}

// =============================================================================
// Tests for 2.01.15 – ASCENSION
// =============================================================================

function testAscension_leaderRevivalNotBlockedByKwisatzState(): void {
  section("2.01.15 - leader revival is not blocked by Kwisatz Haderach state");

  let state = buildBaseState();
  let atreides = getFactionState(state, Faction.ATREIDES);

  // Choose an Atreides leader and put them face up in tanks (revivable)
  const leader = atreides.leaders[0];

  const leadersWithOneInTanks = atreides.leaders.map((l, index) =>
    index === 0
      ? {
          ...l,
          location: LeaderLocation.TANKS_FACE_UP,
        }
      : l
  );

  // Case 1: Kwisatz alive
  state = updateFactionState(state, Faction.ATREIDES, {
    leaders: leadersWithOneInTanks,
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach!,
      isDead: false,
    },
  });

  let result = validateLeaderRevival(state, Faction.ATREIDES, leader.definitionId);

  assert(
    result.ok === true,
    "validateLeaderRevival allows leader revival when Kwisatz is alive"
  );

  // Case 2: Kwisatz dead
  state = updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...getFactionState(state, Faction.ATREIDES).kwisatzHaderach!,
      isDead: true,
    },
  });

  result = validateLeaderRevival(state, Faction.ATREIDES, leader.definitionId);

  assert(
    result.ok === true,
    "validateLeaderRevival still allows leader revival when Kwisatz is dead"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.14–2.01.15 REAWAKEN & ASCENSION");
  console.log("=".repeat(80));

  try {
    testReawaken_reviveKwisatzClearsIsDead();
  } catch (error) {
    console.error(
      "❌ testReawaken_reviveKwisatzClearsIsDead failed:",
      error
    );
    failCount++;
  }

  try {
    testAscension_leaderRevivalNotBlockedByKwisatzState();
  } catch (error) {
    console.error(
      "❌ testAscension_leaderRevivalNotBlockedByKwisatzState failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.14–2.01.15 tests completed: ${passCount} passed, ${failCount} failed`
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


