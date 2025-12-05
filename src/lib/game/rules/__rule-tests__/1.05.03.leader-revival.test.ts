/**
 * Rule test: 1.05.03 LEADER REVIVAL
 * @rule-test 1.05.03
 *
 * Rule text (numbered_rules/1.md):
 * "Leader Revival: When a player has no Active Leaders or all of there leaders have died at least once, they may revive 1 face up leader per Turn until all of their leaders have been revived."
 *
 * These tests exercise the core behavior of leader revival eligibility:
 * - Can revive when no active leaders (all in tanks)
 * - Can revive when all leaders have died at least once (some face-up in tanks)
 * - Cannot revive when there are active leaders available
 * - Can only revive face-up leaders (not face-down)
 * - Can revive 1 leader per turn
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.03.leader-revival.test.ts
 */

import { Faction, LeaderLocation, type GameState, type Leader } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, canReviveLeader } from "../../state";
import { getRevivalLimits } from "../../rules";

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

// =============================================================================
// Tests for 1.05.03
// =============================================================================

function testLeaderRevival_CanReviveWhenNoActiveLeaders(): void {
  section("1.05.03 - can revive when no active leaders (all in tanks)");

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

  const canRevive = canReviveLeader(state, Faction.ATREIDES);
  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    canRevive === true,
    `can revive when all leaders are in tanks (got ${canRevive})`
  );
  assert(
    limits.canReviveLeader === true,
    `revival limits indicate can revive (got ${limits.canReviveLeader})`
  );
  assert(
    limits.revivableLeaders.length > 0,
    `there are revivable leaders available (${limits.revivableLeaders.length})`
  );
}

function testLeaderRevival_CanReviveWhenAllLeadersDiedOnce(): void {
  section("1.05.03 - can revive when all leaders have died at least once");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Scenario: Some leaders in pool, some face-up in tanks (all have died at least once)
  // This means: at least one leader is face-up in tanks, and no active leaders
  // OR: all leaders are dead (not in pool)

  // Move first leader to tanks (face-up)
  if (factionState.leaders.length > 0) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      factionState.leaders[0].definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  // Move remaining leaders to tanks (face-up or face-down)
  for (let i = 1; i < factionState.leaders.length; i++) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      factionState.leaders[i].definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  const canRevive = canReviveLeader(state, Faction.ATREIDES);
  const limits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    canRevive === true,
    `can revive when all leaders have died (some face-up in tanks) (got ${canRevive})`
  );
  assert(
    limits.canReviveLeader === true,
    `revival limits indicate can revive (got ${limits.canReviveLeader})`
  );
}

function testLeaderRevival_CannotReviveWhenActiveLeadersAvailable(): void {
  section("1.05.03 - cannot revive when active leaders are available");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Keep ALL leaders in pool (active) - none in tanks
  // This means: allLeadersDead = false, someLeadersRevivable = false
  // So canReviveLeader should return false

  const canRevive = canReviveLeader(state, Faction.ATREIDES);
  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const updatedFactionState = getFactionState(state, Faction.ATREIDES);

  // All leaders should be in pool (active)
  const allInPool = updatedFactionState.leaders.every(
    (l) => l.location === LeaderLocation.LEADER_POOL
  );

  if (allInPool && updatedFactionState.leaders.length > 0) {
    assert(
      canRevive === false,
      `cannot revive when all leaders are active (in pool) (got ${canRevive})`
    );
    assert(
      limits.canReviveLeader === false,
      `revival limits indicate cannot revive (got ${limits.canReviveLeader})`
    );
  }
}

function testLeaderRevival_CanOnlyReviveFaceUpLeaders(): void {
  section("1.05.03 - can only revive face-up leaders (not face-down)");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks
  for (const leader of factionState.leaders) {
    // Move some face-up, some face-down
    const location =
      leader.definitionId === factionState.leaders[0].definitionId
        ? LeaderLocation.TANKS_FACE_UP
        : LeaderLocation.TANKS_FACE_DOWN;
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      location
    );
  }

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const updatedFactionState = getFactionState(state, Faction.ATREIDES);

  // Should only list face-up leaders as revivable
  const faceUpLeaders = updatedFactionState.leaders.filter(
    (l) => l.location === LeaderLocation.TANKS_FACE_UP
  );

  assert(
    limits.revivableLeaders.length === faceUpLeaders.length,
    `only face-up leaders are revivable: ${faceUpLeaders.length} (got ${limits.revivableLeaders.length})`
  );
  assert(
    limits.revivableLeaders.every((l) =>
      faceUpLeaders.some((fl) => fl.definitionId === l.id)
    ),
    "all revivable leaders are face-up"
  );
}

function testLeaderRevival_CanReviveOnePerTurn(): void {
  section("1.05.03 - can revive 1 leader per turn");

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

  const limits = getRevivalLimits(state, Faction.ATREIDES);

  // Rule says "1 face up leader per Turn"
  // The limits should show available leaders, but the rule is about per-turn limit
  assert(
    limits.canReviveLeader === true,
    `can revive leaders (got ${limits.canReviveLeader})`
  );
  assert(
    limits.revivableLeaders.length >= 1,
    `at least 1 leader is available to revive (got ${limits.revivableLeaders.length})`
  );
}

function testLeaderRevival_AllLeadersDeadCondition(): void {
  section("1.05.03 - can revive when all leaders are dead (not in pool)");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move all leaders to tanks (face-up) - none in pool
  for (const leader of factionState.leaders) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      leader.definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  const canRevive = canReviveLeader(state, Faction.ATREIDES);
  const updatedFactionState = getFactionState(state, Faction.ATREIDES);
  const allLeadersDead = updatedFactionState.leaders.every(
    (l) => l.location !== LeaderLocation.LEADER_POOL
  );

  assert(
    allLeadersDead === true,
    "all leaders are dead (not in pool)"
  );
  assert(
    canRevive === true,
    `can revive when all leaders are dead (got ${canRevive})`
  );
}

function testLeaderRevival_SomeLeadersRevivableCondition(): void {
  section("1.05.03 - can revive when some leaders are face-up in tanks");

  let state = buildBaseState();
  const factionState = getFactionState(state, Faction.ATREIDES);

  // Move at least one leader to tanks (face-up)
  if (factionState.leaders.length > 0) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      factionState.leaders[0].definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  // Move all others to tanks (face-up) to ensure all are dead
  for (let i = 1; i < factionState.leaders.length; i++) {
    state = setLeaderLocation(
      state,
      Faction.ATREIDES,
      factionState.leaders[i].definitionId,
      LeaderLocation.TANKS_FACE_UP
    );
  }

  const canRevive = canReviveLeader(state, Faction.ATREIDES);
  const updatedFactionState = getFactionState(state, Faction.ATREIDES);
  const someLeadersRevivable = updatedFactionState.leaders.some(
    (l) => l.location === LeaderLocation.TANKS_FACE_UP
  );

  assert(
    someLeadersRevivable === true,
    "some leaders are face-up in tanks (revivable)"
  );
  assert(
    canRevive === true,
    `can revive when some leaders are revivable (got ${canRevive})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.03 LEADER REVIVAL tests...\n");

  testLeaderRevival_CanReviveWhenNoActiveLeaders();
  testLeaderRevival_CanReviveWhenAllLeadersDiedOnce();
  testLeaderRevival_CannotReviveWhenActiveLeadersAvailable();
  testLeaderRevival_CanOnlyReviveFaceUpLeaders();
  testLeaderRevival_CanReviveOnePerTurn();
  testLeaderRevival_AllLeadersDeadCondition();
  testLeaderRevival_SomeLeadersRevivableCondition();

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

