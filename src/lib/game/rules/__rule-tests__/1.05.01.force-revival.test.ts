/**
 * Rule test: 1.05.01 FORCE REVIVAL
 * @rule-test 1.05.01
 *
 * Rule text (numbered_rules/1.md):
 * "Force Revival: All players may now revive up to 3 Forces from the Tleilaxu Tanks."
 *
 * These tests exercise the core behavior of force revival:
 * - Maximum of 3 forces can be revived per turn
 * - Forces are revived from Tleilaxu Tanks
 * - Forces go to reserves (covered by 1.05.02)
 * - Revival is clamped to available forces in tanks
 * - All players can revive (no storm order restriction)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.01.force-revival.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, sendForcesToTanks, TerritoryId } from "../../state";
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
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    advancedRules: false,
  });
}

function addForcesToTanks(
  state: GameState,
  faction: Faction,
  count: number
): GameState {
  // Send forces to tanks by simulating a battle loss
  let newState = state;
  const factionState = getFactionState(state, faction);
  
  // Place some forces on board first, then send them to tanks
  // We'll use a simple approach: directly modify tanks
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

// =============================================================================
// Tests for 1.05.01
// =============================================================================

function testForceRevival_MaxLimitIs3(): void {
  section("1.05.01 - maximum of 3 forces can be revived per turn");

  const state = buildBaseState();
  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    limits.maxForces === 3,
    `max revival limit is 3 (got ${limits.maxForces})`
  );
  assert(
    limits.maxForces === GAME_CONSTANTS.MAX_FORCE_REVIVAL_PER_TURN,
    `maxForces matches GAME_CONSTANTS.MAX_FORCE_REVIVAL_PER_TURN (${GAME_CONSTANTS.MAX_FORCE_REVIVAL_PER_TURN})`
  );
}

function testForceRevival_CanReviveUpTo3(): void {
  section("1.05.01 - can revive up to 3 forces");

  let state = buildBaseState();
  // Add 5 forces to tanks (more than max)
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = {
    ...state,
    factions: new Map(state.factions).set(
      Faction.ATREIDES,
      {
        ...getFactionState(state, Faction.ATREIDES),
        spice: 10, // Enough spice for paid revival
      }
    ),
  };

  // Try to revive 3 forces (at max limit)
  const result = validateForceRevival(state, Faction.ATREIDES, 3, 0);

  assert(
    result.valid === true,
    "revival of 3 forces (max limit) is valid"
  );
}

function testForceRevival_CannotReviveMoreThan3(): void {
  section("1.05.01 - cannot revive more than 3 forces");

  let state = buildBaseState();
  // Add 5 forces to tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = {
    ...state,
    factions: new Map(state.factions).set(
      Faction.ATREIDES,
      {
        ...getFactionState(state, Faction.ATREIDES),
        spice: 10, // Enough spice
      }
    ),
  };

  // Try to revive 4 forces (exceeds max)
  const result = validateForceRevival(state, Faction.ATREIDES, 4, 0);

  assert(
    result.valid === false,
    "revival of 4 forces (exceeds max) is invalid"
  );
  assert(
    result.errors?.some((e) => e.code === "REVIVAL_LIMIT_EXCEEDED"),
    "error code is REVIVAL_LIMIT_EXCEEDED"
  );
}

function testForceRevival_ClampedToAvailableForces(): void {
  section("1.05.01 - revival is clamped to available forces in tanks");

  let state = buildBaseState();
  // Add only 2 forces to tanks (less than max)
  state = addForcesToTanks(state, Faction.ATREIDES, 2);

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    limits.forcesInTanks === 2,
    `forces in tanks is 2 (got ${limits.forcesInTanks})`
  );
  assert(
    limits.maxForces === 3,
    `max revival is still 3 (got ${limits.maxForces})`
  );

  // Try to revive 3, but only 2 available - validation should reject
  const result = validateForceRevival(state, Faction.ATREIDES, 3, 0);

  // Validation checks: regularCount > tanksRegular → error
  assert(
    result.valid === false,
    "validation rejects revival request exceeding available forces in tanks"
  );
  assert(
    result.errors?.some((e) => e.code === "NO_FORCES_IN_TANKS"),
    "error code is NO_FORCES_IN_TANKS when requesting more than available"
  );
}

function testForceRevival_AllPlayersCanRevive(): void {
  section("1.05.01 - all players can revive (no storm order restriction)");

  const state = buildBaseState();

  // All factions should have revival limits available
  for (const faction of [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]) {
    const limits = getRevivalLimits(state, faction);

    assert(
      limits.maxForces === 3,
      `${faction} can revive up to 3 forces (got ${limits.maxForces})`
    );
  }
}

function testForceRevival_ZeroForcesInTanks(): void {
  section("1.05.01 - cannot revive when no forces in tanks");

  const state = buildBaseState();
  // No forces in tanks (default state)

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    limits.forcesInTanks === 0,
    `no forces in tanks (got ${limits.forcesInTanks})`
  );

  // Try to revive 1 force
  const result = validateForceRevival(state, Faction.ATREIDES, 1, 0);

  assert(
    result.valid === false,
    "cannot revive when no forces in tanks"
  );
  assert(
    result.errors?.some((e) => e.code === "NO_FORCES_IN_TANKS"),
    "error code is NO_FORCES_IN_TANKS"
  );
}

function testForceRevival_RevivalLimitAppliesPerTurn(): void {
  section("1.05.01 - 3 force limit applies per turn (not cumulative)");

  let state = buildBaseState();
  // Add 10 forces to tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 10);
  state = {
    ...state,
    factions: new Map(state.factions).set(
      Faction.ATREIDES,
      {
        ...getFactionState(state, Faction.ATREIDES),
        spice: 20, // Enough for multiple turns
      }
    ),
  };

  // First turn: can revive 3
  const result1 = validateForceRevival(state, Faction.ATREIDES, 3, 0);
  assert(
    result1.valid === true,
    "first turn: can revive 3 forces"
  );

  // Even with many forces in tanks, limit is still 3 per turn
  const limits = getRevivalLimits(state, Faction.ATREIDES);
  assert(
    limits.maxForces === 3,
    `max revival per turn is 3 even with ${limits.forcesInTanks} forces in tanks`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.01 FORCE REVIVAL tests...\n");

  testForceRevival_MaxLimitIs3();
  testForceRevival_CanReviveUpTo3();
  testForceRevival_CannotReviveMoreThan3();
  testForceRevival_ClampedToAvailableForces();
  testForceRevival_AllPlayersCanRevive();
  testForceRevival_ZeroForcesInTanks();
  testForceRevival_RevivalLimitAppliesPerTurn();

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

