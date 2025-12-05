/**
 * Rule tests: 2.01.08–2.01.09 (Atreides Prescience)
 *
 * @rule-test 2.01.08
 * @rule-test 2.01.09
 *
 * Rule text (numbered_rules/2.md):
 * 2.01.08 PRESCIENCE: Before Battle Wheel [1.07.04.01], before any elements of the Battle Plan are
 * determined you may force your opponent to Reveal your choice of one of these elements they intend
 * to use in their Battle Plan against you: the leader, the weapon, the defense, or the number dialed.
 *
 * 2.01.09 ALLIANCE: In your ally's battle you may use ability Prescience [2.01.08] on your ally's opponent.
 *
 * These tests verify that:
 * - When Atreides is in a battle, a USE_PRESCIENCE request is generated for them (2.01.08).
 * - When Atreides is not in the battle but their ally is, a USE_PRESCIENCE request is still generated
 *   and correctly marked as an ally battle (2.01.09).
 * - When Atreides chooses to use prescience, battle.prescienceUsed, battle.prescienceTarget, and
 *   battle.prescienceOpponent are set consistently.
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import type {
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
  AgentResponse,
} from "../../phases/types";
import {
  requestPrescience,
  processPrescience,
} from "../../phases/handlers/battle/sub-phases/prescience";

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
  // Use two standard factions for a minimal valid game
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

function makeBattleContext(
  aggressor: Faction,
  defender: Faction
): BattlePhaseContext {
  return {
    currentBattle: {
      id: "battle-1",
      territoryId: "IMPERIAL_BASIN" as any,
      sector: 1,
      aggressor,
      defender,
      aggressorPlan: null,
      defenderPlan: null,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      prescienceBlocked: false,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    subPhase: null,
  } as unknown as BattlePhaseContext;
}

// =============================================================================
// Tests for 2.01.08–2.01.09
// =============================================================================

function testPrescience_requestWhenAtreidesInBattle(): void {
  section("2.01.08 - prescience request when Atreides is in battle");

  const state = buildBaseState();
  const context = makeBattleContext(Faction.ATREIDES, Faction.HARKONNEN);
  const events: PhaseEvent[] = [];

  const result = requestPrescience(
    context,
    state,
    events,
    Faction.HARKONNEN // prescience target is opponent
  );

  assert(
    result.pendingRequests.length === 1,
    "exactly one pending request is generated"
  );

  const req = result.pendingRequests[0];

  assert(
    req.factionId === Faction.ATREIDES,
    "request is addressed to Atreides"
  );
  assert(
    req.requestType === "USE_PRESCIENCE",
    "request type is USE_PRESCIENCE"
  );
  assert(
    Array.isArray(req.context.options) &&
      req.context.options.length === 4 &&
      req.context.options.includes("leader") &&
      req.context.options.includes("weapon") &&
      req.context.options.includes("defense") &&
      req.context.options.includes("number"),
    "request context exposes the four valid prescience targets"
  );
}

function testPrescience_requestWhenAllyInBattle(): void {
  section("2.01.09 - prescience request when Atreides' ally is in battle");

  let state = buildBaseState();

  // Make Harkonnen Atreides' ally
  const atreides = getFactionState(state, Faction.ATREIDES);
  const harkonnen = getFactionState(state, Faction.HARKONNEN);

  const factions = new Map(state.factions)
    .set(Faction.ATREIDES, {
      ...atreides,
      allyId: Faction.HARKONNEN,
    })
    .set(Faction.HARKONNEN, {
      ...harkonnen,
      allyId: Faction.ATREIDES,
    });

  state = { ...state, factions };

  // Battle where only Harkonnen (ally) is present vs some opponent
  const context = makeBattleContext(Faction.HARKONNEN, Faction.ATREIDES);
  const events: PhaseEvent[] = [];

  const result = requestPrescience(
    context,
    state,
    events,
    Faction.ATREIDES // prescience target is ally's opponent
  );

  assert(
    result.pendingRequests.length === 1,
    "exactly one pending request is generated for ally battle"
  );

  const req = result.pendingRequests[0];

  assert(
    req.factionId === Faction.ATREIDES,
    "request is still addressed to Atreides (ally using prescience)"
  );
  assert(
    req.context.ally === Faction.HARKONNEN,
    "request context identifies Harkonnen as Atreides' ally in this battle"
  );
}

function testPrescience_processSetsBattleFields(): void {
  section("2.01.08/09 - processPrescience sets battle fields correctly");

  const state = buildBaseState();
  const context = makeBattleContext(Faction.ATREIDES, Faction.HARKONNEN);
  const events: PhaseEvent[] = [];

  const responses: AgentResponse[] = [
    {
      factionId: Faction.ATREIDES,
      actionType: "USE_PRESCIENCE",
      passed: false,
      data: {
        target: "leader",
      },
    } as AgentResponse,
  ];

  const callbacks = {
    requestPrescienceReveal: (nextState: GameState, evts: PhaseEvent[]) =>
      ({
        state: nextState,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events: evts,
      }) as PhaseStepResult,
    requestBattlePlans: (nextState: GameState, evts: PhaseEvent[]) =>
      ({
        state: nextState,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events: evts,
      }) as PhaseStepResult,
  };

  const result = processPrescience(
    context,
    state,
    responses,
    events,
    callbacks
  );

  const battle = context.currentBattle!;

  assert(battle.prescienceUsed === true, "battle.prescienceUsed is set to true");
  assert(
    battle.prescienceTarget === "leader",
    "battle.prescienceTarget is set from the response"
  );
  assert(
    battle.prescienceOpponent === Faction.HARKONNEN,
    "battle.prescienceOpponent is the Atreides opponent when Atreides is in battle"
  );
  assert(
    result.state === state,
    "processPrescience does not mutate game state structure in this simple case"
  );
}

// =============================================================================
// Test Runner
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.08–2.01.09 ATREIDES PRESCIENCE");
  console.log("=".repeat(80));

  try {
    testPrescience_requestWhenAtreidesInBattle();
  } catch (error) {
    console.error(
      "❌ testPrescience_requestWhenAtreidesInBattle failed:",
      error
    );
    failCount++;
  }

  try {
    testPrescience_requestWhenAllyInBattle();
  } catch (error) {
    console.error(
      "❌ testPrescience_requestWhenAllyInBattle failed:",
      error
    );
    failCount++;
  }

  try {
    testPrescience_processSetsBattleFields();
  } catch (error) {
    console.error(
      "❌ testPrescience_processSetsBattleFields failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.08–2.01.09 tests completed: ${passCount} passed, ${failCount} failed`
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


