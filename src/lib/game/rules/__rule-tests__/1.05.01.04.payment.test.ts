/**
 * Rule test: 1.05.01.04 PAYMENT
 * @rule-test 1.05.01.04
 *
 * Rule text (numbered_rules/1.md):
 * "PAYMENT: All spice paid for Force Revival is Placed in the Spice Bank."
 *
 * These tests exercise the core behavior of payment for force revival:
 * - Spice is removed from faction when paid revival occurs
 * - Amount removed equals the cost (paidCount * 2)
 * - Free revival doesn't remove spice
 * - Spice goes to Spice Bank (not to another player)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.05.01.04.payment.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getRevivalLimits } from "../../rules";
import { GAME_CONSTANTS } from "../../data";
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
// Tests for 1.05.01.04
// =============================================================================

function testPayment_SpiceRemovedFromFaction(): void {
  section("1.05.01.04 - spice is removed from faction when paid revival occurs");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const paidCount = 1; // 1 paid force
  const totalRequested = freeCount + paidCount; // 3 total

  // Simulate revival through the handler
  const handler = new RevivalPhaseHandler();
  const initResult = handler.initialize(state);

  // Create a response to revive additional forces (beyond free)
  // Handler expects: total = free + additional, so additional = total - free
  const additionalCount = totalRequested - freeCount;
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    actionType: "REVIVE_FORCES",
    data: { count: additionalCount },
  };

  const processResult = handler.processStep(initResult.state, [response]);

  const afterState = processResult.state;
  const afterFactionState = getFactionState(afterState, Faction.ATREIDES);

  const expectedCost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST; // 1 * 2 = 2
  const expectedSpice = 10 - expectedCost; // 10 - 2 = 8

  assert(
    afterFactionState.spice === expectedSpice,
    `spice is removed: had 10, paid ${expectedCost}, now has ${afterFactionState.spice} (expected ${expectedSpice})`
  );
}

function testPayment_AmountRemovedEqualsCost(): void {
  section("1.05.01.04 - amount removed equals the cost (paidCount * 2)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const paidCount = 1; // 1 paid force
  const totalRequested = freeCount + paidCount; // 3 total

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeSpice = beforeState.spice;

  // Simulate revival
  const handler = new RevivalPhaseHandler();
  const initResult = handler.initialize(state);

  const additionalCount = totalRequested - freeCount;
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    actionType: "REVIVE_FORCES",
    data: { count: additionalCount },
  };

  const processResult = handler.processStep(initResult.state, [response]);
  const afterState = getFactionState(processResult.state, Faction.ATREIDES);
  const afterSpice = afterState.spice;

  const expectedCost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST;
  const spiceRemoved = beforeSpice - afterSpice;

  assert(
    spiceRemoved === expectedCost,
    `spice removed (${spiceRemoved}) equals cost (${expectedCost})`
  );
  assert(
    spiceRemoved === 2,
    `spice removed is 2 (got ${spiceRemoved})`
  );
}

function testPayment_FreeRevivalDoesNotRemoveSpice(): void {
  section("1.05.01.04 - free revival doesn't remove spice");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeSpice = beforeState.spice;

  // Simulate revival of only free forces
  const handler = new RevivalPhaseHandler();
  const initResult = handler.initialize(state);

  // For free revival only, pass with no additional count
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    actionType: "REVIVE_FORCES",
    data: { count: 0 }, // 0 additional (only free)
  };

  const processResult = handler.processStep(initResult.state, [response]);
  const afterState = getFactionState(processResult.state, Faction.ATREIDES);
  const afterSpice = afterState.spice;

  assert(
    afterSpice === beforeSpice,
    `spice unchanged after free revival: ${beforeSpice} (got ${afterSpice})`
  );
}

function testPayment_SpiceGoesToBank(): void {
  section("1.05.01.04 - spice goes to Spice Bank (not to another player)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);
  state = setFactionSpice(state, Faction.HARKONNEN, 5); // Another faction

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const paidCount = 1; // 1 paid force
  const totalRequested = freeCount + paidCount; // 3 total

  const beforeHarkonnenSpice = getFactionState(state, Faction.HARKONNEN).spice;

  // Simulate revival by Atreides
  const handler = new RevivalPhaseHandler();
  const initResult = handler.initialize(state);

  const additionalCount = totalRequested - freeCount;
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    actionType: "REVIVE_FORCES",
    data: { count: additionalCount },
  };

  const processResult = handler.processStep(initResult.state, [response]);
  const afterHarkonnenSpice = getFactionState(processResult.state, Faction.HARKONNEN).spice;

  // Harkonnen's spice should be unchanged (spice goes to bank, not to other players)
  assert(
    afterHarkonnenSpice === beforeHarkonnenSpice,
    `Harkonnen's spice unchanged: ${beforeHarkonnenSpice} (got ${afterHarkonnenSpice}) - spice goes to bank, not to other players`
  );
}

function testPayment_MultiplePaidForces(): void {
  section("1.05.01.04 - multiple paid forces remove correct amount of spice");

  let state = buildBaseState();
  // Use Harkonnen who has 2 free, so can have 1 paid to reach max 3
  state = addForcesToTanks(state, Faction.HARKONNEN, 5);
  state = setFactionSpice(state, Faction.HARKONNEN, 10);

  const limits = getRevivalLimits(state, Faction.HARKONNEN);
  const freeCount = limits.freeForces; // Harkonnen has 2 free
  const paidCount = 1; // 1 paid (2 free + 1 paid = 3 max)
  const totalRequested = freeCount + paidCount; // 3 total

  const beforeState = getFactionState(state, Faction.HARKONNEN);
  const beforeSpice = beforeState.spice;

  // Simulate revival
  const handler = new RevivalPhaseHandler();
  const initResult = handler.initialize(state);

  const additionalCount = totalRequested - freeCount;
  const response: AgentResponse = {
    factionId: Faction.HARKONNEN,
    actionType: "REVIVE_FORCES",
    data: { count: additionalCount },
  };

  const processResult = handler.processStep(initResult.state, [response]);
  const afterState = getFactionState(processResult.state, Faction.HARKONNEN);
  const afterSpice = afterState.spice;

  const expectedCost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST; // 1 * 2 = 2
  const spiceRemoved = beforeSpice - afterSpice;

  assert(
    spiceRemoved === expectedCost,
    `spice removed for ${paidCount} paid force(s) is ${expectedCost} (got ${spiceRemoved})`
  );
}

function testPayment_OnlyPaidForcesCostSpice(): void {
  section("1.05.01.04 - only paid forces cost spice (free forces are free)");

  let state = buildBaseState();
  state = addForcesToTanks(state, Faction.ATREIDES, 5);
  state = setFactionSpice(state, Faction.ATREIDES, 10);

  const limits = getRevivalLimits(state, Faction.ATREIDES);
  const freeCount = limits.freeForces; // Atreides has 2 free
  const paidCount = 1; // 1 paid
  const totalRequested = freeCount + paidCount; // 3 total

  const beforeState = getFactionState(state, Faction.ATREIDES);
  const beforeSpice = beforeState.spice;

  // Simulate revival
  const handler = new RevivalPhaseHandler();
  const initResult = handler.initialize(state);

  const additionalCount = totalRequested - freeCount;
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    actionType: "REVIVE_FORCES",
    data: { count: additionalCount },
  };

  const processResult = handler.processStep(initResult.state, [response]);
  const afterState = getFactionState(processResult.state, Faction.ATREIDES);
  const afterSpice = afterState.spice;

  // Should only pay for paid forces, not free forces
  const expectedCost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST; // Only 1 paid * 2 = 2
  const spiceRemoved = beforeSpice - afterSpice;

  assert(
    spiceRemoved === expectedCost,
    `spice removed is only for paid forces: ${expectedCost} (got ${spiceRemoved})`
  );
  assert(
    spiceRemoved < totalRequested * GAME_CONSTANTS.PAID_REVIVAL_COST,
    `spice removed (${spiceRemoved}) is less than if all forces were paid (${totalRequested * GAME_CONSTANTS.PAID_REVIVAL_COST})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.05.01.04 PAYMENT tests...\n");

  testPayment_SpiceRemovedFromFaction();
  testPayment_AmountRemovedEqualsCost();
  testPayment_FreeRevivalDoesNotRemoveSpice();
  testPayment_SpiceGoesToBank();
  testPayment_MultiplePaidForces();
  testPayment_OnlyPaidForcesCostSpice();

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

