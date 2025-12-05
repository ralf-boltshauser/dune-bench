/**
 * Rule test: 1.04.10 TRANSPARENCY
 * @rule-test 1.04.10
 *
 * Rule text (numbered_rules/1.md):
 * "The amount (not the type) of Treachery Cards a player has in their hand must be made known upon request by another player during the Bidding Phase."
 *
 * These tests exercise the core behavior of the TRANSPARENCY rule:
 * - Hand size information is available during the bidding phase
 * - Hand size information is accurate (amount, not type)
 * - Hand size information can be queried/accessed
 * - The information reflects the current state (not stale)
 *
 * Note: The current implementation satisfies this rule by making hand size information
 * publicly available through initial declarations (rule 1.04.01) and ensuring it's
 * accessible throughout the bidding phase. The "upon request" requirement is met
 * by making the information always available.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.10.transparency.test.ts
 */

import { Faction, CardLocation, Phase, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { initializeBiddingPhase } from "../../phases/handlers/bidding/initialization";
import { type BiddingContextWithCards } from "../../phases/handlers/bidding/types";
import { type HandSizeDeclaration } from "../../phases/handlers/bidding/types";

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
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    advancedRules: false,
  });
}

function setFactionHandSize(
  state: GameState,
  faction: Faction,
  handSize: number
): GameState {
  const factionState = getFactionState(state, faction);
  const sampleCard = state.treacheryDeck[0];
  if (!sampleCard) {
    throw new Error("Cannot create mock hand: treachery deck is empty");
  }

  const newHand = Array(handSize)
    .fill(null)
    .map((_, i) => ({
      definitionId: `test_card_${i}`,
      type: sampleCard.type,
      location: CardLocation.HAND,
      ownerId: faction,
    }));

  return {
    ...state,
    factions: new Map(state.factions).set(faction, {
      ...factionState,
      hand: newHand,
    }),
  };
}

function createEmptyBiddingContext(): BiddingContextWithCards {
  return {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: Faction.ATREIDES,
    atreidesHasPeeked: false,
    cardsToReturnToDeck: [],
    auctionCards: [],
  };
}

// Helper to extract hand size declarations from events
function getHandSizeDeclarations(events: any[]): HandSizeDeclaration[] {
  const event = events.find((e) => e.type === "HAND_SIZE_DECLARED");
  return event?.data?.declarations || [];
}

// Helper to get hand size for a specific faction from declarations
function getHandSizeForFaction(
  declarations: HandSizeDeclaration[],
  faction: Faction
): number | undefined {
  const declaration = declarations.find((d) => d.faction === faction);
  return declaration?.handSize;
}

// =============================================================================
// Tests for 1.04.10
// =============================================================================

function testTransparency_HandSizeAvailableDuringBidding(): void {
  section("1.04.10 - hand size information is available during bidding phase");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 2);
  state = setFactionHandSize(state, Faction.HARKONNEN, 3);
  state = setFactionHandSize(state, Faction.EMPEROR, 1);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Hand size declarations should be in events
  const declarations = getHandSizeDeclarations(result.result.events);

  assert(
    declarations.length > 0,
    "hand size declarations are available in events"
  );
  assert(
    declarations.length === state.stormOrder.length,
    `all factions have hand size declarations (got ${declarations.length}, expected ${state.stormOrder.length})`
  );
}

function testTransparency_HandSizeAmountIsAccurate(): void {
  section("1.04.10 - hand size amount is accurate (not type)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 2);
  state = setFactionHandSize(state, Faction.HARKONNEN, 3);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarations = getHandSizeDeclarations(result.result.events);

  // Verify hand sizes match actual hand sizes
  const atreidesHandSize = getHandSizeForFaction(declarations, Faction.ATREIDES);
  const harkonnenHandSize = getHandSizeForFaction(declarations, Faction.HARKONNEN);
  const emperorHandSize = getHandSizeForFaction(declarations, Faction.EMPEROR);

  const atreidesActual = getFactionState(state, Faction.ATREIDES).hand.length;
  const harkonnenActual = getFactionState(state, Faction.HARKONNEN).hand.length;
  const emperorActual = getFactionState(state, Faction.EMPEROR).hand.length;

  assert(
    atreidesHandSize === atreidesActual,
    `Atreides hand size is accurate (declared: ${atreidesHandSize}, actual: ${atreidesActual})`
  );
  assert(
    harkonnenHandSize === harkonnenActual,
    `Harkonnen hand size is accurate (declared: ${harkonnenHandSize}, actual: ${harkonnenActual})`
  );
  assert(
    emperorHandSize === emperorActual,
    `Emperor hand size is accurate (declared: ${emperorHandSize}, actual: ${emperorActual})`
  );
}

function testTransparency_HandSizeDoesNotRevealCardTypes(): void {
  section("1.04.10 - hand size does NOT reveal card types (only amount)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 2);
  state = setFactionHandSize(state, Faction.HARKONNEN, 3);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarations = getHandSizeDeclarations(result.result.events);

  // Verify declarations only contain amount, not card types
  for (const declaration of declarations) {
    assert(
      typeof declaration.handSize === "number",
      `declaration contains handSize (number) for ${declaration.faction}`
    );
    assert(
      typeof declaration.category === "string",
      `declaration contains category (string) for ${declaration.faction}`
    );
    // Verify no card type information is included
    assert(
      !("cardTypes" in declaration),
      `declaration does NOT contain card type information for ${declaration.faction}`
    );
    assert(
      !("cards" in declaration),
      `declaration does NOT contain card details for ${declaration.faction}`
    );
  }
}

function testTransparency_HandSizeAvailableForAllFactions(): void {
  section("1.04.10 - hand size information is available for all factions");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 1);
  state = setFactionHandSize(state, Faction.HARKONNEN, 2);
  state = setFactionHandSize(state, Faction.EMPEROR, 3);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarations = getHandSizeDeclarations(result.result.events);

  // Verify all factions in storm order have declarations
  for (const faction of state.stormOrder) {
    const declaration = declarations.find((d) => d.faction === faction);
    assert(
      declaration !== undefined,
      `hand size declaration exists for ${faction}`
    );
    assert(
      typeof declaration.handSize === "number",
      `hand size is a number for ${faction}`
    );
  }
}

function testTransparency_HandSizeReflectsCurrentState(): void {
  section("1.04.10 - hand size information reflects current state");

  let state = buildBaseState();
  // Set specific hand sizes
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 4);
  state = setFactionHandSize(state, Faction.EMPEROR, 1);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarations = getHandSizeDeclarations(result.result.events);

  // Verify hand sizes match current state
  for (const faction of state.stormOrder) {
    const declaration = declarations.find((d) => d.faction === faction);
    const actualHandSize = getFactionState(state, faction).hand.length;

    assert(
      declaration !== undefined,
      `declaration exists for ${faction}`
    );
    assert(
      declaration.handSize === actualHandSize,
      `declared hand size (${declaration.handSize}) matches actual hand size (${actualHandSize}) for ${faction}`
    );
  }
}

function testTransparency_HandSizeCategoriesAreCorrect(): void {
  section("1.04.10 - hand size categories are correctly assigned");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0); // "no cards"
  state = setFactionHandSize(state, Faction.HARKONNEN, 2); // "at least 1 card"
  state = setFactionHandSize(state, Faction.EMPEROR, 4); // "4 or more cards"

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarations = getHandSizeDeclarations(result.result.events);

  const atreidesDecl = declarations.find((d) => d.faction === Faction.ATREIDES);
  const harkonnenDecl = declarations.find((d) => d.faction === Faction.HARKONNEN);
  const emperorDecl = declarations.find((d) => d.faction === Faction.EMPEROR);

  assert(
    atreidesDecl?.category === "no cards",
    `Atreides category is "no cards" (got "${atreidesDecl?.category}")`
  );
  assert(
    harkonnenDecl?.category === "at least 1 card",
    `Harkonnen category is "at least 1 card" (got "${harkonnenDecl?.category}")`
  );
  assert(
    emperorDecl?.category === "4 or more cards",
    `Emperor category is "4 or more cards" (got "${emperorDecl?.category}")`
  );
}

function testTransparency_HandSizeEventIsEmitted(): void {
  section("1.04.10 - HAND_SIZE_DECLARED event is emitted");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 2);
  state = setFactionHandSize(state, Faction.HARKONNEN, 1);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const handSizeEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(
    handSizeEvent !== undefined,
    "HAND_SIZE_DECLARED event is emitted"
  );
  assert(
    Array.isArray(handSizeEvent?.data?.declarations),
    "event contains declarations array"
  );
  assert(
    typeof handSizeEvent?.message === "string",
    "event contains message string"
  );
}

function testTransparency_HandSizeAvailableDuringPhase(): void {
  section("1.04.10 - hand size information is available during bidding phase (not just initialization)");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 2);
  state = setFactionHandSize(state, Faction.HARKONNEN, 3);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Verify phase is in BIDDING phase (not complete)
  assert(
    result.result.phaseComplete === false || result.result.nextPhase === Phase.BIDDING,
    "bidding phase is active (hand size information should be available)"
  );

  // Verify hand size information is in events (available for querying)
  const declarations = getHandSizeDeclarations(result.result.events);
  assert(
    declarations.length > 0,
    "hand size declarations are available in events during bidding phase"
  );
}

function testTransparency_HarkonnenMaxHandSize(): void {
  section("1.04.10 - Harkonnen with max hand size (8 cards) is correctly declared");

  let state = buildBaseState();
  // Harkonnen has max hand size of 8 (Rule 2.05.07 - TRAMENDOUSLY TREACHEROUS)
  state = setFactionHandSize(state, Faction.ATREIDES, 4); // Standard max
  state = setFactionHandSize(state, Faction.HARKONNEN, 8); // Harkonnen max
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context = createEmptyBiddingContext();
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarations = getHandSizeDeclarations(result.result.events);

  const harkonnenDecl = declarations.find((d) => d.faction === Faction.HARKONNEN);
  const harkonnenActual = getFactionState(state, Faction.HARKONNEN).hand.length;

  assert(
    harkonnenDecl !== undefined,
    "Harkonnen hand size declaration exists"
  );
  assert(
    harkonnenDecl.handSize === 8,
    `Harkonnen hand size is correctly declared as 8 (got ${harkonnenDecl.handSize})`
  );
  assert(
    harkonnenDecl.handSize === harkonnenActual,
    `Harkonnen declared hand size (${harkonnenDecl.handSize}) matches actual (${harkonnenActual})`
  );
  assert(
    harkonnenDecl.category === "4 or more cards",
    `Harkonnen with 8 cards is categorized as "4 or more cards" (got "${harkonnenDecl.category}")`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.10 TRANSPARENCY tests...\n");

  testTransparency_HandSizeAvailableDuringBidding();
  testTransparency_HandSizeAmountIsAccurate();
  testTransparency_HandSizeDoesNotRevealCardTypes();
  testTransparency_HandSizeAvailableForAllFactions();
  testTransparency_HandSizeReflectsCurrentState();
  testTransparency_HandSizeCategoriesAreCorrect();
  testTransparency_HandSizeEventIsEmitted();
  testTransparency_HandSizeAvailableDuringPhase();
  testTransparency_HarkonnenMaxHandSize();

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

