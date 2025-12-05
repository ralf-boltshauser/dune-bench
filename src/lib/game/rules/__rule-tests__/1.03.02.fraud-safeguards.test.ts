/**
 * Rule test: 1.03.02 FRAUD SAFE GUARDS
 * @rule-test 1.03.02
 *
 * Rule text (numbered_rules/1.md):
 * "A Player may only Claim CHOAM Charity once a Turn."
 *
 * These tests exercise the fraud safeguard behavior:
 * - A faction can only claim charity once per turn
 * - Attempting to claim twice in the same turn is blocked
 * - The processedFactions set tracks which factions have already claimed
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.03.02.fraud-safeguards.test.ts
 */

import { ChoamCharityPhaseHandler } from "../../phases/handlers/choam-charity";
import type { AgentResponse } from "../../phases/types";
import { getFactionState } from "../../state";
import { createGameState } from "../../state/factory";
import { Faction, type GameState } from "../../types";

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

function setFactionSpice(
  state: GameState,
  faction: Faction,
  spice: number
): GameState {
  const factionState = getFactionState(state, faction);
  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      spice,
    }),
  };
}

function makeCharityResponse(faction: Faction, claim: boolean): AgentResponse {
  return {
    factionId: faction,
    actionType: claim ? "CLAIM_CHARITY" : "PASS",
    data: {},
  };
}

// =============================================================================
// Tests for 1.03.02
// =============================================================================

function testFraudSafeguard_FirstClaimSucceeds(): void {
  section("1.03.02 - first charity claim in a turn succeeds");

  const initialState = setFactionSpice(buildBaseState(), Faction.ATREIDES, 0);
  const handler = new ChoamCharityPhaseHandler();
  handler.initialize(initialState);

  const response = makeCharityResponse(Faction.ATREIDES, true);
  const result = handler.processStep(initialState, [response]);

  const finalFactionState = getFactionState(result.state, Faction.ATREIDES);

  assert(
    finalFactionState.spice === 2,
    "first charity claim adds 2 spice (0 → 2)"
  );
  assert(
    result.events.some(
      (e) =>
        e.type === "CHARITY_CLAIMED" && e.data?.faction === Faction.ATREIDES
    ),
    "first charity claim emits CHARITY_CLAIMED event"
  );
}

function testFraudSafeguard_SecondClaimInSameTurnIsBlocked(): void {
  section("1.03.02 - second charity claim in same turn is blocked");

  const initialState = setFactionSpice(buildBaseState(), Faction.ATREIDES, 0);
  const handler = new ChoamCharityPhaseHandler();
  handler.initialize(initialState);

  // First claim - should succeed
  const firstResponse = makeCharityResponse(Faction.ATREIDES, true);
  const firstResult = handler.processStep(initialState, [firstResponse]);

  // Second claim in same turn - should be blocked
  const secondResponse = makeCharityResponse(Faction.ATREIDES, true);
  const secondResult = handler.processStep(firstResult.state, [secondResponse]);

  const finalFactionState = getFactionState(
    secondResult.state,
    Faction.ATREIDES
  );

  assert(
    finalFactionState.spice === 2,
    "second charity claim does NOT add more spice (still at 2)"
  );
  assert(
    !secondResult.events.some(
      (e) =>
        e.type === "CHARITY_CLAIMED" && e.data?.faction === Faction.ATREIDES
    ),
    "second charity claim does NOT emit CHARITY_CLAIMED event"
  );
}

function testFraudSafeguard_MultipleFactionsCanClaim(): void {
  section("1.03.02 - multiple different factions can each claim once per turn");

  const initialState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
    advancedRules: false,
  });

  let testState = setFactionSpice(initialState, Faction.ATREIDES, 0);
  testState = setFactionSpice(testState, Faction.HARKONNEN, 1);
  testState = setFactionSpice(testState, Faction.FREMEN, 0);

  const handler = new ChoamCharityPhaseHandler();
  handler.initialize(testState);

  // Process all three claims - handler processes sequentially
  const atreidesResponse = makeCharityResponse(Faction.ATREIDES, true);
  const harkonnenResponse = makeCharityResponse(Faction.HARKONNEN, true);
  const fremenResponse = makeCharityResponse(Faction.FREMEN, true);

  // Process Atreides
  let result = handler.processStep(testState, [atreidesResponse]);
  const allEvents = [...result.events];
  let finalState = result.state;

  // Process Harkonnen (if phase not complete)
  if (!result.phaseComplete && result.pendingRequests.length > 0) {
    result = handler.processStep(finalState, [harkonnenResponse]);
    finalState = result.state;
    allEvents.push(...result.events);
  }

  // Process Fremen (if phase not complete)
  if (!result.phaseComplete && result.pendingRequests.length > 0) {
    result = handler.processStep(finalState, [fremenResponse]);
    finalState = result.state;
    allEvents.push(...result.events);
  }

  const atreidesState = getFactionState(finalState, Faction.ATREIDES);
  const harkonnenState = getFactionState(finalState, Faction.HARKONNEN);
  const fremenState = getFactionState(finalState, Faction.FREMEN);

  assert(atreidesState.spice === 2, "Atreides received charity (0 → 2)");
  assert(harkonnenState.spice === 2, "Harkonnen received charity (1 → 2)");
  assert(fremenState.spice === 2, "Fremen received charity (0 → 2)");

  const charityEvents = allEvents.filter((e) => e.type === "CHARITY_CLAIMED");
  // We expect at least 3 charity events (one per faction)
  assert(
    charityEvents.length >= 3,
    `at least three separate CHARITY_CLAIMED events were emitted (found ${charityEvents.length})`
  );
}

function testFraudSafeguard_EachFactionCanOnlyClaimOnce(): void {
  section(
    "1.03.02 - each faction can only claim once, even if multiple are eligible"
  );

  const initialState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });

  let testState = setFactionSpice(initialState, Faction.ATREIDES, 0);
  testState = setFactionSpice(testState, Faction.HARKONNEN, 1);

  const handler = new ChoamCharityPhaseHandler();
  handler.initialize(testState);

  // Atreides claims first time - succeeds
  const firstAtreidesResponse = makeCharityResponse(Faction.ATREIDES, true);
  let result = handler.processStep(testState, [firstAtreidesResponse]);
  const allEvents = [...result.events];
  let finalState = result.state;

  // Atreides tries to claim again - blocked (fraud safeguard)
  const secondAtreidesResponse = makeCharityResponse(Faction.ATREIDES, true);
  result = handler.processStep(finalState, [secondAtreidesResponse]);
  allEvents.push(...result.events);
  finalState = result.state;

  // Process Harkonnen if phase not complete
  if (!result.phaseComplete && result.pendingRequests.length > 0) {
    const harkonnenResponse = makeCharityResponse(Faction.HARKONNEN, true);
    result = handler.processStep(finalState, [harkonnenResponse]);
    allEvents.push(...result.events);
    finalState = result.state;
  }

  const atreidesState = getFactionState(finalState, Faction.ATREIDES);
  const harkonnenState = getFactionState(finalState, Faction.HARKONNEN);

  assert(
    atreidesState.spice === 2,
    "Atreides still at 2 spice (second claim blocked)"
  );
  assert(harkonnenState.spice === 2, "Harkonnen received charity (1 → 2)");

  const charityEvents = allEvents.filter((e) => e.type === "CHARITY_CLAIMED");
  assert(
    charityEvents.length >= 2,
    `at least 2 CHARITY_CLAIMED events (Atreides once, Harkonnen once) - found ${charityEvents.length}`
  );
  // Verify Atreides only appears once in charity events
  const atreidesCharityEvents = charityEvents.filter(
    (e) => e.data?.faction === Faction.ATREIDES
  );
  assert(
    atreidesCharityEvents.length === 1,
    `Atreides appears exactly once in CHARITY_CLAIMED events (fraud safeguard working) - found ${atreidesCharityEvents.length}`
  );
}

// =============================================================================
// Main
// =============================================================================

async function runAllTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.03.02 FRAUD SAFE GUARDS");
  console.log("=".repeat(80));

  try {
    testFraudSafeguard_FirstClaimSucceeds();
  } catch (error) {
    console.error("❌ testFraudSafeguard_FirstClaimSucceeds failed:", error);
    failCount++;
  }

  try {
    testFraudSafeguard_SecondClaimInSameTurnIsBlocked();
  } catch (error) {
    console.error(
      "❌ testFraudSafeguard_SecondClaimInSameTurnIsBlocked failed:",
      error
    );
    failCount++;
  }

  try {
    testFraudSafeguard_MultipleFactionsCanClaim();
  } catch (error) {
    console.error(
      "❌ testFraudSafeguard_MultipleFactionsCanClaim failed:",
      error
    );
    failCount++;
  }

  try {
    testFraudSafeguard_EachFactionCanOnlyClaimOnce();
  } catch (error) {
    console.error(
      "❌ testFraudSafeguard_EachFactionCanOnlyClaimOnce failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.03.02 tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runAllTests();
}

export async function runRuleTests() {
  await runAllTests();
}
