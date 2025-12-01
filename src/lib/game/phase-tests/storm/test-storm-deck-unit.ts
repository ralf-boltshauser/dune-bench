/**
 * Storm Deck Unit Tests
 *
 * Unit tests to verify Storm Deck logic without requiring agent responses.
 * These tests verify the core logic directly.
 */

import { Faction, Phase } from "../../../game/types";
import { createGameState } from "../../../game/state/factory";
import { StormPhaseHandler } from "../../../game/phases/handlers/storm";
import { getFactionState } from "../../../game/state";

// =============================================================================
// UNIT TESTS
// =============================================================================

/**
 * Test 1: Verify shouldUseStormDeck logic
 */
function testShouldUseStormDeck(): boolean {
  console.log("\n" + "=".repeat(80));
  console.log("UNIT TEST 1: shouldUseStormDeck Logic");
  console.log("=".repeat(80));

  const handler = new StormPhaseHandler();

  // Test case 1: Fremen + advanced rules + turn > 1 (should use deck)
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.FREMEN],
    advancedRules: true,
  });
  state = { ...state, turn: 2 };
  
  // Access private method via type assertion (for testing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shouldUse = (handler as any).shouldUseStormDeck(state);
  if (!shouldUse) {
    console.error("❌ FAIL: Should use storm deck (Fremen + advanced + turn 2)");
    return false;
  }
  console.log("✅ Correctly returns true for Fremen + advanced + turn 2");

  // Test case 2: Fremen + advanced rules + turn 1 (should NOT use deck)
  state = { ...state, turn: 1 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shouldNotUse = (handler as any).shouldUseStormDeck(state);
  if (shouldNotUse) {
    console.error("❌ FAIL: Should NOT use storm deck in turn 1");
    return false;
  }
  console.log("✅ Correctly returns false for turn 1");

  // Test case 3: No Fremen (should NOT use deck)
  state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
  state = { ...state, turn: 2 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shouldNotUse2 = (handler as any).shouldUseStormDeck(state);
  if (shouldNotUse2) {
    console.error("❌ FAIL: Should NOT use storm deck without Fremen");
    return false;
  }
  console.log("✅ Correctly returns false without Fremen");

  // Test case 4: Standard rules (should NOT use deck)
  state = createGameState({
    factions: [Faction.ATREIDES, Faction.FREMEN],
    advancedRules: false,
  });
  state = { ...state, turn: 2 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shouldNotUse3 = (handler as any).shouldUseStormDeck(state);
  if (shouldNotUse3) {
    console.error("❌ FAIL: Should NOT use storm deck with standard rules");
    return false;
  }
  console.log("✅ Correctly returns false with standard rules");

  console.log("\n✅ UNIT TEST 1 PASSED");
  return true;
}

/**
 * Test 2: Verify initialize returns no pending requests when using storm deck
 */
function testInitializeWithStormDeck(): boolean {
  console.log("\n" + "=".repeat(80));
  console.log("UNIT TEST 2: initialize() with Storm Deck (Turn 2+)");
  console.log("=".repeat(80));

  const handler = new StormPhaseHandler();

  // Create state with Fremen + advanced rules + turn 2 + stored card
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
    advancedRules: true,
  });

  // Set up turn 2 state with stored card
  const storedCard = "4";
  const fremenState = getFactionState(state, Faction.FREMEN);
  const updatedFremenState = {
    ...fremenState,
    fremenStormCard: storedCard,
  };
  const updatedFactions = new Map(state.factions);
  updatedFactions.set(Faction.FREMEN, updatedFremenState);

  state = {
    ...state,
    turn: 2,
    phase: Phase.STORM,
    stormSector: 10,
    factions: updatedFactions,
  };

  const result = handler.initialize(state);

  // Verify no pending requests
  if (result.pendingRequests.length !== 0) {
    console.error(
      `❌ FAIL: Expected 0 pending requests, got ${result.pendingRequests.length}`
    );
    return false;
  }
  console.log("✅ No pending requests created (as expected for storm deck)");

  // Verify phase not complete (needs processStep)
  if (result.phaseComplete) {
    console.error("❌ FAIL: Phase should not be complete yet");
    return false;
  }
  console.log("✅ Phase not complete (correct, needs processStep)");

  // Verify STORM_CARD_REVEALED event
  const revealEvent = result.events.find(
    (e) => e.type === "STORM_CARD_REVEALED"
  );
  if (!revealEvent) {
    console.error("❌ FAIL: STORM_CARD_REVEALED event not found");
    return false;
  }
  console.log("✅ STORM_CARD_REVEALED event found:", revealEvent.message);

  // Verify movement is set in context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movement = (handler as any).context.stormMovement;
  if (!movement || movement !== 4) {
    console.error(
      `❌ FAIL: Expected stormMovement to be 4, got ${movement}`
    );
    return false;
  }
  console.log(`✅ Storm movement set correctly: ${movement}`);

  console.log("\n✅ UNIT TEST 2 PASSED");
  return true;
}

/**
 * Test 3: Verify processStep handles pre-set movement (storm deck case)
 */
function testProcessStepWithPreSetMovement(): boolean {
  console.log("\n" + "=".repeat(80));
  console.log("UNIT TEST 3: processStep() with Pre-set Movement");
  console.log("=".repeat(80));

  const handler = new StormPhaseHandler();

  // Create state with Fremen + advanced rules + turn 2
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
    advancedRules: true,
  });

  state = {
    ...state,
    turn: 2,
    phase: Phase.STORM,
    stormSector: 10,
  };

  // Manually set storm movement (simulating initialize() having done this)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (handler as any).context.stormMovement = 3;

  // Call processStep with empty responses (as would happen after initialize)
  const result = handler.processStep(state, []);

  // Should skip processDialResponses and proceed to check Family Atomics / Weather Control
  // Eventually should reach applyStormMovement
  // For this test, we just verify it doesn't crash and handles the pre-set movement

  // The result should have events or pending requests or phase complete
  // If it's requesting something, that's fine (Family Atomics, Weather Control)
  // If it's complete, that means it applied movement

  console.log(
    `✅ processStep handled pre-set movement. Phase complete: ${result.phaseComplete}`
  );
  console.log(
    `✅ Pending requests: ${result.pendingRequests.length}, Events: ${result.events.length}`
  );

  // Verify it's not trying to process dial responses
  const dialRevealed = result.events.find(
    (e) => e.type === "STORM_DIAL_REVEALED"
  );
  if (dialRevealed) {
    console.error("❌ FAIL: Should not process dial responses when movement is pre-set");
    return false;
  }
  console.log("✅ Correctly skipped dial response processing");

  console.log("\n✅ UNIT TEST 3 PASSED");
  return true;
}

/**
 * Test 4: Verify normal initialize creates dial requests (without storm deck)
 */
function testInitializeWithNormalDialing(): boolean {
  console.log("\n" + "=".repeat(80));
  console.log("UNIT TEST 4: initialize() with Normal Dialing");
  console.log("=".repeat(80));

  const handler = new StormPhaseHandler();

  // Create state without Fremen (should use normal dialing)
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  state = {
    ...state,
    turn: 2,
    phase: Phase.STORM,
    stormSector: 10,
  };

  const result = handler.initialize(state);

  // Should have pending requests for dialing
  if (result.pendingRequests.length === 0) {
    console.error("❌ FAIL: Expected pending requests for dialing");
    return false;
  }
  console.log(
    `✅ Pending requests created: ${result.pendingRequests.length} (expected dialing)`
  );

  // Should not have STORM_CARD_REVEALED event
  const revealEvent = result.events.find(
    (e) => e.type === "STORM_CARD_REVEALED"
  );
  if (revealEvent) {
    console.error("❌ FAIL: Should not have STORM_CARD_REVEALED with normal dialing");
    return false;
  }
  console.log("✅ No STORM_CARD_REVEALED event (expected for normal dialing)");

  console.log("\n✅ UNIT TEST 4 PASSED");
  return true;
}

/**
 * Test 5: Verify storm deck structure
 */
function testStormDeckStructure(): boolean {
  console.log("\n" + "=".repeat(80));
  console.log("UNIT TEST 5: Storm Deck Structure");
  console.log("=".repeat(80));

  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.FREMEN],
    advancedRules: true,
  });

  // Verify stormDeck exists
  if (!state.stormDeck) {
    console.error("❌ FAIL: stormDeck not found in GameState");
    return false;
  }
  console.log("✅ stormDeck exists in GameState");

  // Verify stormDeck has 6 cards
  if (state.stormDeck.length !== 6) {
    console.error(
      `❌ FAIL: Expected stormDeck to have 6 cards, got ${state.stormDeck.length}`
    );
    return false;
  }
  console.log(`✅ stormDeck has 6 cards: ${state.stormDeck.join(", ")}`);

  // Verify all cards are between 1-6
  const validCards = state.stormDeck.every(
    (card) => card >= 1 && card <= 6
  );
  if (!validCards) {
    console.error("❌ FAIL: Some cards are outside valid range 1-6");
    return false;
  }
  console.log("✅ All cards are in valid range 1-6");

  // Verify fremenStormCard field exists in FactionState (optional)
  const fremenState = getFactionState(state, Faction.FREMEN);
  if (fremenState.fremenStormCard === undefined) {
    // This is fine - it's optional and starts as undefined
    console.log("✅ fremenStormCard field exists (undefined initially, as expected)");
  } else {
    console.log(`✅ fremenStormCard field exists: ${fremenState.fremenStormCard}`);
  }

  console.log("\n✅ UNIT TEST 5 PASSED");
  return true;
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

function runAllUnitTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("STORM DECK UNIT TEST SUITE");
  console.log("=".repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: "shouldUseStormDeck Logic",
    passed: testShouldUseStormDeck(),
  });

  results.push({
    name: "initialize() with Storm Deck",
    passed: testInitializeWithStormDeck(),
  });

  results.push({
    name: "processStep() with Pre-set Movement",
    passed: testProcessStepWithPreSetMovement(),
  });

  results.push({
    name: "initialize() with Normal Dialing",
    passed: testInitializeWithNormalDialing(),
  });

  results.push({
    name: "Storm Deck Structure",
    passed: testStormDeckStructure(),
  });

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("UNIT TEST SUMMARY");
  console.log("=".repeat(80));

  results.forEach((result, index) => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${result.name}: ${status}`);
  });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} unit tests passed`);

  if (passed === total) {
    console.log("\n🎉 All unit tests passed!");
    process.exit(0);
  } else {
    console.log("\n❌ Some unit tests failed");
    process.exit(1);
  }
}

if (require.main === module) {
  runAllUnitTests();
}

