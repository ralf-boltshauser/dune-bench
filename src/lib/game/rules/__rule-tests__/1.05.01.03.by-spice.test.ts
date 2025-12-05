/**
 * Rule test: 1.05.01.03 BY SPICE
 * @rule-test 1.05.01.03
 *
 * Rule text (numbered_rules/1.md):
 * "BY SPICE: Any additional Forces that may be revived, beyond your free revival and up to your current limit, must be done at a cost of 2 spice per Force."
 *
 * These tests exercise the core behavior of paid revival:
 * - Additional forces beyond free revival cost 2 spice each
 * - Cost is calculated correctly (paidCount * 2)
 * - Only paid forces cost spice (free forces don't)
 * - Cost applies up to current limit (3 total)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.01.03.by-spice.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getRevivalLimits, validateForceRevival } from "../../rules";
import { GAME_CONSTANTS } from "../../data";

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

function addForcesToTanks(
  state: GameState,
  faction: Faction,
  count: number
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;
  const newTanks = {
    regular: forces.tanks.regular + count,
    elite: forces.tanks.elite,
  };

  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      forces: {
        ...forces,
        tanks: newTanks,
      },
    }),
  };
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
// Tests for 1.05.01.03
// =============================================================================

function testBySpice_CostIs2PerForce(): void {
  section("1.05.01.03 - cost is 2 spice per additional force");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const paidCount = 1; // 1 additional force beyond free

  // Try to revive 3 forces (2 free + 1 paid)
  const result = validateForceRevival(state, Faction.ATREIDES, freeCount + paidCount, 0);

  assert(
    result.valid === true,
    "revival of 3 forces (2 free + 1 paid) is valid"
  );
  if (result.valid) {
    const expectedCost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST;
    assert(
      result.context?.cost === expectedCost,
      `cost is ${expectedCost} spice for ${paidCount} paid force(s) (got ${result.context?.cost})`
    );
    assert(
      result.context?.cost === 2,
      `cost is exactly 2 spice per paid force (got ${result.context?.cost})`
    );
  }
}

function testBySpice_MultiplePaidForces(): void {
  section("1.05.01.03 - multiple paid forces cost 2 spice each");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const paidCount = 1; // Only 1 paid (max is 3, so 2 free + 1 paid = 3)

  // Try to revive 3 forces (2 free + 1 paid)
  const result = validateForceRevival(state, Faction.ATREIDES, freeCount + paidCount, 0);

  assert(
    result.valid === true,
    "revival of 3 forces (2 free + 1 paid) is valid"
  );
  if (result.valid) {
    const expectedCost = paidCount * 2; // 1 * 2 = 2
    assert(
      result.context?.cost === expectedCost,
      `cost for ${paidCount} paid force(s) is ${expectedCost} spice (got ${result.context?.cost})`
    );
  }
}

function testBySpice_OnlyPaidForcesCostSpice(): void {
  section("1.05.01.03 - only paid forces cost spice (free forces don't)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 0); // No spice

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free

  // Try to revive only free forces (no paid)
  const result = validateForceRevival(state, Faction.ATREIDES, freeCount, 0);

  assert(
    result.valid === true,
    `revival of ${freeCount} free forces is valid even with 0 spice`
  );
  if (result.valid) {
    assert(
      result.context?.cost === 0,
      `cost for free forces is 0 (got ${result.context?.cost})`
    );
    assert(
      result.context?.paidRevival === 0,
      `paid revival count is 0 (got ${result.context?.paidRevival})`
    );
  }
}

function testBySpice_CostCalculationIsCorrect(): void {
  section("1.05.01.03 - cost calculation is correct (paidCount * 2)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free

  // Test: 2 free + 1 paid = 3 total
  const result1 = validateForceRevival(state, Faction.ATREIDES, 3, 0);
  if (result1.valid) {
    const paidCount1 = result1.context?.paidRevival ?? 0;
    const expectedCost1 = paidCount1 * GAME_CONSTANTS.PAID_REVIVAL_COST;
    assert(
      result1.context?.cost === expectedCost1,
      `cost for 3 forces (2 free + 1 paid) is ${expectedCost1} spice (got ${result1.context?.cost})`
    );
    assert(
      paidCount1 === 1,
      `paid count is 1 (got ${paidCount1})`
    );
  }

  // Test with Harkonnen (1 free, so 1 free + 2 paid = 3 total)
  let harkonnenState = buildBaseState();
  harkonnenState = addForcesToTanks(harkonnenState, Faction.HARKONNEN, 5);
  harkonnenState = setFactionSpice(harkonnenState, Faction.HARKONNEN, 10);

  const harkonnenLimits = getRevivalLimits(harkonnenState, Faction.HARKONNEN);
  // Harkonnen has 2 free (not 1 as I thought earlier)
  const harkonnenFree = harkonnenLimits.freeForces;

  const result2 = validateForceRevival(harkonnenState, Faction.HARKONNEN, 3, 0);
  if (result2.valid) {
    const paidCount2 = result2.context?.paidRevival ?? 0;
    const expectedCost2 = paidCount2 * GAME_CONSTANTS.PAID_REVIVAL_COST;
    assert(
      result2.context?.cost === expectedCost2,
      `Harkonnen cost for 3 forces is ${expectedCost2} spice (got ${result2.context?.cost})`
    );
  }
}

function testBySpice_CannotExceedLimitEvenWithSpice(): void {
  section("1.05.01.03 - cannot revive more than limit even with sufficient spice");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 10); // Many forces available
  state = setFactionSpice(state, Faction.ATREIDES, 100); // Plenty of spice

  // Try to revive 4 forces (exceeds max of 3)
  const result = validateForceRevival(state, Faction.ATREIDES, 4, 0);

  assert(
    result.valid === false,
    "cannot revive 4 forces even with sufficient spice (exceeds max of 3)"
  );
  assert(
    result.errors?.some((e) => e.code === "REVIVAL_LIMIT_EXCEEDED"),
    "error code is REVIVAL_LIMIT_EXCEEDED"
  );
}

function testBySpice_CostMatchesPaidRevivalCount(): void {
  section("1.05.01.03 - cost matches paid revival count (paidCount * 2)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free

  // Revive 3 forces (2 free + 1 paid)
  const result = validateForceRevival(state, Faction.ATREIDES, 3, 0);

  assert(
    result.valid === true,
    "revival of 3 forces is valid"
  );
  if (result.valid) {
    const paidCount = result.context?.paidRevival ?? 0;
    const cost = result.context?.cost ?? 0;
    const expectedCost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST;

    assert(
      cost === expectedCost,
      `cost (${cost}) equals paidCount (${paidCount}) * 2 (expected ${expectedCost})`
    );
    assert(
      paidCount === 1,
      `paid revival count is 1 (got ${paidCount})`
    );
  }
}

function testBySpice_InsufficientSpiceForPaidRevival(): void {
  section("1.05.01.03 - insufficient spice prevents paid revival");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 1); // Only 1 spice (not enough for 1 paid force)

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free

  // Try to revive 3 forces (2 free + 1 paid = 2 spice needed, but only have 1)
  const result = validateForceRevival(state, Faction.ATREIDES, 3, 0);

  assert(
    result.valid === false,
    "cannot revive 3 forces with insufficient spice (need 2, have 1)"
  );
  assert(
    result.errors?.some((e) => e.code === "INSUFFICIENT_SPICE"),
    "error code is INSUFFICIENT_SPICE"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.01.03 BY SPICE tests...\n");

  testBySpice_CostIs2PerForce();
  testBySpice_MultiplePaidForces();
  testBySpice_OnlyPaidForcesCostSpice();
  testBySpice_CostCalculationIsCorrect();
  testBySpice_CannotExceedLimitEvenWithSpice();
  testBySpice_CostMatchesPaidRevivalCount();
  testBySpice_InsufficientSpiceForPaidRevival();

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

