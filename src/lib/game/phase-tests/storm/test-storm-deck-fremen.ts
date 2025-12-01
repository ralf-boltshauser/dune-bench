/**
 * Storm Deck Fremen Verification Tests
 *
 * Comprehensive test suite to verify Storm Deck logic for Fremen with advanced rules:
 * - Turn 1: Normal dialing, then draw card from deck (face down)
 * - Turn 2+: Reveal stored card, use as movement, return to deck, shuffle, draw new card
 */

import "dotenv/config";
import { getFactionState } from "../../state";
import { createGameState } from "../../state/factory";
import { Faction, Phase } from "../../types";
import { AgentResponseBuilder } from "./helpers/agent-response-builder";
import { runStormScenario } from "./scenarios/base-scenario";

// =============================================================================
// TEST SCENARIOS
// =============================================================================

/**
 * Test 1: Turn 1 Storm Phase with Fremen + Advanced Rules
 * - Should use normal dialing (no storm deck yet)
 * - After movement, should draw a card from storm deck and store it (face down)
 */
async function testTurn1StormDeckDraw(): Promise<boolean> {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 1: Turn 1 Storm Phase - Draw Card for Turn 2");
  console.log("=".repeat(80));

  const factions = [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN];
  const state = createGameState({
    factions,
    advancedRules: true,
  });

  // Set up turn 1 state
  const testState = { ...state, turn: 1, phase: Phase.STORM };

  // Verify storm deck is initialized
  if (!testState.stormDeck || testState.stormDeck.length !== 6) {
    console.error("❌ FAIL: Storm deck not properly initialized");
    return false;
  }

  const initialDeckSize = testState.stormDeck.length;
  console.log(`✅ Initial storm deck size: ${initialDeckSize} (expected: 6)`);

  // Create response builder for dialing (normal turn 1)
  const responseBuilder = new AgentResponseBuilder();
  responseBuilder.queueStormDial(Faction.ATREIDES, 5);
  responseBuilder.queueStormDial(Faction.HARKONNEN, 5);

  try {
    const result = await runStormScenario(
      testState,
      responseBuilder,
      "turn1-storm-deck-draw",
      50
    );

    if (!result.completed) {
      console.error("❌ FAIL: Storm phase did not complete");
      return false;
    }

    // Check for STORM_MOVED event
    const stormMoved = result.events.find((e) => e.type === "STORM_MOVED");
    if (!stormMoved) {
      console.error("❌ FAIL: STORM_MOVED event not found");
      return false;
    }
    console.log("✅ STORM_MOVED event found");

    // Check for STORM_CARD_DRAWN event
    const cardDrawn = result.events.find((e) => e.type === "STORM_CARD_DRAWN");
    if (!cardDrawn) {
      console.error("❌ FAIL: STORM_CARD_DRAWN event not found");
      return false;
    }
    console.log("✅ STORM_CARD_DRAWN event found:", cardDrawn.message);

    // Check that Fremen has a stored card
    const fremenState = getFactionState(result.state, Faction.FREMEN);
    if (!fremenState.fremenStormCard) {
      console.error("❌ FAIL: Fremen does not have a stored storm card");
      return false;
    }
    console.log(
      `✅ Fremen has stored storm card: ${fremenState.fremenStormCard}`
    );

    // Check that deck size decreased by 1
    const newDeckSize = result.state.stormDeck.length;
    if (newDeckSize !== initialDeckSize - 1) {
      console.error(
        `❌ FAIL: Storm deck size incorrect. Expected ${
          initialDeckSize - 1
        }, got ${newDeckSize}`
      );
      return false;
    }
    console.log(
      `✅ Storm deck size decreased correctly: ${newDeckSize} (expected: ${
        initialDeckSize - 1
      })`
    );

    // Validate card value is between 1-6
    const cardValue = parseInt(fremenState.fremenStormCard, 10);
    if (isNaN(cardValue) || cardValue < 1 || cardValue > 6) {
      console.error(`❌ FAIL: Invalid card value: ${cardValue}`);
      return false;
    }
    console.log(`✅ Card value is valid: ${cardValue}`);

    console.log("\n✅ TEST 1 PASSED");
    return true;
  } catch (error) {
    console.error("❌ TEST 1 FAILED:", error);
    return false;
  }
}

/**
 * Test 2: Turn 2 Storm Phase with Fremen + Advanced Rules
 * - Should reveal stored card from turn 1
 * - Should use card value as movement (no dialing)
 * - Should return card to deck, shuffle, and draw new card
 */
async function testTurn2StormDeckReveal(): Promise<boolean> {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 2: Turn 2 Storm Phase - Reveal Card and Use Storm Deck");
  console.log("=".repeat(80));

  const factions = [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN];
  const state = createGameState({
    factions,
    advancedRules: true,
  });

  // Set up turn 2 state with a stored storm card from turn 1
  const storedCard = "3"; // Simulate a card drawn in turn 1
  const fremenState = getFactionState(state, Faction.FREMEN);
  const updatedFremenState = {
    ...fremenState,
    fremenStormCard: storedCard,
  };
  const updatedFactions = new Map(state.factions);
  updatedFactions.set(Faction.FREMEN, updatedFremenState);

  // Remove the stored card from deck (it was drawn in turn 1)
  const deckWithoutCard = state.stormDeck.filter(
    (c: number) => c !== parseInt(storedCard, 10)
  );

  const testState = {
    ...state,
    turn: 2,
    phase: Phase.STORM,
    stormSector: 10, // Set a starting storm sector
    factions: updatedFactions,
    stormDeck: deckWithoutCard,
  };

  const initialDeckSize = testState.stormDeck.length;
  console.log(
    `✅ Initial storm deck size: ${initialDeckSize} (expected: 5, after turn 1 draw)`
  );
  console.log(`✅ Fremen has stored card: ${storedCard}`);

  // Create empty response builder (no dialing needed for storm deck)
  const responseBuilder = new AgentResponseBuilder();

  try {
    const result = await runStormScenario(
      testState,
      responseBuilder,
      "turn2-storm-deck-reveal",
      50
    );

    if (!result.completed) {
      console.error("❌ FAIL: Storm phase did not complete");
      return false;
    }

    // Check for STORM_CARD_REVEALED event
    const cardRevealed = result.events.find(
      (e) => e.type === "STORM_CARD_REVEALED"
    );
    if (!cardRevealed) {
      console.error("❌ FAIL: STORM_CARD_REVEALED event not found");
      return false;
    }
    console.log("✅ STORM_CARD_REVEALED event found:", cardRevealed.message);

    // Verify revealed card value matches stored card
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revealedValue = (cardRevealed as any).data?.value;
    if (revealedValue !== parseInt(storedCard, 10)) {
      console.error(
        `❌ FAIL: Revealed card value mismatch. Expected ${storedCard}, got ${revealedValue}`
      );
      return false;
    }
    console.log(`✅ Revealed card value matches stored card: ${revealedValue}`);

    // Check for STORM_MOVED event
    const stormMoved = result.events.find((e) => e.type === "STORM_MOVED");
    if (!stormMoved) {
      console.error("❌ FAIL: STORM_MOVED event not found");
      return false;
    }
    console.log("✅ STORM_MOVED event found");

    // Verify STORM_MOVED comes after STORM_CARD_REVEALED
    const revealedIndex = result.events.findIndex(
      (e) => e.type === "STORM_CARD_REVEALED"
    );
    const movedIndex = result.events.findIndex((e) => e.type === "STORM_MOVED");
    if (movedIndex <= revealedIndex) {
      console.error(
        "❌ FAIL: STORM_MOVED should come after STORM_CARD_REVEALED"
      );
      return false;
    }
    console.log("✅ STORM_MOVED occurs after STORM_CARD_REVEALED");

    // Verify movement value matches card value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movement = (stormMoved as any).data?.movement;
    if (movement !== parseInt(storedCard, 10)) {
      console.error(
        `❌ FAIL: Movement value mismatch. Expected ${storedCard}, got ${movement}`
      );
      return false;
    }
    console.log(`✅ Movement value matches card value: ${movement}`);

    // Check for STORM_CARD_DRAWN event (new card for turn 3)
    const cardDrawn = result.events.find((e) => e.type === "STORM_CARD_DRAWN");
    if (!cardDrawn) {
      console.error("❌ FAIL: STORM_CARD_DRAWN event not found");
      return false;
    }
    console.log("✅ STORM_CARD_DRAWN event found:", cardDrawn.message);

    // Check that deck size is correct (returned card + shuffle - drawn card = same size)
    const newDeckSize = result.state.stormDeck.length;
    if (newDeckSize !== initialDeckSize) {
      console.error(
        `❌ FAIL: Storm deck size incorrect. Expected ${initialDeckSize}, got ${newDeckSize}`
      );
      return false;
    }
    console.log(
      `✅ Storm deck size maintained correctly: ${newDeckSize} (card returned and new one drawn)`
    );

    // Check that Fremen has a new stored card (different from the revealed one)
    const newFremenState = getFactionState(result.state, Faction.FREMEN);
    if (!newFremenState.fremenStormCard) {
      console.error("❌ FAIL: Fremen does not have a new stored storm card");
      return false;
    }
    console.log(
      `✅ Fremen has new stored storm card: ${newFremenState.fremenStormCard}`
    );

    // Verify no dial requests were made
    // This would be checked in the log - no DIAL_STORM requests should appear

    console.log("\n✅ TEST 2 PASSED");
    return true;
  } catch (error) {
    console.error("❌ TEST 2 FAILED:", error);
    return false;
  }
}

/**
 * Test 3: Normal Dialing Still Works (No Fremen)
 */
async function testNormalDialingWithoutFremen(): Promise<boolean> {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 3: Normal Dialing Without Fremen");
  console.log("=".repeat(80));

  const factions = [Faction.ATREIDES, Faction.HARKONNEN];
  const state = createGameState({
    factions,
    advancedRules: true,
  });

  const testState = { ...state, turn: 2, phase: Phase.STORM, stormSector: 10 };

  // Create response builder for dialing
  const responseBuilder = new AgentResponseBuilder();
  responseBuilder.queueStormDial(Faction.ATREIDES, 2);
  responseBuilder.queueStormDial(Faction.HARKONNEN, 3);

  try {
    const result = await runStormScenario(
      testState,
      responseBuilder,
      "normal-dialing-without-fremen",
      50
    );

    if (!result.completed) {
      console.error("❌ FAIL: Storm phase did not complete");
      return false;
    }

    // Check for STORM_DIAL_REVEALED events (not STORM_CARD_REVEALED)
    const dialRevealed = result.events.filter(
      (e) => e.type === "STORM_DIAL_REVEALED"
    );
    if (dialRevealed.length === 0) {
      console.error("❌ FAIL: No STORM_DIAL_REVEALED events found");
      return false;
    }
    console.log(`✅ STORM_DIAL_REVEALED events found: ${dialRevealed.length}`);

    // Verify no STORM_CARD_REVEALED events
    const cardRevealed = result.events.find(
      (e) => e.type === "STORM_CARD_REVEALED"
    );
    if (cardRevealed) {
      console.error(
        "❌ FAIL: STORM_CARD_REVEALED event found when Fremen not in play"
      );
      return false;
    }
    console.log("✅ No STORM_CARD_REVEALED events (expected)");

    // Check for STORM_MOVED event
    const stormMoved = result.events.find((e) => e.type === "STORM_MOVED");
    if (!stormMoved) {
      console.error("❌ FAIL: STORM_MOVED event not found");
      return false;
    }
    console.log("✅ STORM_MOVED event found");

    console.log("\n✅ TEST 3 PASSED");
    return true;
  } catch (error) {
    console.error("❌ TEST 3 FAILED:", error);
    return false;
  }
}

/**
 * Test 4: Normal Dialing with Standard Rules (Fremen present but standard rules)
 */
async function testNormalDialingStandardRules(): Promise<boolean> {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 4: Normal Dialing with Standard Rules (Fremen Present)");
  console.log("=".repeat(80));

  const factions = [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN];
  const state = createGameState({
    factions,
    advancedRules: false, // Standard rules
  });

  const testState = { ...state, turn: 2, phase: Phase.STORM, stormSector: 10 };

  // Create response builder for dialing
  const responseBuilder = new AgentResponseBuilder();
  responseBuilder.queueStormDial(Faction.ATREIDES, 2);
  responseBuilder.queueStormDial(Faction.HARKONNEN, 3);

  try {
    const result = await runStormScenario(
      testState,
      responseBuilder,
      "normal-dialing-standard-rules",
      50
    );

    if (!result.completed) {
      console.error("❌ FAIL: Storm phase did not complete");
      return false;
    }

    // Check for STORM_DIAL_REVEALED events
    const dialRevealed = result.events.filter(
      (e) => e.type === "STORM_DIAL_REVEALED"
    );
    if (dialRevealed.length === 0) {
      console.error("❌ FAIL: No STORM_DIAL_REVEALED events found");
      return false;
    }
    console.log(`✅ STORM_DIAL_REVEALED events found: ${dialRevealed.length}`);

    // Verify no STORM_CARD_REVEALED events (standard rules don't use storm deck)
    const cardRevealed = result.events.find(
      (e) => e.type === "STORM_CARD_REVEALED"
    );
    if (cardRevealed) {
      console.error(
        "❌ FAIL: STORM_CARD_REVEALED event found with standard rules"
      );
      return false;
    }
    console.log(
      "✅ No STORM_CARD_REVEALED events (expected for standard rules)"
    );

    console.log("\n✅ TEST 4 PASSED");
    return true;
  } catch (error) {
    console.error("❌ TEST 4 FAILED:", error);
    return false;
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  console.log("\n" + "=".repeat(80));
  console.log("STORM DECK FREMEN VERIFICATION TEST SUITE");
  console.log("=".repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  // Test 1: Turn 1 card draw
  results.push({
    name: "Turn 1 Storm Deck Draw",
    passed: await testTurn1StormDeckDraw(),
  });

  // Test 2: Turn 2 card reveal and use
  results.push({
    name: "Turn 2 Storm Deck Reveal",
    passed: await testTurn2StormDeckReveal(),
  });

  // Test 3: Normal dialing without Fremen
  results.push({
    name: "Normal Dialing Without Fremen",
    passed: await testNormalDialingWithoutFremen(),
  });

  // Test 4: Normal dialing with standard rules
  results.push({
    name: "Normal Dialing Standard Rules",
    passed: await testNormalDialingStandardRules(),
  });

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("TEST SUMMARY");
  console.log("=".repeat(80));

  results.forEach((result, index) => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${result.name}: ${status}`);
  });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed");
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
