/**
 * Rule tests: 2.05.09–2.05.13 HARKONNEN TRAITORS & CAPTURED LEADERS
 *
 * Covered rules (numbered_rules/2.md):
 *
 * 2.05.09 ALLIANCE:
 * "In your ally's battle you may use your Traitor Cards on your ally's opponent.
 * This is treated as if your ally played the Traitor Card."
 *
 * 2.05.10 CAPTURED LEADERS (overview)
 * 2.05.10.01 CAPTURED LEADERS – eligible leaders
 * 2.05.10.02 KILL (2 spice, leader to tanks face down)
 * 2.05.10.03 CAPTURE (leader added to Harkonnen pool, returned after use)
 *
 * 2.05.11 PRISON BREAK:
 * "When all your own leaders have been killed, you must return all captured
 * leaders immediately to the players who last had them as an Active Leader."
 *
 * 2.05.12 TYING UP LOOSE ENDS:
 * "Killed captured leaders go to their original faction's tanks."
 *
 * 2.05.13 NO LOYALTY:
 * "Captured leaders can still be your traitors."
 *
 * @rule-test 2.05.09
 * @rule-test 2.05.10
 * @rule-test 2.05.10.01
 * @rule-test 2.05.10.02
 * @rule-test 2.05.10.03
 * @rule-test 2.05.11
 * @rule-test 2.05.12
 * @rule-test 2.05.13
 */

import {
  BattleSubPhase,
  Faction,
  LeaderLocation,
  TerritoryId,
  type GameState,
  type AgentResponse,
} from "../../types";
import { createGameState } from "../../state/factory";
import {
  captureLeader,
  killCapturedLeader,
  returnCapturedLeader,
  returnAllCapturedLeaders,
  getFactionState,
  getAvailableLeadersForCapture,
  shouldTriggerPrisonBreak,
} from "../../state";
import { requestTraitorCall } from "../../phases/handlers/battle/sub-phases/traitor";
import type {
  BattlePhaseContext,
  BattlePhaseStepResult,
} from "../../phases/handlers/battle/types";

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

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.HARKONNEN, Faction.ATREIDES, Faction.SPACING_GUILD],
    advancedRules: true,
  });
}

// =============================================================================
// 2.05.09 – Alliance traitor usage
// =============================================================================

function testHarkonnenCanUseTraitorForAllyBattle(): void {
  section("2.05.09 - Harkonnen alliance traitor usage in ally's battle");

  let state = buildBaseState();

  // Mark Harkonnen and Atreides as allies
  const hark = getFactionState(state, Faction.HARKONNEN);
  const atr = getFactionState(state, Faction.ATREIDES);

  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.HARKONNEN, {
        ...hark,
        allianceStatus: "ALLIED" as any,
        allyId: Faction.ATREIDES,
      })
      .set(Faction.ATREIDES, {
        ...atr,
        allianceStatus: "ALLIED" as any,
        allyId: Faction.HARKONNEN,
      }),
  };

  // Take a Spacing Guild leader and give Harkonnen the matching traitor
  const spacingLeader = getFactionState(state, Faction.SPACING_GUILD).leaders[0];
  const harkAfter = getFactionState(state, Faction.HARKONNEN);

  const traitorCard = {
    id: `traitor_${spacingLeader.definitionId}`,
    leaderId: spacingLeader.definitionId,
    heldBy: Faction.HARKONNEN,
  };

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.HARKONNEN, {
      ...harkAfter,
      traitors: [...harkAfter.traitors, traitorCard as any],
    }),
  };

  // Build a battle where Atreides (Harkonnen's ally) fights Spacing Guild
  const battleContext: BattlePhaseContext = {
    currentBattle: {
      territoryId: TerritoryId.CARTHAG,
      aggressor: Faction.ATREIDES,
      defender: Faction.SPACING_GUILD,
      aggressorPlan: {
        faction: Faction.ATREIDES,
        leaderId: getFactionState(state, Faction.ATREIDES).leaders[0].definitionId,
        weaponId: null,
        defenseId: null,
        spiceDialed: 0,
        traitorRevealed: false,
        kwisatzHaderachUsed: false,
      } as any,
      defenderPlan: {
        faction: Faction.SPACING_GUILD,
        leaderId: spacingLeader.definitionId,
        weaponId: null,
        defenseId: null,
        spiceDialed: 0,
        traitorRevealed: false,
        kwisatzHaderachUsed: false,
      } as any,
    },
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };

  const stepResult: BattlePhaseStepResult = requestTraitorCall(
    battleContext,
    state,
    [],
    {
      // processResolution stub – not used because traitor call is available
      processResolution: (s, events) => ({
        state: s,
        phaseComplete: true,
        pendingRequests: [],
        actions: [],
        events,
      }),
    }
  );

  const pending = stepResult.pendingRequests ?? [];

  assert(
    pending.some(
      (r) =>
        r.factionId === Faction.HARKONNEN &&
        r.requestType === "CALL_TRAITOR" &&
        (r.context as any).callingForAlly === true
    ),
    "Harkonnen receives a CALL_TRAITOR request on behalf of their ally when they have a matching traitor"
  );
}

// =============================================================================
// 2.05.13 – Captured leaders can still be traitors
// =============================================================================

function testCapturedLeaderCanBeCalledTraitor(): void {
  section("2.05.13 - captured leader can still be called traitor");

  let state = buildBaseState();

  // Capture an Atreides leader for Harkonnen
  const atreidesLeader = getFactionState(state, Faction.ATREIDES).leaders[0];
  state = captureLeader(state, Faction.HARKONNEN, Faction.ATREIDES, atreidesLeader.definitionId);

  // Give Atreides the traitor card for that leader
  const atrAfterCapture = getFactionState(state, Faction.ATREIDES);
  const traitorCard = {
    id: `traitor_${atreidesLeader.definitionId}`,
    leaderId: atreidesLeader.definitionId,
    heldBy: Faction.ATREIDES,
  };

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, {
      ...atrAfterCapture,
      traitors: [...atrAfterCapture.traitors, traitorCard as any],
    }),
  };

  // Build a battle where Harkonnen uses the captured leader against Atreides
  const battleContext: BattlePhaseContext = {
    currentBattle: {
      territoryId: TerritoryId.CARTHAG,
      aggressor: Faction.HARKONNEN,
      defender: Faction.ATREIDES,
      aggressorPlan: {
        faction: Faction.HARKONNEN,
        leaderId: atreidesLeader.definitionId, // captured leader used by Harkonnen
        weaponId: null,
        defenseId: null,
        spiceDialed: 0,
        traitorRevealed: false,
        kwisatzHaderachUsed: false,
      } as any,
      defenderPlan: null,
    },
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };

  const stepResult: BattlePhaseStepResult = requestTraitorCall(
    battleContext,
    state,
    [],
    {
      processResolution: (s, events) => ({
        state: s,
        phaseComplete: true,
        pendingRequests: [],
        actions: [],
        events,
      }),
    }
  );

  const pending = stepResult.pendingRequests ?? [];

  assert(
    pending.some(
      (r) => r.factionId === Faction.ATREIDES && r.requestType === "CALL_TRAITOR"
    ),
    "Atreides can call traitor on a captured leader they hold a traitor card for"
  );
}

// =============================================================================
// 2.05.10–2.05.12 – Captured leaders: capture, kill, return, and tying up loose ends
// =============================================================================

function testCaptureKillAndReturnCapturedLeader(): void {
  section("2.05.10–2.05.12 - capture, kill for 2 spice, and return captured leaders");

  let state = buildBaseState();

  const atreidesLeader = getFactionState(state, Faction.ATREIDES).leaders[0];
  const leaderId = atreidesLeader.definitionId;

  // Capture the leader for Harkonnen
  state = captureLeader(state, Faction.HARKONNEN, Faction.ATREIDES, leaderId);

  const harkAfterCapture = getFactionState(state, Faction.HARKONNEN);
  const captured = harkAfterCapture.leaders.find((l) => l.definitionId === leaderId);

  assert(
    captured &&
      captured.capturedBy === Faction.HARKONNEN &&
      captured.location === LeaderLocation.LEADER_POOL,
    "Captured leader is moved into Harkonnen leader pool with capturedBy metadata"
  );

  // Kill the captured leader (TYING UP LOOSE ENDS + KILL path)
  const spiceBefore = harkAfterCapture.spice;
  state = killCapturedLeader(state, Faction.HARKONNEN, leaderId);

  const harkAfterKill = getFactionState(state, Faction.HARKONNEN);
  const atreidesAfterKill = getFactionState(state, Faction.ATREIDES);
  const killedLeader = atreidesAfterKill.leaders.find((l) => l.definitionId === leaderId);

  assert(
    killedLeader &&
      killedLeader.location === LeaderLocation.TANKS_FACE_DOWN &&
      killedLeader.hasBeenKilled === true,
    "Killed captured leader is placed face-down in original owner's tanks"
  );

  assert(
    harkAfterKill.spice === spiceBefore + 2,
    "Killing a captured leader grants Harkonnen 2 spice"
  );

  // Capture a second leader and then return it (non-kill path)
  const secondLeader = atreidesAfterKill.leaders.find(
    (l) => l.location === LeaderLocation.LEADER_POOL
  );

  if (!secondLeader) {
    throw new Error("Expected a second Atreides leader in pool for capture test");
  }

  state = captureLeader(
    state,
    Faction.HARKONNEN,
    Faction.ATREIDES,
    secondLeader.definitionId
  );

  state = returnCapturedLeader(state, secondLeader.definitionId);

  const harkAfterReturn = getFactionState(state, Faction.HARKONNEN);
  const atreidesAfterReturn = getFactionState(state, Faction.ATREIDES);

  const returnedLeader = atreidesAfterReturn.leaders.find(
    (l) => l.definitionId === secondLeader.definitionId
  );

  assert(
    returnedLeader &&
      returnedLeader.location === LeaderLocation.LEADER_POOL &&
      returnedLeader.capturedBy === null,
    "ReturnCapturedLeader moves captured leader back to original owner's active pool"
  );

  assert(
    !harkAfterReturn.leaders.some((l) => l.definitionId === secondLeader.definitionId),
    "After return, Harkonnen no longer holds the captured leader"
  );
}

// =============================================================================
// 2.05.10.01 & 2.05.11 – Available leaders for capture & Prison Break trigger
// =============================================================================

function testAvailableLeadersForCaptureAndPrisonBreak(): void {
  section("2.05.10.01 & 2.05.11 - available leaders and Prison Break");

  let state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const territoryId = TerritoryId.CARTHAG;

  // Mark one leader as used in the battle territory and one as used elsewhere
  const [battleLeader, elsewhereLeader] = atreidesState.leaders.slice(0, 2);

  const updatedLeaders = atreidesState.leaders.map((l) => {
    if (l.definitionId === battleLeader.definitionId) {
      return {
        ...l,
        usedThisTurn: true,
        usedInTerritoryId: territoryId,
      };
    }
    if (l.definitionId === elsewhereLeader.definitionId) {
      return {
        ...l,
        usedThisTurn: true,
        usedInTerritoryId: TerritoryId.ARRAKEEN,
      };
    }
    return l;
  });

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: updatedLeaders,
    }),
  };

  const available = getAvailableLeadersForCapture(state, Faction.ATREIDES, territoryId);

  assert(
    available.some((l) => l.definitionId === battleLeader.definitionId),
    "Leader used in the battle territory is available for capture"
  );

  assert(
    !available.some((l) => l.definitionId === elsewhereLeader.definitionId),
    "Leader used elsewhere this turn is not available for capture"
  );

  // Now simulate all Harkonnen own leaders dead and captured leaders present
  let hark = getFactionState(state, Faction.HARKONNEN);
  const ownLeaders = hark.leaders.filter((l) => l.originalFaction === Faction.HARKONNEN);

  const deadOwnLeaders = ownLeaders.map((l) => ({
    ...l,
    location: LeaderLocation.TANKS_FACE_UP,
  }));

  // Add a captured leader so Prison Break can trigger
  const capturedLeader = {
    ...atreidesState.leaders[0],
    faction: Faction.HARKONNEN,
    capturedBy: Faction.HARKONNEN,
    location: LeaderLocation.LEADER_POOL,
  };

  hark = {
    ...hark,
    leaders: [...deadOwnLeaders, capturedLeader as any],
  };

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.HARKONNEN, hark),
  };

  assert(
    shouldTriggerPrisonBreak(state, Faction.HARKONNEN),
    "Prison Break triggers when all own leaders are dead and captured leaders exist"
  );

  const stateAfterPrisonBreak = returnAllCapturedLeaders(state, Faction.HARKONNEN);
  const harkAfterPB = getFactionState(stateAfterPrisonBreak, Faction.HARKONNEN);

  assert(
    !harkAfterPB.leaders.some((l) => l.capturedBy !== null),
    "All captured leaders are returned to their owners after Prison Break"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.05.09–2.05.13 HARKONNEN TRAITORS & CAPTURED LEADERS");
  console.log("=".repeat(80));

  try {
    testHarkonnenCanUseTraitorForAllyBattle();
    testCapturedLeaderCanBeCalledTraitor();
    testCaptureKillAndReturnCapturedLeader();
    testAvailableLeadersForCaptureAndPrisonBreak();
  } catch (error) {
    console.error("Unexpected error during 2.05.09–2.05.13 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.05.09–2.05.13 rule tests failed");
  }
}


