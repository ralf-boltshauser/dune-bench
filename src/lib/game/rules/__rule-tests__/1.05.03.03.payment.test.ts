/**
 * Rule test: 1.05.03.03 PAYMENT
 * @rule-test 1.05.03.03
 *
 * Rule text (numbered_rules/1.md):
 * "PAYMENT: All spice paid for leader revival is Placed in the Spice Bank."
 *
 * These tests exercise the core behavior of payment for leader revival:
 * - Spice is removed from faction when leader revival occurs
 * - Amount removed equals the cost (leader's strength)
 * - Spice goes to Spice Bank (not to another player)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.03.03.payment.test.ts
 */

import { Faction, LeaderLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getLeaderDefinition } from "../../data";
import { RevivalPhaseHandler } from "../../phases/handlers/revival";
import { type AgentResponse } from "../../phases/types";

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
// Tests for 1.05.03.03
// =============================================================================

function testPayment_SpiceRemovedFromFaction(): void {
  section("1.05.03.03 - spice is removed from faction when leader revival occurs");

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

  // Get first leader and their strength
  const leader = factionState.leaders[0];
  const leaderDef = getLeaderDefinition(leader.definitionId);

  if (leaderDef) {
    const beforeSpice = 10;
    state = setFactionSpice(state, Faction.ATREIDES, beforeSpice);

    // Simulate revival through handler
    const handler = new RevivalPhaseHandler();
    const initResult = handler.initialize(state);

    const response: AgentResponse = {
      factionId: Faction.ATREIDES,
      actionType: "REVIVE_LEADER",
      data: { leaderId: leader.definitionId },
    };

    const processResult = handler.processStep(initResult.state, [response]);
    const afterState = getFactionState(processResult.state, Faction.ATREIDES);
    const afterSpice = afterState.spice;

    const expectedSpice = beforeSpice - leaderDef.strength;

    assert(
      afterSpice === expectedSpice,
      `spice removed: ${beforeSpice} → ${afterSpice} (expected ${expectedSpice})`
    );
  }
}

function testPayment_AmountRemovedEqualsCost(): void {
  section("1.05.03.03 - amount removed equals the cost (leader's strength)");

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

  // Get first leader and their strength
  const leader = factionState.leaders[0];
  const leaderDef = getLeaderDefinition(leader.definitionId);

  if (leaderDef) {
    const beforeSpice = 10;
    state = setFactionSpice(state, Faction.ATREIDES, beforeSpice);

    const handler = new RevivalPhaseHandler();
    const initResult = handler.initialize(state);

    const response: AgentResponse = {
      factionId: Faction.ATREIDES,
      actionType: "REVIVE_LEADER",
      data: { leaderId: leader.definitionId },
    };

    const processResult = handler.processStep(initResult.state, [response]);
    const afterState = getFactionState(processResult.state, Faction.ATREIDES);
    const afterSpice = afterState.spice;

    const spiceRemoved = beforeSpice - afterSpice;
    const expectedCost = leaderDef.strength;

    assert(
      spiceRemoved === expectedCost,
      `spice removed (${spiceRemoved}) equals cost (${expectedCost})`
    );
  }
}

function testPayment_SpiceGoesToBank(): void {
  section("1.05.03.03 - spice goes to Spice Bank (not to another player)");

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

  // Get first leader
  const leader = factionState.leaders[0];
  const leaderDef = getLeaderDefinition(leader.definitionId);

  if (leaderDef) {
    state = setFactionSpice(state, Faction.ATREIDES, 10);
    state = setFactionSpice(state, Faction.HARKONNEN, 5); // Another faction

    const beforeHarkonnenSpice = getFactionState(state, Faction.HARKONNEN).spice;

    // Simulate revival by Atreides
    const handler = new RevivalPhaseHandler();
    const initResult = handler.initialize(state);

    const response: AgentResponse = {
      factionId: Faction.ATREIDES,
      actionType: "REVIVE_LEADER",
      data: { leaderId: leader.definitionId },
    };

    const processResult = handler.processStep(initResult.state, [response]);
    const afterHarkonnenSpice = getFactionState(processResult.state, Faction.HARKONNEN).spice;

    // Harkonnen's spice should be unchanged (spice goes to bank, not to other players)
    assert(
      afterHarkonnenSpice === beforeHarkonnenSpice,
      `Harkonnen's spice unchanged: ${beforeHarkonnenSpice} (got ${afterHarkonnenSpice}) - spice goes to bank, not to other players`
    );
  }
}

function testPayment_CostMatchesLeaderStrength(): void {
  section("1.05.03.03 - cost matches leader's strength (payment = strength)");

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

  // Test with different leaders
  for (const leader of factionState.leaders.slice(0, 2)) {
    const leaderDef = getLeaderDefinition(leader.definitionId);
    if (leaderDef) {
      const beforeSpice = 10;
      state = setFactionSpice(state, Faction.ATREIDES, beforeSpice);

      const handler = new RevivalPhaseHandler();
      const initResult = handler.initialize(state);

      const response: AgentResponse = {
        factionId: Faction.ATREIDES,
        actionType: "REVIVE_LEADER",
        data: { leaderId: leader.definitionId },
      };

      const processResult = handler.processStep(initResult.state, [response]);
      const afterState = getFactionState(processResult.state, Faction.ATREIDES);
      const spiceRemoved = beforeSpice - afterState.spice;

      assert(
        spiceRemoved === leaderDef.strength,
        `${leaderDef.name}: spice removed (${spiceRemoved}) equals strength (${leaderDef.strength})`
      );
    }
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.03.03 PAYMENT tests...\n");

  testPayment_SpiceRemovedFromFaction();
  testPayment_AmountRemovedEqualsCost();
  testPayment_SpiceGoesToBank();
  testPayment_CostMatchesLeaderStrength();

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

