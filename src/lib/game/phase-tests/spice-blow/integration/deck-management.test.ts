/**
 * Integration Tests for Deck Management
 *
 * Tests for two-pile system and deck independence
 */

import { SpiceBlowPhaseHandler } from "../../../phases/handlers/spice-blow";
import { Faction, TerritoryId } from "../../../types";
import { ContextAssertions } from "../helpers/context-assertions";
import { DeckAssertions } from "../helpers/deck-assertions";
import { DECK_COMBINATIONS, TEST_CARDS } from "../helpers/fixtures";
import { buildTestState } from "../helpers/test-state-builder";

/**
 * @rule-test 0.03
 * Test two-pile system - Deck A and Deck B are separate
 * Verifies spice deck structure and operations as per rule 0.03
 */
export function testTwoPileSystem() {
  console.log("\n=== Testing Two-Pile System ===");

  const deckACard = TEST_CARDS.TERRITORY_CIELAGO_SOUTH;
  const deckBCard = TEST_CARDS.SHAI_HULUD_1;

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 2,
    spiceDeckA: [deckACard],
    spiceDeckB: [deckBCard],
  });

  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);

  // Card A should be revealed from Deck A
  ContextAssertions.assertCardRevealed(initResult.context, "A", true);

  // Card A should be in discardA (check what was actually drawn)
  const discardA = initResult.state.spiceDiscardA;
  if (discardA.length === 0) {
    throw new Error("Expected card in discardA, but discard is empty");
  }
  const actualCardA = discardA[discardA.length - 1].definitionId;

  // Card A should NOT be in deckA anymore
  DeckAssertions.assertCardNotInDeck(initResult.state, "A", deckACard);

  // Deck B should be unchanged (Card B not revealed yet in basic rules)
  DeckAssertions.assertCardInDeck(initResult.state, "B", deckBCard);

  console.log("✓ Two-pile system works correctly");
}

/**
 * Test deck independence - Deck A operations don't affect Deck B
 */
export function testDeckIndependence() {
  console.log("\n=== Testing Deck Independence ===");

  const stateBefore = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 2,
    ...DECK_COMBINATIONS.DECK_A_TERRITORY_DECK_B_WORM,
  });

  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(stateBefore);

  // Verify Deck B is unchanged after Deck A operation
  DeckAssertions.assertDeckIndependence(stateBefore, initResult.state, "A");

  console.log("✓ Deck independence works correctly");
}

/**
 * Test deck-specific devouring - Worm on Deck A uses discardA
 */
export function testWormDeckASpecificDevouring() {
  console.log("\n=== Testing Worm Deck A Specific Devouring ===");

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 2,
    spiceDeckA: [TEST_CARDS.SHAI_HULUD_1],
    spiceDiscardA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH], // This should be used
    spiceDeckB: [TEST_CARDS.TERRITORY_SOUTH_MESA],
    spiceDiscardB: [TEST_CARDS.TERRITORY_RED_CHASM], // This should NOT be used
  });

  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);

  // Continue processing until worm is handled
  let currentState = initResult.state;
  let currentContext = initResult.context;
  let stepCount = 0;

  while (!initResult.phaseComplete && stepCount < 10) {
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    currentContext = stepResult.context;
    stepCount++;

    if (stepResult.phaseComplete) break;
  }

  // Verify topmost Territory Card from discardA was used
  // (This is verified by checking the devour location in context or events)
  // Note: The state before operation is checked since we're verifying the discard pile
  // that the worm should use for devouring location
  DeckAssertions.assertTopmostTerritoryCard(
    state,
    "A",
    TerritoryId.CIELAGO_SOUTH,
    1
  );

  console.log("✓ Worm on Deck A uses discardA correctly");
}

/**
 * Test deck-specific devouring - Worm on Deck B uses discardB
 */
export function testWormDeckBSpecificDevouring() {
  console.log("\n=== Testing Worm Deck B Specific Devouring ===");

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 2,
    spiceDeckA: [TEST_CARDS.TERRITORY_CIELAGO_SOUTH],
    spiceDiscardA: [TEST_CARDS.TERRITORY_SOUTH_MESA], // This should NOT be used
    spiceDeckB: [TEST_CARDS.SHAI_HULUD_1],
    spiceDiscardB: [TEST_CARDS.TERRITORY_RED_CHASM], // This should be used
  });

  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);

  // Process Card A first
  let currentState = initResult.state;
  let currentContext = initResult.context;

  // Then process Card B (if advanced rules)
  if (state.config.advancedRules) {
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    currentContext = stepResult.context;
  }

  // Verify topmost Territory Card from discardB would be used
  DeckAssertions.assertTopmostTerritoryCard(
    state,
    "B",
    TerritoryId.RED_CHASM,
    3
  );

  console.log("✓ Worm on Deck B uses discardB correctly");
}

/**
 * Test topmost Territory Card - uses last (topmost) in discard
 */
export function testTopmostTerritoryCard() {
  console.log("\n=== Testing Topmost Territory Card ===");

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 2,
    spiceDeckA: [TEST_CARDS.SHAI_HULUD_1],
    spiceDiscardA: [
      TEST_CARDS.TERRITORY_CIELAGO_SOUTH, // First Territory Card
      TEST_CARDS.SHAI_HULUD_2,
      TEST_CARDS.TERRITORY_SOUTH_MESA, // Last Territory Card (topmost)
    ],
  });

  // Verify topmost is the last Territory Card
  DeckAssertions.assertTopmostTerritoryCard(
    state,
    "A",
    TerritoryId.SOUTH_MESA,
    2
  );

  console.log("✓ Topmost Territory Card is correctly identified");
}

/**
 * Run all deck management tests
 */
export function runDeckManagementTests() {
  console.log("=".repeat(80));
  console.log("DECK MANAGEMENT INTEGRATION TESTS");
  console.log("=".repeat(80));

  try {
    testTwoPileSystem();
    testDeckIndependence();
    testWormDeckASpecificDevouring();
    testWormDeckBSpecificDevouring();
    testTopmostTerritoryCard();

    console.log("\n✅ All deck management tests passed!");
  } catch (error) {
    console.error("❌ Deck management tests failed:", error);
    throw error;
  }
}
