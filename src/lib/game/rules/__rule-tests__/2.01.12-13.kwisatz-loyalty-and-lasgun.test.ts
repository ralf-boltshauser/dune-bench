/**
 * Rule tests: 2.01.12–2.01.13 (Atreides Loyalty and Prophecy Blinded)
 *
 * @rule-test 2.01.12
 * @rule-test 2.01.13
 *
 * Rule text (numbered_rules/2.md):
 * 2.01.12 ATREIDES LOYALTY: A leader accompanied by Kwisatz Haderach can not turn traitor.
 * 2.01.13 PROPHECY BLINDED: The Kwisatz Haderach token can only be killed if blown up by a
 *                           lasgun/shield explosion.
 *
 * These tests verify that:
 * - When Atreides uses Kwisatz Haderach with their leader, traitor opportunities against that
 *   leader are blocked (requestTraitorCall does not offer CALL_TRAITOR, but emits TRAITOR_BLOCKED).
 * - Kwisatz Haderach is killed by applyLasgunExplosion only when Atreides used it in that battle,
 *   and not otherwise.
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import {
  getFactionState,
  updateFactionState,
} from "../../state";
import type {
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../phases/types";
import {
  requestTraitorCall,
} from "../../phases/handlers/battle/sub-phases/traitor";
import { applyLasgunExplosion } from "../../phases/handlers/battle/resolution/lasgun-explosion";

// =============================================================================
// Minimal test harness
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
    advancedRules: true,
  });
}

function makeBattleContextWithPlans(): BattlePhaseContext {
  return {
    currentBattle: {
      id: "battle-1",
      territoryId: "IMPERIAL_BASIN" as any,
      sector: 1,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan: {
        leaderId: "atreides_leader_1",
        kwisatzHaderachUsed: true,
      } as any,
      defenderPlan: {
        leaderId: "harkonnen_leader_1",
      } as any,
    },
    subPhase: null,
  } as unknown as BattlePhaseContext;
}

// =============================================================================
// Tests for 2.01.12 – ATREIDES LOYALTY
// =============================================================================

function testAtreidesLoyalty_blocksTraitorWhenKwisatzUsed(): void {
  section("2.01.12 - Atreides Loyalty blocks traitor when Kwisatz is used");

  let state = buildBaseState();

  // Give Harkonnen a traitor card matching the Atreides leader in the battle
  const harkonnen = getFactionState(state, Faction.HARKONNEN);
  const traitorCard = {
    leaderId: "atreides_leader_1",
    leaderName: "Atreides Leader 1",
    leaderFaction: Faction.ATREIDES,
    heldBy: Faction.HARKONNEN,
  };

  const newHarkonnen = {
    ...harkonnen,
    traitors: [traitorCard as any],
  };

  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.HARKONNEN, newHarkonnen),
  };

  const context = makeBattleContextWithPlans();
  const events: PhaseEvent[] = [];

  const result = requestTraitorCall(context, state, events, {
    processResolution: (s, evts) =>
      ({
        state: s,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events: evts,
      }) as PhaseStepResult,
  });

  const hasTraitorRequest = result.pendingRequests.some(
    (req) => req.requestType === "CALL_TRAITOR"
  );

  assert(
    hasTraitorRequest === false,
    "Harkonnen does not receive a CALL_TRAITOR request when Atreides leader is protected by Kwisatz"
  );

  const blockedEvent = events.find(
    (e) => e.type === "TRAITOR_BLOCKED"
  );

  assert(
    !!blockedEvent,
    "A TRAITOR_BLOCKED event is emitted when Kwisatz protects the leader"
  );
}

// =============================================================================
// Tests for 2.01.13 – PROPHECY BLINDED (lasgun explosion)
// =============================================================================

function testProphecyBlinded_killsKwisatzOnlyOnLasgunExplosionWhenUsed(): void {
  section("2.01.13 - Kwisatz is killed by lasgun explosion when used");

  let state = buildBaseState();

  // Ensure Kwisatz exists and is not dead
  let atreides = getFactionState(state, Faction.ATREIDES);
  state = updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach!,
      isDead: false,
    },
  });

  // Battle where Atreides as aggressor used Kwisatz
  const battle = {
    id: "battle-1",
    territoryId: "IMPERIAL_BASIN" as any,
    sector: 1,
    aggressor: Faction.ATREIDES,
    defender: Faction.HARKONNEN,
    aggressorPlan: {
      leaderId: "atreides_leader_1",
      kwisatzHaderachUsed: true,
    } as any,
    defenderPlan: {
      leaderId: "harkonnen_leader_1",
      kwisatzHaderachUsed: false,
    } as any,
  } as any;

  const events: PhaseEvent[] = [];

  const newState = applyLasgunExplosion(state, battle, events);

  const atreidesAfter = getFactionState(newState, Faction.ATREIDES);

  assert(
    atreidesAfter.kwisatzHaderach?.isDead === true,
    "Kwisatz Haderach is killed by lasgun explosion when Atreides used it"
  );

  const killEvent = events.find(
    (e) => e.type === "KWISATZ_HADERACH_KILLED"
  );

  assert(
    !!killEvent,
    "KWISATZ_HADERACH_KILLED event is emitted when lasgun explosion kills Kwisatz"
  );
}

function testProphecyBlinded_doesNotKillKwisatzWithoutLasgunOrUsage(): void {
  section("2.01.13 - Kwisatz is not killed when not used in lasgun explosion");

  let state = buildBaseState();

  // Ensure Kwisatz exists and is not dead
  let atreides = getFactionState(state, Faction.ATREIDES);
  state = updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach!,
      isDead: false,
    },
  });

  // Battle where Kwisatz is NOT used by either side
  const battle = {
    id: "battle-2",
    territoryId: "IMPERIAL_BASIN" as any,
    sector: 1,
    aggressor: Faction.ATREIDES,
    defender: Faction.HARKONNEN,
    aggressorPlan: {
      leaderId: "atreides_leader_1",
      kwisatzHaderachUsed: false,
    } as any,
    defenderPlan: {
      leaderId: "harkonnen_leader_1",
      kwisatzHaderachUsed: false,
    } as any,
  } as any;

  const events: PhaseEvent[] = [];

  const newState = applyLasgunExplosion(state, battle, events);
  const atreidesAfter = getFactionState(newState, Faction.ATREIDES);

  assert(
    atreidesAfter.kwisatzHaderach?.isDead === false,
    "Kwisatz Haderach is not killed if it was not used in the battle"
  );

  const killEvent = events.find(
    (e) => e.type === "KWISATZ_HADERACH_KILLED"
  );

  assert(
    !killEvent,
    "No KWISATZ_HADERACH_KILLED event is emitted when Kwisatz was not used"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.12–2.01.13 ATREIDES LOYALTY & PROPHECY BLINDED");
  console.log("=".repeat(80));

  try {
    testAtreidesLoyalty_blocksTraitorWhenKwisatzUsed();
  } catch (error) {
    console.error(
      "❌ testAtreidesLoyalty_blocksTraitorWhenKwisatzUsed failed:",
      error
    );
    failCount++;
  }

  try {
    testProphecyBlinded_killsKwisatzOnlyOnLasgunExplosionWhenUsed();
  } catch (error) {
    console.error(
      "❌ testProphecyBlinded_killsKwisatzOnlyOnLasgunExplosionWhenUsed failed:",
      error
    );
    failCount++;
  }

  try {
    testProphecyBlinded_doesNotKillKwisatzWithoutLasgunOrUsage();
  } catch (error) {
    console.error(
      "❌ testProphecyBlinded_doesNotKillKwisatzWithoutLasgunOrUsage failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.12–2.01.13 tests completed: ${passCount} passed, ${failCount} failed`
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


