/**
 * Rule tests: 2.01.10, 2.01.13, 2.01.14 (Kwisatz Haderach core behavior)
 *
 * @rule-test 2.01.10
 * @rule-test 2.01.13
 * @rule-test 2.01.14
 *
 * Rule text (numbered_rules/2.md):
 * 2.01.10 THE SLEEPER HAS AWAKENED: The Kwisatz Haderach card starts out inactive and the Kwisatz
 *  Haderach token may not be used. Use the Kwisatz Haderach card and counter token to secretly keep
 *  track of Force losses. Once you have lost 7 or more Forces in a battle or battles, the Kwisatz
 *  Haderach token becomes active for the rest of the game.
 *
 * 2.01.13 PROPHECY BLINDED: The Kwisatz Haderach token can only be killed if blown up by a
 *  lasgun/shield explosion.
 *
 * 2.01.14 REAWAKEN: When killed, the Kwisatz Haderach must be revived like any other leader. When all
 *  other leaders have died once and/or become unavailable you may use your one leader revival action
 *  to revive this token instead of a leader. Cost: 2 spice.
 *
 * These tests focus on:
 * - 2.01.10: updateKwisatzHaderach activation threshold at 7+ forces lost
 * - 2.01.13: killKwisatzHaderach only marks KH dead (explosion logic tested in 3.01.14 test)
 * - 2.01.14: reviveKwisatzHaderach clears isDead when called
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import {
  updateKwisatzHaderach,
  killKwisatzHaderach,
  reviveKwisatzHaderach,
} from "../../state/mutations/kwisatz-haderach";

// =============================================================================
// Minimal console-based test harness
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
  // Use two standard factions for a minimal valid game
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

// =============================================================================
// Tests
// =============================================================================

function testKwisatzActivationAtSevenForcesLost(): void {
  section("2.01.10 - Kwisatz Haderach activates after 7+ forces lost");

  let state = buildBaseState();
  const atreidesBefore = getFactionState(state, Faction.ATREIDES);

  const kh = atreidesBefore.kwisatzHaderach;
  if (!kh) {
    throw new Error("Kwisatz Haderach state not initialized for Atreides");
  }

  assert(
    kh.isActive === false,
    "initial Kwisatz Haderach state is inactive"
  );
  assert(
    kh.forcesLostCount === 0,
    "initial forcesLostCount is 0"
  );

  // Lose 3 forces in first battle
  state = updateKwisatzHaderach(state, 3);
  let atreides = getFactionState(state, Faction.ATREIDES);
  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 3,
    "after losing 3 forces, forcesLostCount is 3"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === false,
    "KH remains inactive below 7 forces lost"
  );

  // Lose 4 more forces (total 7)
  state = updateKwisatzHaderach(state, 4);
  atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 7,
    "after losing 3+4 forces, forcesLostCount is 7"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === true,
    "KH becomes active once 7+ forces have been lost"
  );

  // Further losses keep KH active
  state = updateKwisatzHaderach(state, 2);
  atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach?.forcesLostCount === 9,
    "forcesLostCount continues to accumulate after activation"
  );
  assert(
    atreides.kwisatzHaderach?.isActive === true,
    "KH stays active after initial activation"
  );
}

function testKwisatzKillMarksDeadFlag(): void {
  section("2.01.13 - killKwisatzHaderach marks KH dead");

  let state = buildBaseState();
  let atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) {
    throw new Error("Kwisatz Haderach state not initialized for Atreides");
  }

  // Ensure KH starts alive
  assert(
    atreides.kwisatzHaderach.isDead === false,
    "initial KH is not dead"
  );

  state = killKwisatzHaderach(state);
  atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach.isDead === true,
    "killKwisatzHaderach sets isDead to true"
  );

  // Calling kill again should be idempotent (no change, no error)
  const stateAfterSecondKill = killKwisatzHaderach(state);
  const atreidesAfterSecondKill = getFactionState(
    stateAfterSecondKill,
    Faction.ATREIDES
  );
  assert(
    atreidesAfterSecondKill.kwisatzHaderach?.isDead === true,
    "second kill call leaves isDead true (idempotent)"
  );
}

function testKwisatzReviveClearsDeadFlag(): void {
  section("2.01.14 - reviveKwisatzHaderach clears isDead flag");

  let state = buildBaseState();
  let atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) {
    throw new Error("Kwisatz Haderach state not initialized for Atreides");
  }

  // Simulate KH already killed
  state = killKwisatzHaderach(state);
  atreides = getFactionState(state, Faction.ATREIDES);
  assert(
    atreides.kwisatzHaderach?.isDead === true,
    "precondition: KH is dead before revival"
  );

  // Revive KH
  state = reviveKwisatzHaderach(state);
  atreides = getFactionState(state, Faction.ATREIDES);

  assert(
    atreides.kwisatzHaderach?.isDead === false,
    "reviveKwisatzHaderach sets isDead back to false"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log(
    "RULE TESTS: 2.01.10, 2.01.13, 2.01.14 KWISATZ HADERACH CORE BEHAVIOR"
  );
  console.log("=".repeat(80));

  try {
    testKwisatzActivationAtSevenForcesLost();
  } catch (error) {
    console.error(
      "❌ testKwisatzActivationAtSevenForcesLost failed:",
      error
    );
    failCount++;
  }

  try {
    testKwisatzKillMarksDeadFlag();
  } catch (error) {
    console.error(
      "❌ testKwisatzKillMarksDeadFlag failed:",
      error
    );
    failCount++;
  }

  try {
    testKwisatzReviveClearsDeadFlag();
  } catch (error) {
    console.error(
      "❌ testKwisatzReviveClearsDeadFlag failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.10/2.01.13/2.01.14 tests completed: ${passCount} passed, ${failCount} failed`
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


