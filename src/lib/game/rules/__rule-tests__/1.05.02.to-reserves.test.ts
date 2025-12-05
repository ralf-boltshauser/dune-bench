/**
 * Rule test: 1.05.02 TO RESERVES
 * @rule-test 1.05.02
 *
 * Rule text (numbered_rules/1.md):
 * "TO RESERVES: Revived Forces must be Put in the player's reserves."
 *
 * These tests exercise the core behavior of placing revived forces in reserves:
 * - Forces are removed from tanks
 * - Forces are added to reserves (not to board)
 * - Both regular and elite forces go to reserves
 * - State changes are correct
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.02.to-reserves.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { reviveForces } from "../../state/mutations/forces";

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
  regularCount: number,
  eliteCount: number = 0
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;
  const newTanks = {
    regular: forces.tanks.regular + regularCount,
    elite: forces.tanks.elite + eliteCount,
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

// =============================================================================
// Tests for 1.05.02
// =============================================================================

function testToReserves_ForcesRemovedFromTanks(): void {
  section("1.05.02 - forces are removed from tanks");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5, 0);

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeTanks = beforeState.forces.tanks.regular;

  // Revive 3 forces
  const result = reviveForces(state, Faction.ATREIDES, 3, false);
  const afterState = getFactionState(result, Faction.ATREIDES);
  const afterTanks = afterState.forces.tanks.regular;

  assert(
    afterTanks === beforeTanks - 3,
    `forces removed from tanks: ${beforeTanks} → ${afterTanks} (expected ${beforeTanks - 3})`
  );
}

function testToReserves_ForcesAddedToReserves(): void {
  section("1.05.02 - forces are added to reserves");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5, 0);

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeReserves = beforeState.forces.reserves.regular;

  // Revive 3 forces
  const result = reviveForces(state, Faction.ATREIDES, 3, false);
  const afterState = getFactionState(result, Faction.ATREIDES);
  const afterReserves = afterState.forces.reserves.regular;

  assert(
    afterReserves === beforeReserves + 3,
    `forces added to reserves: ${beforeReserves} → ${afterReserves} (expected ${beforeReserves + 3})`
  );
}

function testToReserves_ForcesGoToReservesNotBoard(): void {
  section("1.05.02 - forces go to reserves, not to board");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5, 0);

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeBoard = beforeState.forces.onBoard.length;

  // Revive 3 forces
  const result = reviveForces(state, Faction.ATREIDES, 3, false);
  const afterState = getFactionState(result, Faction.ATREIDES);
  const afterBoard = afterState.forces.onBoard.length;

  assert(
    afterBoard === beforeBoard,
    `forces on board unchanged: ${beforeBoard} (got ${afterBoard}) - forces go to reserves, not board`
  );
}

function testToReserves_EliteForcesGoToReserves(): void {
  section("1.05.02 - elite forces also go to reserves");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5, 3);

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeEliteReserves = beforeState.forces.reserves.elite;
  const beforeEliteTanks = beforeState.forces.tanks.elite;

  // Revive 2 elite forces
  const result = reviveForces(state, Faction.ATREIDES, 2, true);
  const afterState = getFactionState(result, Faction.ATREIDES);
  const afterEliteReserves = afterState.forces.reserves.elite;
  const afterEliteTanks = afterState.forces.tanks.elite;

  assert(
    afterEliteTanks === beforeEliteTanks - 2,
    `elite forces removed from tanks: ${beforeEliteTanks} → ${afterEliteTanks} (expected ${beforeEliteTanks - 2})`
  );
  assert(
    afterEliteReserves === beforeEliteReserves + 2,
    `elite forces added to reserves: ${beforeEliteReserves} → ${afterEliteReserves} (expected ${beforeEliteReserves + 2})`
  );
}

function testToReserves_RegularAndEliteSeparate(): void {
  section("1.05.02 - regular and elite forces are tracked separately");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5, 3);

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeRegularReserves = beforeState.forces.reserves.regular;
  const beforeEliteReserves = beforeState.forces.reserves.elite;

  // Revive 2 regular forces
  let result = reviveForces(state, Faction.ATREIDES, 2, false);
  let afterState = getFactionState(result, Faction.ATREIDES);

  assert(
    afterState.forces.reserves.regular === beforeRegularReserves + 2,
    `regular reserves increased by 2: ${beforeRegularReserves} → ${afterState.forces.reserves.regular}`
  );
  assert(
    afterState.forces.reserves.elite === beforeEliteReserves,
    `elite reserves unchanged: ${beforeEliteReserves} (got ${afterState.forces.reserves.elite})`
  );

  // Revive 1 elite force
  result = reviveForces(result, Faction.ATREIDES, 1, true);
  afterState = getFactionState(result, Faction.ATREIDES);

  assert(
    afterState.forces.reserves.regular === beforeRegularReserves + 2,
    `regular reserves still at +2: ${beforeRegularReserves + 2} (got ${afterState.forces.reserves.regular})`
  );
  assert(
    afterState.forces.reserves.elite === beforeEliteReserves + 1,
    `elite reserves increased by 1: ${beforeEliteReserves} → ${afterState.forces.reserves.elite}`
  );
}

function testToReserves_AllForcesGoToReserves(): void {
  section("1.05.02 - all revived forces go to reserves (complete transfer)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 3, 0);

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeTanks = beforeState.forces.tanks.regular;
  const beforeReserves = beforeState.forces.reserves.regular;

  // Revive all 3 forces
  const result = reviveForces(state, Faction.ATREIDES, 3, false);
  const afterState = getFactionState(result, Faction.ATREIDES);
  const afterTanks = afterState.forces.tanks.regular;
  const afterReserves = afterState.forces.reserves.regular;

  assert(
    afterTanks === 0,
    `all forces removed from tanks: ${beforeTanks} → ${afterTanks} (expected 0)`
  );
  assert(
    afterReserves === beforeReserves + 3,
    `all forces added to reserves: ${beforeReserves} → ${afterReserves} (expected ${beforeReserves + 3})`
  );
}

function testToReserves_MultipleFactionsIndependent(): void {
  section("1.05.02 - multiple factions' forces are independent");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5, 0);
  state = addForcesToTanks(state, Faction.HARKONNEN, 5, 0);

  const beforeAtreidesReserves = getFactionState(state, Faction.ATREIDES).forces.reserves.regular;
  const beforeHarkonnenReserves = getFactionState(state, Faction.HARKONNEN).forces.reserves.regular;

  // Revive Atreides forces
  let result = reviveForces(state, Faction.ATREIDES, 3, false);
  
  // Revive Harkonnen forces
  result = reviveForces(result, Faction.HARKONNEN, 2, false);

  const afterAtreidesReserves = getFactionState(result, Faction.ATREIDES).forces.reserves.regular;
  const afterHarkonnenReserves = getFactionState(result, Faction.HARKONNEN).forces.reserves.regular;

  assert(
    afterAtreidesReserves === beforeAtreidesReserves + 3,
    `Atreides reserves increased by 3: ${beforeAtreidesReserves} → ${afterAtreidesReserves}`
  );
  assert(
    afterHarkonnenReserves === beforeHarkonnenReserves + 2,
    `Harkonnen reserves increased by 2: ${beforeHarkonnenReserves} → ${afterHarkonnenReserves}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.02 TO RESERVES tests...\n");

  testToReserves_ForcesRemovedFromTanks();
  testToReserves_ForcesAddedToReserves();
  testToReserves_ForcesGoToReservesNotBoard();
  testToReserves_EliteForcesGoToReserves();
  testToReserves_RegularAndEliteSeparate();
  testToReserves_AllForcesGoToReserves();
  testToReserves_MultipleFactionsIndependent();

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

