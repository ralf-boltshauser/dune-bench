/**
 * Rule test: 1.07.07 LEADER RETURN
 * @rule-test 1.07.07
 *
 * Rule text (numbered_rules/1.md):
 * "LEADER RETURN: After all battles have been fought, players collect any of their leaders used in battle still in Territories adding them to their Leader Pool."
 *
 * This rule establishes what happens at the end of the Battle Phase:
 * - All leaders used in battle that survived (ON_BOARD) are collected
 * - These leaders leave the territories and return to their owner's Leader Pool
 * - Leaders that were killed (in tanks) are NOT returned
 * - Leaders that never left the pool are unaffected
 * - Captured leaders follow their own capture/return rules (2.05.10.03, 2.05.11)
 *
 * These tests verify:
 * - Surviving leaders marked as ON_BOARD return to LEADER_POOL on cleanup
 * - Leaders not used in battle (remain in pool) are unchanged
 * - Killed leaders in tanks are NOT returned
 * - Leaders from multiple factions are all reset correctly
 * - Harkonnen captured-leader logic is not regressed by cleanup (sanity check)
 *
 * Run with:
 *   pnpm test
 */

import {
  Faction,
  Phase,
  TerritoryId,
  LeaderLocation,
  type GameState,
} from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { markLeaderUsed, killLeader } from "../../state/mutations/leaders";
import { captureLeader } from "../../state/mutations/leaders-harkonnen";
import { cleanupBattlePhase } from "../../phases/handlers/battle/cleanup/cleanup-phase";

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

function buildBaseState(
  factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]
): GameState {
  const actualFactions =
    factions.length >= 2 ? factions : [Faction.ATREIDES, Faction.HARKONNEN];
  const state = createGameState({
    factions: actualFactions,
    turn: 1,
    phase: Phase.BATTLE,
    advancedRules: false,
  });
  return {
    ...state,
    stormOrder: actualFactions,
    stormSector: 0,
  };
}

// Convenience to get a leader id that we know exists
function getLeaderId(state: GameState, faction: Faction): string {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders[0];
  if (!leader) {
    throw new Error(`No leaders found for faction ${faction}`);
  }
  return leader.definitionId;
}

// =============================================================================
// Tests
// =============================================================================

function testLeaderReturn_SurvivingLeadersReturnToPool(): void {
  section("Surviving ON_BOARD leaders return to pool on cleanup");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);

  const atreidesLeaderId = getLeaderId(state, Faction.ATREIDES);
  const harkonnenLeaderId = getLeaderId(state, Faction.HARKONNEN);

  // Simulate both leaders being used in battle and surviving (ON_BOARD)
  const territory = TerritoryId.IMPERIAL_BASIN;
  let workingState = markLeaderUsed(
    state,
    Faction.ATREIDES,
    atreidesLeaderId,
    territory
  );
  workingState = markLeaderUsed(
    workingState,
    Faction.HARKONNEN,
    harkonnenLeaderId,
    territory
  );

  const beforeAtreides = getFactionState(workingState, Faction.ATREIDES);
  const beforeHarkonnen = getFactionState(workingState, Faction.HARKONNEN);

  const atreidesLeaderBefore = beforeAtreides.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;
  const harkonnenLeaderBefore = beforeHarkonnen.leaders.find(
    (l) => l.definitionId === harkonnenLeaderId
  )!;

  assert(
    atreidesLeaderBefore.location === LeaderLocation.ON_BOARD,
    `Atreides leader should start ON_BOARD before cleanup, got ${atreidesLeaderBefore.location}`
  );
  assert(
    harkonnenLeaderBefore.location === LeaderLocation.ON_BOARD,
    `Harkonnen leader should start ON_BOARD before cleanup, got ${harkonnenLeaderBefore.location}`
  );

  const afterCleanup = cleanupBattlePhase(workingState);

  const atreidesAfter = getFactionState(afterCleanup, Faction.ATREIDES);
  const harkonnenAfter = getFactionState(afterCleanup, Faction.HARKONNEN);

  const atreidesLeaderAfter = atreidesAfter.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;
  const harkonnenLeaderAfter = harkonnenAfter.leaders.find(
    (l) => l.definitionId === harkonnenLeaderId
  )!;

  assert(
    atreidesLeaderAfter.location === LeaderLocation.LEADER_POOL,
    `Atreides leader should be in LEADER_POOL after cleanup, got ${atreidesLeaderAfter.location}`
  );
  assert(
    harkonnenLeaderAfter.location === LeaderLocation.LEADER_POOL,
    `Harkonnen leader should be in LEADER_POOL after cleanup, got ${harkonnenLeaderAfter.location}`
  );

  assert(
    atreidesLeaderAfter.usedThisTurn === false,
    `Atreides leader usedThisTurn should be reset to false after cleanup`
  );
  assert(
    atreidesLeaderAfter.usedInTerritoryId === null,
    `Atreides leader usedInTerritoryId should be reset to null after cleanup`
  );
  assert(
    harkonnenLeaderAfter.usedThisTurn === false,
    `Harkonnen leader usedThisTurn should be reset to false after cleanup`
  );
  assert(
    harkonnenLeaderAfter.usedInTerritoryId === null,
    `Harkonnen leader usedInTerritoryId should be reset to null after cleanup`
  );
}

function testLeaderReturn_KilledLeadersDoNotReturn(): void {
  section("Killed leaders in tanks do not return on cleanup");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);

  const atreidesLeaderId = getLeaderId(state, Faction.ATREIDES);

  // Kill the leader (send to tanks)
  const killedState = killLeader(state, Faction.ATREIDES, atreidesLeaderId, true);
  const before = getFactionState(killedState, Faction.ATREIDES);
  const leaderBefore = before.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;

  assert(
    leaderBefore.location === LeaderLocation.TANKS_FACE_UP ||
      leaderBefore.location === LeaderLocation.TANKS_FACE_DOWN,
    `Leader should be in tanks before cleanup, got ${leaderBefore.location}`
  );

  const afterCleanup = cleanupBattlePhase(killedState);
  const after = getFactionState(afterCleanup, Faction.ATREIDES);
  const leaderAfter = after.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;

  assert(
    leaderAfter.location === leaderBefore.location,
    `Killed leader location should remain in tanks after cleanup (no return), was ${leaderBefore.location}, now ${leaderAfter.location}`
  );
  assert(
    leaderAfter.hasBeenKilled === true,
    `Killed leader should remain marked as killed after cleanup`
  );
}

function testLeaderReturn_LeadersNotUsedRemainInPool(): void {
  section("Leaders not used in battle remain in pool");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);

  const atreidesLeaderId = getLeaderId(state, Faction.ATREIDES);
  const harkonnenLeaderId = getLeaderId(state, Faction.HARKONNEN);

  const beforeAtreides = getFactionState(state, Faction.ATREIDES);
  const beforeHarkonnen = getFactionState(state, Faction.HARKONNEN);

  const atreidesLeaderBefore = beforeAtreides.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;
  const harkonnenLeaderBefore = beforeHarkonnen.leaders.find(
    (l) => l.definitionId === harkonnenLeaderId
  )!;

  assert(
    atreidesLeaderBefore.location === LeaderLocation.LEADER_POOL,
    `Atreides leader should start in LEADER_POOL before cleanup, got ${atreidesLeaderBefore.location}`
  );
  assert(
    harkonnenLeaderBefore.location === LeaderLocation.LEADER_POOL,
    `Harkonnen leader should start in LEADER_POOL before cleanup, got ${harkonnenLeaderBefore.location}`
  );

  const afterCleanup = cleanupBattlePhase(state);

  const atreidesAfter = getFactionState(afterCleanup, Faction.ATREIDES);
  const harkonnenAfter = getFactionState(afterCleanup, Faction.HARKONNEN);

  const atreidesLeaderAfter = atreidesAfter.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;
  const harkonnenLeaderAfter = harkonnenAfter.leaders.find(
    (l) => l.definitionId === harkonnenLeaderId
  )!;

  assert(
    atreidesLeaderAfter.location === LeaderLocation.LEADER_POOL,
    `Atreides leader should remain in LEADER_POOL after cleanup, got ${atreidesLeaderAfter.location}`
  );
  assert(
    harkonnenLeaderAfter.location === LeaderLocation.LEADER_POOL,
    `Harkonnen leader should remain in LEADER_POOL after cleanup, got ${harkonnenLeaderAfter.location}`
  );
}

function testLeaderReturn_CapturedLeadersHandledSeparately(): void {
  section("Captured leaders handled by capture rules (sanity check)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);

  // Capture an Atreides leader with Harkonnen
  const atreidesLeaderId = getLeaderId(state, Faction.ATREIDES);
  let workingState = captureLeader(
    state,
    Faction.HARKONNEN,
    Faction.ATREIDES,
    atreidesLeaderId
  );

  // Use the captured leader in battle for Harkonnen (simulate ON_BOARD captured leader)
  const territory = TerritoryId.IMPERIAL_BASIN;
  workingState = markLeaderUsed(
    workingState,
    Faction.HARKONNEN,
    atreidesLeaderId,
    territory
  );

  const beforeHarkonnen = getFactionState(workingState, Faction.HARKONNEN);
  const capturedBefore = beforeHarkonnen.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  )!;

  assert(
    capturedBefore.capturedBy === Faction.HARKONNEN,
    `Captured leader should have capturedBy set to HARKONNEN before cleanup`
  );
  assert(
    capturedBefore.location === LeaderLocation.ON_BOARD,
    `Captured leader used in battle should be ON_BOARD before cleanup, got ${capturedBefore.location}`
  );

  const afterCleanup = cleanupBattlePhase(workingState);
  const harkonnenAfter = getFactionState(afterCleanup, Faction.HARKONNEN);

  const capturedAfter = harkonnenAfter.leaders.find(
    (l) => l.definitionId === atreidesLeaderId
  );

  // cleanupBattlePhase should not itself return captured leaders; that is handled by
  // the dedicated Harkonnen capture rules (2.05.10.03, 2.05.11).
  // We just assert that cleanup doesn't crash and that the captured leader is still tracked.
  assert(
    capturedAfter !== undefined,
    `Captured leader should still be tracked after cleanup (capture rules handle actual return)`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.07: LEADER RETURN");
  console.log("=".repeat(80));

  testLeaderReturn_SurvivingLeadersReturnToPool();
  testLeaderReturn_KilledLeadersDoNotReturn();
  testLeaderReturn_LeadersNotUsedRemainInPool();
  testLeaderReturn_CapturedLeadersHandledSeparately();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();


