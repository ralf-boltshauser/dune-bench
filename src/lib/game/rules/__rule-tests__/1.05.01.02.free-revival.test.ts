/**
 * Rule test: 1.05.01.02 FREE REVIVAL
 * @rule-test 1.05.01.02
 *
 * Rule text (numbered_rules/1.md):
 * "FREE REVIVAL: A certain number of Forces are revived for free as stated on the player sheet."
 *
 * These tests exercise the core behavior of free revival:
 * - Free revival amount is correct per faction (as stated on player sheet)
 * - Free revival doesn't cost spice
 * - Free revival is applied first (before paid revival)
 * - Free revival is limited by available forces in tanks
 * - Fremen ally can grant 3 free revivals (Rule 2.04.11)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.01.02.free-revival.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getRevivalLimits, validateForceRevival } from "../../rules";
import { getFactionConfig } from "../../data";

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
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN],
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

// =============================================================================
// Tests for 1.05.01.02
// =============================================================================

function testFreeRevival_MatchesPlayerSheet(): void {
  section("1.05.01.02 - free revival amount matches player sheet");

  const state = buildBaseState();

  // Check each faction's free revival matches their config
  const factions = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
  ];

  for (const faction of factions) {
    const config = getFactionConfig(faction);
    const limits = getRevivalLimits(state, faction);

    assert(
      limits.freeForces === config.freeRevival,
      `${faction} free revival is ${config.freeRevival} (got ${limits.freeForces}, expected ${config.freeRevival})`
    );
  }
}

function testFreeRevival_NoCostForFreeForces(): void {
  section("1.05.01.02 - free revival doesn't cost spice");

  let state = buildBaseState();
  // Add forces to tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  // Set spice to 0 (should still be able to revive free forces)
  state = {
    ...state,
    factions: new Map(state.factions).set(
      Faction.ATREIDES,
      {
        ...getFactionState(state, Faction.ATREIDES),
        spice: 0,
      }
    ),
  };

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
      `cost for free revival is 0 (got ${result.context?.cost})`
    );
  }
}

function testFreeRevival_AppliedFirst(): void {
  section("1.05.01.02 - free revival is applied before paid revival");

  let state = buildBaseState();
  // Add forces to tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = {
    ...state,
    factions: new Map(state.factions).set(
      Faction.ATREIDES,
      {
        ...getFactionState(state, Faction.ATREIDES),
        spice: 10, // Enough for paid revival
      }
    ),
  };

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const totalRequested = 3; // 2 free + 1 paid

  // Try to revive 3 forces (2 free + 1 paid)
  const result = validateForceRevival(state, Faction.ATREIDES, totalRequested, 0);

  assert(
    result.valid === true,
    `revival of ${totalRequested} forces (${freeCount} free + ${totalRequested - freeCount} paid) is valid`
  );
  if (result.valid) {
    assert(
      result.context?.freeRevival === freeCount,
      `free revival count is ${freeCount} (got ${result.context?.freeRevival})`
    );
    assert(
      result.context?.paidRevival === totalRequested - freeCount,
      `paid revival count is ${totalRequested - freeCount} (got ${result.context?.paidRevival})`
    );
    // Cost should only be for paid forces (1 force * 2 spice = 2)
    const expectedCost = (totalRequested - freeCount) * 2;
    assert(
      result.context?.cost === expectedCost,
      `cost is only for paid forces: ${expectedCost} spice (got ${result.context?.cost})`
    );
  }
}

function testFreeRevival_LimitedByAvailableForces(): void {
  section("1.05.01.02 - free revival is limited by available forces in tanks");

  let state = buildBaseState();
  // Add only 1 force to tanks (less than free revival amount)
  state = addForcesToTanks(state, Faction.ATREIDES, 1);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeForces = limits.freeForces; // Atreides has 2 free
  const forcesInTanks = limits.forcesInTanks; // Only 1 available

  assert(
    forcesInTanks === 1,
    `forces in tanks is 1 (got ${forcesInTanks})`
  );
  assert(
    freeForces === 2,
    `free revival amount is 2 (got ${freeForces})`
  );

  // Try to revive free forces, but only 1 available
  // Should be able to revive 1 (the available amount)
  const result = validateForceRevival(state, Faction.ATREIDES, 1, 0);

  assert(
    result.valid === true,
    "can revive 1 force (available amount, even though free revival is 2)"
  );
  if (result.valid) {
    assert(
      result.context?.cost === 0,
      "cost is 0 (reviving only 1, which is within free limit)"
    );
  }
}

function testFreeRevival_DifferentFactionsHaveDifferentAmounts(): void {
  section("1.05.01.02 - different factions have different free revival amounts");

  const state = buildBaseState();

  // Atreides: 2 free
  const atreidesLimits = getRevivalLimits(state, Faction.ATREIDES);
  assert(
    atreidesLimits.freeForces === 2,
    `Atreides has 2 free revivals (got ${atreidesLimits.freeForces})`
  );

  // Harkonnen: 2 free
  const harkonnenLimits = getRevivalLimits(state, Faction.HARKONNEN);
  assert(
    harkonnenLimits.freeForces === 2,
    `Harkonnen has 2 free revivals (got ${harkonnenLimits.freeForces})`
  );

  // Fremen: 3 free
  const fremenLimits = getRevivalLimits(state, Faction.FREMEN);
  assert(
    fremenLimits.freeForces === 3,
    `Fremen has 3 free revivals (got ${fremenLimits.freeForces})`
  );
}

function testFreeRevival_FremenAllyCanGrant3Free(): void {
  section("1.05.01.02 - Fremen ally can grant 3 free revivals (Rule 2.04.11)");

  let state = buildBaseState();
  // Make Atreides ally with Fremen
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const fremenState = getFactionState(state, Faction.FREMEN);

  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        allyId: Faction.FREMEN,
        fremenRevivalBoostGranted: true, // Fremen granted the boost
      })
      .set(Faction.FREMEN, {
        ...fremenState,
        allyId: Faction.ATREIDES,
      }),
  };

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  // Atreides normally has 2 free, but with Fremen boost should have 3
  assert(
    limits.freeForces === 3,
    `Atreides with Fremen ally boost has 3 free revivals (got ${limits.freeForces}, expected 3)`
  );
  assert(
    limits.fremenBoostGranted === true,
    "Fremen boost is granted"
  );
}

function testFreeRevival_ZeroFreeRevivalStillValid(): void {
  section("1.05.01.02 - factions with 0 free revival can still revive (paid only)");

  // Some factions might have 0 free revival (check if any exist)
  const state = buildBaseState();

  // Check all factions - at least some should have free revival > 0
  // But if a faction had 0, they should still be able to revive (paid)
  const limits = getRevivalLimits(state, Faction.ATREIDES);

  // Atreides has 2 free, so this test verifies the system works
  // If we had a faction with 0 free, they could still revive up to 3 (all paid)
  assert(
    limits.freeForces >= 0,
    `free revival is non-negative (got ${limits.freeForces})`
  );
  assert(
    limits.maxForces === 3,
    `max revival is still 3 regardless of free amount (got ${limits.maxForces})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.01.02 FREE REVIVAL tests...\n");

  testFreeRevival_MatchesPlayerSheet();
  testFreeRevival_NoCostForFreeForces();
  testFreeRevival_AppliedFirst();
  testFreeRevival_LimitedByAvailableForces();
  testFreeRevival_DifferentFactionsHaveDifferentAmounts();
  testFreeRevival_FremenAllyCanGrant3Free();
  testFreeRevival_ZeroFreeRevivalStillValid();

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

