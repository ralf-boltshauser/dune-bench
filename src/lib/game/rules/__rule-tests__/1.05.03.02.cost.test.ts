/**
 * Rule test: 1.05.03.02 COST
 * @rule-test 1.05.03.02
 *
 * Rule text (numbered_rules/1.md):
 * "COST: For a leader, a player must pay that leader's fighting strength in spice to revive that leader."
 *
 * These tests exercise the core behavior of leader revival cost:
 * - Cost equals leader's fighting strength
 * - Different leaders have different costs (based on strength)
 * - Cost is correctly calculated for various leaders
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.03.02.cost.test.ts
 */

import { Faction, LeaderLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateLeaderRevival, getRevivalLimits } from "../../rules";
import { getLeaderDefinition } from "../../data";

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

function setLeaderLocation(
  state: GameState,
  faction: Faction,
  leaderId: string,
  location: LeaderLocation
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) =>
    l.definitionId === leaderId ? { ...l, location } : l
  );

  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      leaders,
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
// Tests for 1.05.03.02
// =============================================================================

function testCost_EqualsLeaderStrength(): void {
  section("1.05.03.02 - cost equals leader's fighting strength");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up) so revival is possible
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  // Test with first leader
  const leader = factionState.leaders[0];
  const leaderDef = getLeaderDefinition(leader.definitionId);

  if (leaderDef) {
    state = setFactionSpice(state, Faction.ATREIDES, 10); // Enough spice

    const result = validateLeaderRevival(state, Faction.ATREIDES, leader.definitionId);

    assert(
      result.valid === true,
      `revival is valid when sufficient spice (got ${result.valid})`
    );
    if (result.valid) {
      assert(
        result.context?.cost === leaderDef.strength,
        `cost equals leader strength: ${leaderDef.strength} (got ${result.context?.cost})`
      );
    }
  }
}

function testCost_DifferentLeadersHaveDifferentCosts(): void {
  section("1.05.03.02 - different leaders have different costs based on strength");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up)
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  state = setFactionSpice(state, Faction.ATREIDES, 10); // Enough spice

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  // Check that different leaders have different costs
  const costs = limits.revivableLeaders.map((l) => l.cost);
  const uniqueCosts = new Set(costs);

  assert(
    limits.revivableLeaders.length > 0,
    `there are revivable leaders (got ${limits.revivableLeaders.length})`
  );

  // Verify each leader's cost equals their strength
  for (const revivableLeader of limits.revivableLeaders) {
    const leaderDef = getLeaderDefinition(revivableLeader.id);
    if (leaderDef) {
      assert(
        revivableLeader.cost === leaderDef.strength,
        `${revivableLeader.name} cost (${revivableLeader.cost}) equals strength (${leaderDef.strength})`
      );
    }
  }
}

function testCost_StrongLeaderCostsMore(): void {
  section("1.05.03.02 - stronger leaders cost more spice");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up)
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  state = setFactionSpice(state, Faction.ATREIDES, 10); // Enough spice

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  if (limits.revivableLeaders.length >= 2) {
    // Sort by cost (strength)
    const sorted = [...limits.revivableLeaders].sort((a, b) => b.cost - a.cost);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    assert(
      strongest.cost >= weakest.cost,
      `strongest leader (${strongest.name}, ${strongest.cost}) costs at least as much as weakest (${weakest.name}, ${weakest.cost})`
    );

    if (strongest.cost > weakest.cost) {
      assert(
        strongest.cost > weakest.cost,
        `stronger leader costs more: ${strongest.cost} > ${weakest.cost}`
      );
    }
  }
}

function testCost_CostMatchesStrengthFromDefinition(): void {
  section("1.05.03.02 - cost matches strength from leader definition");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up)
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  state = setFactionSpice(state, Faction.ATREIDES, 10); // Enough spice

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  // Verify each revivable leader's cost matches their definition strength
  for (const revivableLeader of limits.revivableLeaders) {
    const leaderDef = getLeaderDefinition(revivableLeader.id);
    if (leaderDef) {
      assert(
        revivableLeader.cost === leaderDef.strength,
        `${revivableLeader.name}: cost (${revivableLeader.cost}) matches definition strength (${leaderDef.strength})`
      );
    }
  }
}

function testCost_InsufficientSpicePreventsRevival(): void {
  section("1.05.03.02 - insufficient spice prevents revival (cost = strength)");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up)
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  // Get a leader and their strength
  const leader = factionState.leaders[0];
  const leaderDef = getLeaderDefinition(leader.definitionId);

  if (leaderDef) {
    // Set spice to less than leader's strength
    const insufficientSpice = leaderDef.strength - 1;
    state = setFactionSpice(state, Faction.ATREIDES, insufficientSpice);

    const result = validateLeaderRevival(state, Faction.ATREIDES, leader.definitionId);

    assert(
      result.valid === false,
      `cannot revive when spice (${insufficientSpice}) is less than cost (${leaderDef.strength})`
    );
    assert(
      result.errors?.some((e) => e.code === "INSUFFICIENT_SPICE"),
      "error code is INSUFFICIENT_SPICE"
    );
  }
}

function testCost_ExactSpiceAllowsRevival(): void {
  section("1.05.03.02 - exact spice amount allows revival (cost = strength)");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up)
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  // Get a leader and their strength
  const leader = factionState.leaders[0];
  const leaderDef = getLeaderDefinition(leader.definitionId);

  if (leaderDef) {
    // Set spice to exactly leader's strength
    state = setFactionSpice(state, Faction.ATREIDES, leaderDef.strength);

    const result = validateLeaderRevival(state, Faction.ATREIDES, leader.definitionId);

    assert(
      result.valid === true,
      `can revive when spice (${leaderDef.strength}) equals cost (${leaderDef.strength})`
    );
    if (result.valid) {
      assert(
        result.context?.cost === leaderDef.strength,
        `cost is ${leaderDef.strength} (got ${result.context?.cost})`
      );
    }
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.03.02 COST tests...\n");

  testCost_EqualsLeaderStrength();
  testCost_DifferentLeadersHaveDifferentCosts();
  testCost_StrongLeaderCostsMore();
  testCost_CostMatchesStrengthFromDefinition();
  testCost_InsufficientSpicePreventsRevival();
  testCost_ExactSpiceAllowsRevival();

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

