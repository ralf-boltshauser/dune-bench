/**
 * Rule tests: 1.02.05 SHAI-HULUD - Sandworms Never Devour Newly Placed Spice
 * @rule-test 1.02.05
 *
 * Rule text (numbered_rules/1.md):
 * "When this type of card is discarded destroy all spice and Forces in the
 *  Territory of the topmost Territory Card in the discard pile and Place
 *  them in the Spice Bank and Tleilaxu Tanks respectively."
 *
 * CRITICAL RULE: A sandworm can NEVER devour newly placed spice. When a sandworm
 * appears, it devours in the territory of the LAST territory card from a PREVIOUS
 * turn, not from the current turn's spice blow phase.
 *
 * These tests verify:
 * - Sandworms devour in territory of previous turn's territory card (deck A)
 * - Sandworms devour in territory of previous turn's territory card (deck B)
 * - Sandworms NEVER devour newly placed spice from current turn
 * - If no previous turn territory card exists, sandworm devours nothing
 * - Multiple territory cards placed this turn are all excluded
 * - Deck A and Deck B are independent (cards from deck A don't affect deck B worms)
 */

/* eslint-disable no-console */

import {
  Faction,
  Phase,
  SpiceCardLocation,
  SpiceCardType,
  TerritoryId,
  type GameState,
  type SpiceCard,
} from "../../types";
import { createGameState } from "../../state/factory";
import {
  createInitialContext,
  type SpiceBlowContext,
} from "../../phases/handlers/spice-blow/context";
import {
  type DeckType,
  type SpiceBlowStepResult,
} from "../../phases/handlers/spice-blow/types";
import { handleShaiHulud } from "../../phases/handlers/spice-blow/shai-hulud";
import { getTopmostTerritoryCardLocation } from "../../phases/handlers/spice-blow/shai-hulud/devouring";
import { handleTerritoryCard } from "../../phases/handlers/spice-blow/placement";
import { getSpiceCardDefinition } from "../../data";
import type { PhaseEvent } from "../../phases/types";

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

function buildTurnThreeState(): GameState {
  const base = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
  return { ...base, turn: 3, wormCount: 0 };
}

function makeWormCard(definitionId = "shai_hulud_1"): SpiceCard {
  return {
    definitionId,
    type: SpiceCardType.SHAI_HULUD,
    location: SpiceCardLocation.DECK,
  };
}

function makeTerritoryCard(definitionId: string): SpiceCard {
  return {
    definitionId,
    type: SpiceCardType.TERRITORY,
    location: SpiceCardLocation.DECK,
  };
}

function stubReveal(
  state: GameState,
  _deck: DeckType,
  context: SpiceBlowContext
): SpiceBlowStepResult {
  // For these rule-focused tests, we only care about the *first* Shai-Hulud
  // handling; do not keep revealing.
  return {
    state,
    context,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  };
}

// =============================================================================
// Test 1: Sandworm devours previous turn's territory card (Deck A)
// =============================================================================

function testSandworm_DevoursPreviousTurnDeckA(): void {
  section("1.02.05 - Sandworm devours territory from previous turn (Deck A)");

  const state = buildTurnThreeState();
  
  // Set up: Previous turn placed a territory card in discard A
  const previousTurnCard = makeTerritoryCard("spice_wind_pass_north");
  const previousTurnCardDef = getSpiceCardDefinition(previousTurnCard.definitionId);
  if (!previousTurnCardDef) throw new Error("Card definition not found");

  const initialState: GameState = {
    ...state,
    spiceDeckA: [],
    spiceDiscardA: [previousTurnCard], // Previous turn's territory card
  };

  const context: SpiceBlowContext = {
    ...createInitialContext(),
    shaiHuludCount: 0,
    territoryCardsPlacedThisTurn: {
      deckA: [], // No cards placed this turn yet
      deckB: [],
    },
  };

  const worm = makeWormCard();
  const events: PhaseEvent[] = [];

  // Get devour location BEFORE handling (to test the location logic)
  const devourLocation = getTopmostTerritoryCardLocation(
    initialState,
    "A",
    context
  );

  assert(
    devourLocation !== null,
    "Devour location should be found from previous turn's card"
  );

  assert(
    devourLocation?.territoryId === previousTurnCardDef.territoryId &&
      devourLocation?.sector === previousTurnCardDef.sector,
    `Devour location should match previous turn card: ${previousTurnCardDef.territoryId} sector ${previousTurnCardDef.sector}`
  );
}

// =============================================================================
// Test 2: Sandworm NEVER devours newly placed spice (Deck A)
// =============================================================================

function testSandworm_NeverDevoursNewSpiceDeckA(): void {
  section("1.02.05 - Sandworm NEVER devours newly placed spice (Deck A)");

  const state = buildTurnThreeState();
  
  // Set up: Previous turn placed a territory card
  const previousTurnCard = makeTerritoryCard("spice_wind_pass_north");
  const previousTurnCardDef = getSpiceCardDefinition(previousTurnCard.definitionId);
  if (!previousTurnCardDef) throw new Error("Card definition not found");

  // Current turn: Place a territory card first
  const currentTurnCard = makeTerritoryCard("spice_old_gap");
  const currentTurnCardDef = getSpiceCardDefinition(currentTurnCard.definitionId);
  if (!currentTurnCardDef) throw new Error("Card definition not found");

  let gameState: GameState = {
    ...state,
    spiceDeckA: [],
    spiceDiscardA: [previousTurnCard], // Previous turn's card
  };

  // Place current turn's territory card
  const initialContext: SpiceBlowContext = {
    ...createInitialContext(),
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };

  const placementResult = handleTerritoryCard(
    gameState,
    currentTurnCard,
    currentTurnCardDef,
    "A",
    initialContext,
    []
  );

  gameState = placementResult.state;
  const contextAfterPlacement = placementResult.context;

  // Now check: if a sandworm appears, it should NOT devour the current turn card
  const devourLocation = getTopmostTerritoryCardLocation(
    gameState,
    "A",
    contextAfterPlacement
  );

  assert(
    devourLocation !== null,
    "Devour location should be found (from previous turn)"
  );

  assert(
    devourLocation?.territoryId === previousTurnCardDef.territoryId &&
      devourLocation?.sector === previousTurnCardDef.sector,
    `Sandworm should devour PREVIOUS turn card (${previousTurnCardDef.territoryId}), not current turn card (${currentTurnCardDef.territoryId})`
  );

  assert(
    devourLocation?.territoryId !== currentTurnCardDef.territoryId,
    `Sandworm should NEVER devour current turn card: ${currentTurnCardDef.territoryId}`
  );
}

// =============================================================================
// Test 3: Sandworm devours previous turn's territory card (Deck B)
// =============================================================================

function testSandworm_DevoursPreviousTurnDeckB(): void {
  section("1.02.05 - Sandworm devours territory from previous turn (Deck B)");

  const state = buildTurnThreeState();
  
  // Set up: Previous turn placed a territory card in discard B
  const previousTurnCard = makeTerritoryCard("spice_red_chasm");
  const previousTurnCardDef = getSpiceCardDefinition(previousTurnCard.definitionId);
  if (!previousTurnCardDef) throw new Error("Card definition not found");

  const initialState: GameState = {
    ...state,
    spiceDeckB: [],
    spiceDiscardB: [previousTurnCard], // Previous turn's territory card
  };

  const context: SpiceBlowContext = {
    ...createInitialContext(),
    shaiHuludCount: 0,
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [], // No cards placed this turn yet
    },
  };

  // Get devour location
  const devourLocation = getTopmostTerritoryCardLocation(
    initialState,
    "B",
    context
  );

  assert(
    devourLocation !== null,
    "Devour location should be found from previous turn's card (Deck B)"
  );

  assert(
    devourLocation?.territoryId === previousTurnCardDef.territoryId &&
      devourLocation?.sector === previousTurnCardDef.sector,
    `Devour location should match previous turn card: ${previousTurnCardDef.territoryId} sector ${previousTurnCardDef.sector}`
  );
}

// =============================================================================
// Test 4: Sandworm NEVER devours newly placed spice (Deck B)
// =============================================================================

function testSandworm_NeverDevoursNewSpiceDeckB(): void {
  section("1.02.05 - Sandworm NEVER devours newly placed spice (Deck B)");

  const state = buildTurnThreeState();
  
  // Set up: Previous turn placed a territory card
  const previousTurnCard = makeTerritoryCard("spice_red_chasm");
  const previousTurnCardDef = getSpiceCardDefinition(previousTurnCard.definitionId);
  if (!previousTurnCardDef) throw new Error("Card definition not found");

  // Current turn: Place a territory card first
  const currentTurnCard = makeTerritoryCard("spice_sihaya_ridge");
  const currentTurnCardDef = getSpiceCardDefinition(currentTurnCard.definitionId);
  if (!currentTurnCardDef) throw new Error("Card definition not found");

  let gameState: GameState = {
    ...state,
    spiceDeckB: [],
    spiceDiscardB: [previousTurnCard], // Previous turn's card
  };

  // Place current turn's territory card
  const initialContext: SpiceBlowContext = {
    ...createInitialContext(),
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };

  const placementResult = handleTerritoryCard(
    gameState,
    currentTurnCard,
    currentTurnCardDef,
    "B",
    initialContext,
    []
  );

  gameState = placementResult.state;
  const contextAfterPlacement = placementResult.context;

  // Now check: if a sandworm appears, it should NOT devour the current turn card
  const devourLocation = getTopmostTerritoryCardLocation(
    gameState,
    "B",
    contextAfterPlacement
  );

  assert(
    devourLocation !== null,
    "Devour location should be found (from previous turn)"
  );

  assert(
    devourLocation?.territoryId === previousTurnCardDef.territoryId &&
      devourLocation?.sector === previousTurnCardDef.sector,
    `Sandworm should devour PREVIOUS turn card (${previousTurnCardDef.territoryId}), not current turn card (${currentTurnCardDef.territoryId})`
  );

  assert(
    devourLocation?.territoryId !== currentTurnCardDef.territoryId,
    `Sandworm should NEVER devour current turn card: ${currentTurnCardDef.territoryId}`
  );
}

// =============================================================================
// Test 5: Sandworm returns null if no previous turn card exists
// =============================================================================

function testSandworm_ReturnsNullIfNoPreviousCard(): void {
  section("1.02.05 - Sandworm returns null if no previous turn territory card exists");

  const state = buildTurnThreeState();
  
  // Set up: No previous turn cards, but current turn places a card
  const currentTurnCard = makeTerritoryCard("spice_wind_pass_north");
  const currentTurnCardDef = getSpiceCardDefinition(currentTurnCard.definitionId);
  if (!currentTurnCardDef) throw new Error("Card definition not found");

  let gameState: GameState = {
    ...state,
    spiceDeckA: [],
    spiceDiscardA: [], // No previous turn cards
  };

  // Place current turn's territory card
  const initialContext: SpiceBlowContext = {
    ...createInitialContext(),
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };

  const placementResult = handleTerritoryCard(
    gameState,
    currentTurnCard,
    currentTurnCardDef,
    "A",
    initialContext,
    []
  );

  gameState = placementResult.state;
  const contextAfterPlacement = placementResult.context;

  // Now check: if a sandworm appears, it should return null (nothing to devour)
  const devourLocation = getTopmostTerritoryCardLocation(
    gameState,
    "A",
    contextAfterPlacement
  );

  assert(
    devourLocation === null,
    "Devour location should be null when no previous turn card exists (sandworm has nothing to devour)"
  );
}

// =============================================================================
// Test 6: Multiple territory cards placed this turn are all excluded
// =============================================================================

function testSandworm_ExcludesAllCurrentTurnCards(): void {
  section("1.02.05 - Multiple territory cards placed this turn are all excluded");

  const state = buildTurnThreeState();
  
  // Set up: Previous turn placed a territory card
  const previousTurnCard = makeTerritoryCard("spice_wind_pass_north");
  const previousTurnCardDef = getSpiceCardDefinition(previousTurnCard.definitionId);
  if (!previousTurnCardDef) throw new Error("Card definition not found");

  // Current turn: Place TWO territory cards
  const currentTurnCard1 = makeTerritoryCard("spice_old_gap");
  const currentTurnCard1Def = getSpiceCardDefinition(currentTurnCard1.definitionId);
  if (!currentTurnCard1Def) throw new Error("Card definition not found");

  const currentTurnCard2 = makeTerritoryCard("spice_sihaya_ridge");
  const currentTurnCard2Def = getSpiceCardDefinition(currentTurnCard2.definitionId);
  if (!currentTurnCard2Def) throw new Error("Card definition not found");

  let gameState: GameState = {
    ...state,
    spiceDeckA: [],
    spiceDiscardA: [previousTurnCard], // Previous turn's card
  };

  // Place first current turn card
  let context: SpiceBlowContext = {
    ...createInitialContext(),
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };

  const placementResult1 = handleTerritoryCard(
    gameState,
    currentTurnCard1,
    currentTurnCard1Def,
    "A",
    context,
    []
  );

  gameState = placementResult1.state;
  context = placementResult1.context;

  // Place second current turn card
  const placementResult2 = handleTerritoryCard(
    gameState,
    currentTurnCard2,
    currentTurnCard2Def,
    "A",
    context,
    []
  );

  gameState = placementResult2.state;
  const contextAfterBothPlacements = placementResult2.context;

  // Now check: if a sandworm appears, it should NOT devour either current turn card
  const devourLocation = getTopmostTerritoryCardLocation(
    gameState,
    "A",
    contextAfterBothPlacements
  );

  assert(
    devourLocation !== null,
    "Devour location should be found (from previous turn)"
  );

  assert(
    devourLocation?.territoryId === previousTurnCardDef.territoryId &&
      devourLocation?.sector === previousTurnCardDef.sector,
    `Sandworm should devour PREVIOUS turn card (${previousTurnCardDef.territoryId}), not either current turn card`
  );

  assert(
    devourLocation?.territoryId !== currentTurnCard1Def.territoryId &&
      devourLocation?.territoryId !== currentTurnCard2Def.territoryId,
    `Sandworm should NEVER devour either current turn card: ${currentTurnCard1Def.territoryId} or ${currentTurnCard2Def.territoryId}`
  );
}

// =============================================================================
// Test 7: Deck A and Deck B are independent
// =============================================================================

function testSandworm_DeckAAndBIndependent(): void {
  section("1.02.05 - Deck A and Deck B are independent (cards from A don't affect B)");

  const state = buildTurnThreeState();
  
  // Set up: Previous turn placed cards in both decks
  const previousTurnCardA = makeTerritoryCard("spice_wind_pass_north");
  const previousTurnCardADef = getSpiceCardDefinition(previousTurnCardA.definitionId);
  if (!previousTurnCardADef) throw new Error("Card definition not found");

  const previousTurnCardB = makeTerritoryCard("spice_red_chasm");
  const previousTurnCardBDef = getSpiceCardDefinition(previousTurnCardB.definitionId);
  if (!previousTurnCardBDef) throw new Error("Card definition not found");

  // Current turn: Place a card in deck A
  const currentTurnCardA = makeTerritoryCard("spice_old_gap");
  const currentTurnCardADef = getSpiceCardDefinition(currentTurnCardA.definitionId);
  if (!currentTurnCardADef) throw new Error("Card definition not found");

  let gameState: GameState = {
    ...state,
    spiceDeckA: [],
    spiceDeckB: [],
    spiceDiscardA: [previousTurnCardA], // Previous turn's card A
    spiceDiscardB: [previousTurnCardB], // Previous turn's card B
  };

  // Place current turn's card in deck A
  const initialContext: SpiceBlowContext = {
    ...createInitialContext(),
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };

  const placementResult = handleTerritoryCard(
    gameState,
    currentTurnCardA,
    currentTurnCardADef,
    "A",
    initialContext,
    []
  );

  gameState = placementResult.state;
  const contextAfterPlacement = placementResult.context;

  // Now check: if a sandworm appears on deck B, it should devour previous turn's card B
  // (not be affected by deck A's current turn card)
  const devourLocationB = getTopmostTerritoryCardLocation(
    gameState,
    "B",
    contextAfterPlacement
  );

  assert(
    devourLocationB !== null,
    "Devour location should be found for deck B (from previous turn)"
  );

  assert(
    devourLocationB?.territoryId === previousTurnCardBDef.territoryId &&
      devourLocationB?.sector === previousTurnCardBDef.sector,
    `Sandworm on deck B should devour PREVIOUS turn card B (${previousTurnCardBDef.territoryId}), not be affected by deck A's current turn card`
  );

  assert(
    devourLocationB?.territoryId !== currentTurnCardADef.territoryId,
    `Sandworm on deck B should NEVER devour deck A's current turn card: ${currentTurnCardADef.territoryId}`
  );
}

// =============================================================================
// Test 8: Real-world scenario from game_miri9vfp_25fc5051
// =============================================================================

function testSandworm_RealWorldScenario(): void {
  section("1.02.05 - Real-world scenario: Turn 3 spice blow with sandworm");

  const state = buildTurnThreeState();
  
  // Scenario from game_miri9vfp_25fc5051 Turn 3:
  // - Card A: Wind Pass (spice placed)
  // - Card B: Old Gap (spice placed)
  // - Then a sandworm appeared and incorrectly devoured Old Gap
  // 
  // This should NOT happen - sandworm should devour previous turn's card, not Old Gap

  // Set up: Previous turn (Turn 2) placed a card in discard B
  const previousTurnCardB = makeTerritoryCard("spice_sihaya_ridge");
  const previousTurnCardBDef = getSpiceCardDefinition(previousTurnCardB.definitionId);
  if (!previousTurnCardBDef) throw new Error("Card definition not found");

  // Current turn (Turn 3): Place Card A (Wind Pass)
  const cardA = makeTerritoryCard("spice_wind_pass_north");
  const cardADef = getSpiceCardDefinition(cardA.definitionId);
  if (!cardADef) throw new Error("Card definition not found");

  // Current turn: Place Card B (Old Gap)
  const cardB = makeTerritoryCard("spice_old_gap");
  const cardBDef = getSpiceCardDefinition(cardB.definitionId);
  if (!cardBDef) throw new Error("Card definition not found");

  let gameState: GameState = {
    ...state,
    spiceDeckA: [],
    spiceDeckB: [],
    spiceDiscardA: [],
    spiceDiscardB: [previousTurnCardB], // Previous turn's card in deck B
  };

  let context: SpiceBlowContext = {
    ...createInitialContext(),
    territoryCardsPlacedThisTurn: {
      deckA: [],
      deckB: [],
    },
  };

  // Place Card A (Wind Pass)
  const placementResultA = handleTerritoryCard(
    gameState,
    cardA,
    cardADef,
    "A",
    context,
    []
  );

  gameState = placementResultA.state;
  context = placementResultA.context;

  // Place Card B (Old Gap)
  const placementResultB = handleTerritoryCard(
    gameState,
    cardB,
    cardBDef,
    "B",
    context,
    []
  );

  gameState = placementResultB.state;
  const contextAfterBoth = placementResultB.context;

  // Now if a sandworm appears on deck B, it should devour previous turn's card (Sihaya Ridge)
  // NOT the current turn's Old Gap
  const devourLocationB = getTopmostTerritoryCardLocation(
    gameState,
    "B",
    contextAfterBoth
  );

  assert(
    devourLocationB !== null,
    "Devour location should be found for deck B (from previous turn)"
  );

  assert(
    devourLocationB?.territoryId === previousTurnCardBDef.territoryId &&
      devourLocationB?.sector === previousTurnCardBDef.sector,
    `Sandworm on deck B should devour PREVIOUS turn card (${previousTurnCardBDef.territoryId}), NOT current turn's Old Gap`
  );

  assert(
    devourLocationB?.territoryId !== cardBDef.territoryId,
    `Sandworm should NEVER devour current turn's Old Gap: ${cardBDef.territoryId}`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.02.05 SANDWORM NEVER DEVOURS NEW SPICE");
  console.log("=".repeat(80));

  try {
    testSandworm_DevoursPreviousTurnDeckA();
    testSandworm_NeverDevoursNewSpiceDeckA();
    testSandworm_DevoursPreviousTurnDeckB();
    testSandworm_NeverDevoursNewSpiceDeckB();
    testSandworm_ReturnsNullIfNoPreviousCard();
    testSandworm_ExcludesAllCurrentTurnCards();
    testSandworm_DeckAAndBIndependent();
    testSandworm_RealWorldScenario();
  } catch (error) {
    console.error("Unexpected error during 1.02.05 tests:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.02.05 (sandworm never devours new spice) tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRuleTests();
}

