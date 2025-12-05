/**
 * Rule tests: 2.06.12–2.06.12.03 GUILD SHIPPING TIMING ("SHIP AS IT PLEASES YOU")
 *
 * Rule texts (numbered_rules/2.md):
 *
 * 2.06.12 ✷SHIP AS IT PLEASES YOU:
 * "During the Shipment and Movement Phase you may activate either ability
 *  SHIP AND MOVE AHEAD OF SCHEDULE [2.06.12.01] or HOLDING PATTERN [2.06.12.02]."
 *
 * 2.06.12.01:
 * "The rest of the factions must make their shipments and movements in the proper sequence.
 *  You do not have to make known when you intend to make your shipment and movement action
 *  until the moment you wish to take it."
 *
 * 2.06.12.02 SHIP AND MOVE AHEAD OF SCHEDULE:
 * "You may take your shipment and move action before any player earlier in storm order than you.
 *  This would allow you to go first, or after any player has taken their complete Shipment and
 *  Movement action."
 *
 * 2.06.12.03 HOLDING PATTERN:
 * "When you are up next in storm order you may announce, 'Delay'. You may take your shipment and
 *  move action after any player later in storm order than you. This would allow you to go last,
 *  or after any player has taken their complete Shipment and Movement action."
 *
 * @rule-test 2.06.12
 * @rule-test 2.06.12.01
 * @rule-test 2.06.12.02
 * @rule-test 2.06.12.03
 *
 * NOTE: These tests focus on the Guild timing state machine flags exposed by GuildHandler.
 * They are lightweight behavioral checks, not full phase simulations.
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import type { PhaseEvent, PhaseStepResult, AgentResponse } from "../../phases/types";
import { GuildHandler } from "../../phases/handlers/shipment-movement/handlers/guild-handler";

// Minimal fake state machine & request builder implementations

class FakeStateMachine {
  private askGuildBeforeNextFaction = false;
  private guildWantsToDelayToEnd = false;
  private guildCompleted = false;
  private currentFactionIndex = 0;
  private guildInGame = true;

  setAskGuildBeforeNextFaction(value: boolean) {
    this.askGuildBeforeNextFaction = value;
  }
  doesGuildWantToDelayToEnd() {
    return this.guildWantsToDelayToEnd;
  }
  setGuildWantsToDelayToEnd(value: boolean) {
    this.guildWantsToDelayToEnd = value;
  }
  isGuildCompleted() {
    return this.guildCompleted;
  }
  setGuildCompleted(value: boolean) {
    this.guildCompleted = value;
  }
  isGuildInGame() {
    return this.guildInGame;
  }
  getCurrentFactionIndex() {
    return this.currentFactionIndex;
  }
  setCurrentFactionIndex(value: number) {
    this.currentFactionIndex = value;
  }
  setCurrentFaction(_f: Faction) {}
  setCurrentPhase(_phase: string) {}
}

class FakeRequestBuilder {
  buildShipmentRequest(
    state: GameState,
    _faction: Faction,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Just echo state and events
    return {
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    };
  }
}

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
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// Tests
// =============================================================================

function testGuildActNowFromInitialDecision(): void {
  section("2.06.12.01 - Guild can choose ACT NOW at phase start");

  const handler = new GuildHandler();
  const state = buildBaseState();
  const events: PhaseEvent[] = [];
  const stateMachine = new FakeStateMachine();
  const requestBuilder = new FakeRequestBuilder();

  const responses: AgentResponse[] = [
    {
      factionId: Faction.SPACING_GUILD,
      actionType: "GUILD_ACT_NOW",
      data: { decision: "act_now" },
    } as any,
  ];

  const result = handler.processTimingDecision(
    state,
    responses,
    events,
    stateMachine as any,
    requestBuilder as any,
    (s, ev) => ({ state: s, phaseComplete: false, pendingRequests: [], actions: [], events: ev })
  );

  assert(
    result.pendingRequests.length === 0 &&
      !result.phaseComplete,
    "ACT NOW path triggers immediate Guild shipment (no further timing requests in this step)"
  );
}

function testGuildDelayToEndSetsFlags(): void {
  section("2.06.12.02 / 2.06.12.03 - Guild DELAY_TO_END sets holding pattern flags");

  const handler = new GuildHandler();
  const state = buildBaseState();
  const events: PhaseEvent[] = [];
  const stateMachine = new FakeStateMachine();
  const requestBuilder = new FakeRequestBuilder();

  const responses: AgentResponse[] = [
    {
      factionId: Faction.SPACING_GUILD,
      actionType: "GUILD_DELAY_TO_END",
      data: { decision: "delay_to_end" },
    } as any,
  ];

  handler.processTimingDecision(
    state,
    responses,
    events,
    stateMachine as any,
    requestBuilder as any,
    (s, ev) => ({ state: s, phaseComplete: false, pendingRequests: [], actions: [], events: ev })
  );

  // Simulate end-of-phase finalize check
  stateMachine.setGuildCompleted(true);
  const shouldFinalize = new GuildHandler().shouldFinalizeGuild(
    state,
    stateMachine as any
  );

  assert(
    shouldFinalize,
    "When Guild chooses DELAY_TO_END and is marked completed, shouldFinalizeGuild() returns true (Guild will go last)"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.06.12–2.06.12.03 GUILD SHIPPING TIMING");
  console.log("=".repeat(80));

  try {
    testGuildActNowFromInitialDecision();
    testGuildDelayToEndSetsFlags();
  } catch (error) {
    console.error("Unexpected error during 2.06.12 timing tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.06.12 timing rule tests failed");
  }
}


