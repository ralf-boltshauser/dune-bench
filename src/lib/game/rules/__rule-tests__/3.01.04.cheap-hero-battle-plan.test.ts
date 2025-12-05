/**
 * Rule test: 3.01.04 CHEAP HERO
 *
 * Rule text (numbered_rules/3.md):
 * "3.01.04 CHEAP HERO: Special-Leader - Play as a leader with zero strength on your Battle Plan.
 *  You may also play a weapon and a defense. The Cheap Hero may be played in place of a leader,
 *  it must be played when you have no leaders available. Discard after use."
 *
 * This rule is enforced by leader/cheap hero validation:
 * - A Cheap Hero can be used instead of a leader
 * - If you have no leaders but do have Cheap Hero, you MUST play Cheap Hero
 * - You cannot play both a leader and Cheap Hero in the same battle plan
 *
 * @rule-test 3.01.04
 */

import type { BattlePlan, Leader } from "../../types";
import {
  validateLeaderOrCheapHero,
  validateLeaderHeroExclusivity,
} from "../combat/validation/validate-leaders";

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

function dummyLeader(definitionId: string): Leader {
  return {
    definitionId,
    strength: 2,
    location: 0 as any,
    usedThisTurn: false,
    usedInTerritoryId: null,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testCheapHeroAllowedInPlaceOfLeader(): void {
  section("3.01.04 - Cheap Hero allowed in place of leader");

  const plan: BattlePlan = {
    battleId: "b1",
    aggressor: true,
    leaderId: null,
    cheapHeroUsed: true,
    weaponCardId: null,
    defenseCardId: null,
    dial: 0,
    spicePaid: 0,
    announcedNoLeader: false,
  } as BattlePlan;

  const errors = validateLeaderOrCheapHero(
    plan,
    false, // hasLeaders
    true, // hasCheapHeroCard
    []
  );

  assert(errors.length === 0, "no validation errors when using Cheap Hero instead of leader");
}

function testMustUseCheapHeroWhenNoLeadersAvailable(): void {
  section("3.01.04 - must use Cheap Hero when no leaders available");

  const plan: BattlePlan = {
    battleId: "b1",
    aggressor: true,
    leaderId: null,
    cheapHeroUsed: false,
    weaponCardId: null,
    defenseCardId: null,
    dial: 0,
    spicePaid: 0,
    announcedNoLeader: false,
  } as BattlePlan;

  const errors = validateLeaderOrCheapHero(
    plan,
    false, // hasLeaders
    true, // hasCheapHeroCard
    []
  );

  assert(errors.length === 1, "exactly one error returned when not using Cheap Hero");
  if (errors.length === 1) {
    assert(
      errors[0].code === "MUST_PLAY_CHEAP_HERO",
      "error code indicates Cheap Hero must be played"
    );
  }
}

function testCannotUseBothLeaderAndCheapHero(): void {
  section("3.01.04 - cannot use both leader and Cheap Hero");

  const plan: BattlePlan = {
    battleId: "b1",
    aggressor: true,
    leaderId: "leader_1",
    cheapHeroUsed: true,
    weaponCardId: null,
    defenseCardId: null,
    dial: 0,
    spicePaid: 0,
    announcedNoLeader: false,
  } as BattlePlan;

  const errors = validateLeaderHeroExclusivity(plan);

  assert(errors.length === 1, "exactly one error returned when both leader and Cheap Hero used");
  if (errors.length === 1) {
    assert(
      errors[0].code === "MUST_PLAY_LEADER_OR_CHEAP_HERO",
      "error code indicates you must choose leader OR Cheap Hero"
    );
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.04 CHEAP HERO");
  console.log("=".repeat(80));

  try {
    testCheapHeroAllowedInPlaceOfLeader();
  } catch (error) {
    console.error(
      "❌ testCheapHeroAllowedInPlaceOfLeader failed:",
      error
    );
    failCount++;
  }

  try {
    testMustUseCheapHeroWhenNoLeadersAvailable();
  } catch (error) {
    console.error(
      "❌ testMustUseCheapHeroWhenNoLeadersAvailable failed:",
      error
    );
    failCount++;
  }

  try {
    testCannotUseBothLeaderAndCheapHero();
  } catch (error) {
    console.error(
      "❌ testCannotUseBothLeaderAndCheapHero failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.04 tests completed: ${passCount} passed, ${failCount} failed`
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


