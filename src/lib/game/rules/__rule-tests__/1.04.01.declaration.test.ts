/**
 * Rule test: 1.04.01 DECLARATION
 * @rule-test 1.04.01
 *
 * Rule text (numbered_rules/1.md):
 * "Before bidding starts, all players must publicly announce how many Treachery Cards they hold."
 *
 * These tests exercise the core behavior of hand size declarations:
 * - All players declare their hand size before bidding starts
 * - Declarations are emitted as events
 * - Hand size is correctly calculated from faction state
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.01.declaration.test.ts
 */

import { initializeBiddingPhase } from "../../phases/handlers/bidding/initialization";
import {
  type BiddingContextWithCards,
  type HandSizeDeclaration,
} from "../../phases/handlers/bidding/types";
import { getFactionState } from "../../state";
import { createGameState } from "../../state/factory";
import { CardLocation, Faction, type GameState } from "../../types";

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
  // Get a valid card type from the deck for mock cards
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

// =============================================================================
// Tests for 1.04.01
// =============================================================================

function testDeclaration_AllPlayersDeclareHandSize(): void {
  section("1.04.01 - all players declare hand size");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 2);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 4);

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Check that hand size declaration event was emitted
  const declarationEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(
    declarationEvent !== undefined,
    "hand size declaration event is emitted"
  );

  const declarations = (declarationEvent?.data?.declarations ||
    []) as HandSizeDeclaration[];
  assert(declarations.length === 3, "all 3 factions declared their hand size");

  // Check that each faction's declaration is present
  const atreidesDecl = declarations.find((d) => d.faction === Faction.ATREIDES);
  const harkonnenDecl = declarations.find(
    (d) => d.faction === Faction.HARKONNEN
  );
  const emperorDecl = declarations.find((d) => d.faction === Faction.EMPEROR);

  assert(atreidesDecl !== undefined, "Atreides declaration is present");
  assert(atreidesDecl?.handSize === 2, "Atreides hand size is 2");
  assert(harkonnenDecl !== undefined, "Harkonnen declaration is present");
  assert(harkonnenDecl?.handSize === 0, "Harkonnen hand size is 0");
  assert(emperorDecl !== undefined, "Emperor declaration is present");
  assert(emperorDecl?.handSize === 4, "Emperor hand size is 4");
}

function testDeclaration_DeclarationHappensBeforeBidding(): void {
  section("1.04.01 - declaration happens before bidding starts");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 1);
  state = setFactionHandSize(state, Faction.HARKONNEN, 2);

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  // Declaration event should be the first event (or among the first)
  const declarationEventIndex = result.result.events.findIndex(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );
  const auctionEventIndex = result.result.events.findIndex(
    (e) => e.type === "AUCTION_STARTED"
  );

  assert(declarationEventIndex !== -1, "declaration event is present");
  assert(
    auctionEventIndex === -1 || declarationEventIndex < auctionEventIndex,
    "declaration happens before auction starts (or no auction if no eligible bidders)"
  );
}

function testDeclaration_HandSizeCorrectlyCalculated(): void {
  section("1.04.01 - hand size correctly calculated from faction state");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 3);
  state = setFactionHandSize(state, Faction.HARKONNEN, 1);

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarationEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(declarationEvent !== undefined, "declaration event is emitted");

  const declarations = (declarationEvent?.data?.declarations ||
    []) as HandSizeDeclaration[];
  const atreidesDecl = declarations.find((d) => d.faction === Faction.ATREIDES);
  const harkonnenDecl = declarations.find(
    (d) => d.faction === Faction.HARKONNEN
  );

  // Verify hand size matches actual faction state
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);

  assert(
    atreidesDecl?.handSize === atreidesState.hand.length,
    "Atreides declared hand size matches actual hand length"
  );
  assert(
    harkonnenDecl?.handSize === harkonnenState.hand.length,
    "Harkonnen declared hand size matches actual hand length"
  );
}

function testDeclaration_EmptyHandsDeclared(): void {
  section("1.04.01 - empty hands are declared correctly");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0);
  state = setFactionHandSize(state, Faction.HARKONNEN, 0);
  state = setFactionHandSize(state, Faction.EMPEROR, 0);

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarationEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(declarationEvent !== undefined, "declaration event is emitted");

  const allDeclarations = (declarationEvent?.data?.declarations ||
    []) as HandSizeDeclaration[];
  const allZero = allDeclarations.every((d) => d.handSize === 0);

  assert(allZero, "all factions with empty hands declare 0 cards");
}

function testDeclaration_AllPlayersInStormOrderDeclare(): void {
  section("1.04.01 - ALL players in stormOrder declare (not just some)");

  let state = buildBaseState();
  // Set different hand sizes for all 3 factions
  state = setFactionHandSize(state, Faction.ATREIDES, 1);
  state = setFactionHandSize(state, Faction.HARKONNEN, 2);
  state = setFactionHandSize(state, Faction.EMPEROR, 3);

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarationEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(declarationEvent !== undefined, "declaration event is emitted");

  const declarations = (declarationEvent?.data?.declarations ||
    []) as HandSizeDeclaration[];

  // Verify ALL factions in stormOrder declared
  assert(
    declarations.length === state.stormOrder.length,
    `all ${state.stormOrder.length} factions in stormOrder declared (got ${declarations.length})`
  );

  // Verify each faction in stormOrder has a declaration
  for (const faction of state.stormOrder) {
    const decl = declarations.find((d) => d.faction === faction);
    assert(
      decl !== undefined,
      `${faction} (in stormOrder) has a declaration`
    );
  }
}

function testDeclaration_CategoryLogic(): void {
  section("1.04.01 - declaration categories are correct");

  let state = buildBaseState();
  state = setFactionHandSize(state, Faction.ATREIDES, 0); // "no cards"
  state = setFactionHandSize(state, Faction.HARKONNEN, 2); // "at least 1 card"
  state = setFactionHandSize(state, Faction.EMPEROR, 4); // "4 or more cards"

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarationEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(declarationEvent !== undefined, "declaration event is emitted");

  const declarations = (declarationEvent?.data?.declarations ||
    []) as HandSizeDeclaration[];

  const atreidesDecl = declarations.find((d) => d.faction === Faction.ATREIDES);
  const harkonnenDecl = declarations.find((d) => d.faction === Faction.HARKONNEN);
  const emperorDecl = declarations.find((d) => d.faction === Faction.EMPEROR);

  assert(
    atreidesDecl?.category === "no cards",
    `Atreides with 0 cards has category "no cards" (got "${atreidesDecl?.category}")`
  );
  assert(
    harkonnenDecl?.category === "at least 1 card",
    `Harkonnen with 2 cards has category "at least 1 card" (got "${harkonnenDecl?.category}")`
  );
  assert(
    emperorDecl?.category === "4 or more cards",
    `Emperor with 4 cards has category "4 or more cards" (got "${emperorDecl?.category}")`
  );
}

function testDeclaration_HandSizeGreaterThan4(): void {
  section("1.04.01 - hand size greater than 4 is still declared correctly");

  let state = buildBaseState();
  // Harkonnen can have more than 4 (max is 8)
  state = setFactionHandSize(state, Faction.HARKONNEN, 6);

  const context: BiddingContextWithCards = {
    cardsForAuction: [],
    currentCardIndex: 0,
    currentBid: 0,
    highBidder: null,
    passedFactions: new Set(),
    startingBidder: state.stormOrder[0],
    atreidesHasPeeked: false,
    auctionCards: [],
  };
  const biddingOrder = state.stormOrder;

  const result = initializeBiddingPhase(context, state, biddingOrder);

  const declarationEvent = result.result.events.find(
    (e) => e.type === "HAND_SIZE_DECLARED"
  );

  assert(declarationEvent !== undefined, "declaration event is emitted");

  const declarations = (declarationEvent?.data?.declarations ||
    []) as HandSizeDeclaration[];
  const harkonnenDecl = declarations.find((d) => d.faction === Faction.HARKONNEN);

  assert(
    harkonnenDecl?.handSize === 6,
    `Harkonnen with 6 cards declares 6 (got ${harkonnenDecl?.handSize})`
  );
  assert(
    harkonnenDecl?.category === "4 or more cards",
    `Harkonnen with 6 cards has category "4 or more cards" (got "${harkonnenDecl?.category}")`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.01 DECLARATION tests...\n");

  testDeclaration_AllPlayersDeclareHandSize();
  testDeclaration_DeclarationHappensBeforeBidding();
  testDeclaration_HandSizeCorrectlyCalculated();
  testDeclaration_EmptyHandsDeclared();
  testDeclaration_AllPlayersInStormOrderDeclare();
  testDeclaration_CategoryLogic();
  testDeclaration_HandSizeGreaterThan4();

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
