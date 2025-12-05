/**
 * Rule test: 1.13.02 DOUBLE SPICE BLOW
 *
 * Rule text (numbered_rules/1.md):
 * 1.13.02 DOUBLE SPICE BLOW: After 1.02.01 another Spice Card will be Revealed creating a second Spice Card discard pile (discard pile A and discard pile B).
 *
 * @rule-test 1.13.02
 */

import { type GameState, Phase, Faction, SpiceCardLocation } from "../../types";
import { createGameState } from "../../state/factory";
import { type SpiceBlowContext } from "../../phases/handlers/spice-blow/types";
import { shouldRevealCardB } from "../../phases/handlers/spice-blow/initialization";
import { SpiceBlowPhaseHandler } from "../../phases/handlers/spice-blow";
import { getSpiceCardDefinition } from "../../data";

// Minimal harness
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

function buildState(advancedRules: boolean): GameState {
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 3,
    phase: Phase.SPICE_BLOW,
    advancedRules,
  });
  return state;
}

function buildContext(cardBRevealed: boolean): SpiceBlowContext {
  return {
    cardARevealed: true,
    cardBRevealed,
    lastSpiceLocation: null,
    shaiHuludCount: 0,
    nexusTriggered: false,
    nexusResolved: false,
    fremenWormChoice: null,
    factionsActedInNexus: new Set(),
    turnOneWormsSetAside: [],
    fremenProtectionDecision: null,
    pendingDevourLocation: null,
    pendingDevourDeck: null,
  };
}

function testDoubleSpiceBlow_onlyInAdvancedRules(): void {
  section("1.13.02 - Card B only revealed in Advanced rules");

  const basicState = buildState(false);
  const advancedState = buildState(true);
  const context = buildContext(false);

  const basicShouldReveal = shouldRevealCardB(basicState, context);
  const advancedShouldReveal = shouldRevealCardB(advancedState, context);

  assert(
    basicShouldReveal === false,
    "In basic rules, Card B should NOT be revealed (no double spice blow)"
  );
  assert(
    advancedShouldReveal === true,
    "In advanced rules, Card B should be revealed to create second discard pile"
  );
}

function testDoubleSpiceBlow_onlyOncePerPhase(): void {
  section("1.13.02 - Card B only revealed once per phase");

  const state = buildState(true);
  const contextNotRevealed = buildContext(false);
  const contextAlreadyRevealed = buildContext(true);

  const firstCheck = shouldRevealCardB(state, contextNotRevealed);
  const secondCheck = shouldRevealCardB(state, contextAlreadyRevealed);

  assert(
    firstCheck === true,
    "When Card B has not yet been revealed, shouldRevealCardB should return true"
  );
  assert(
    secondCheck === false,
    "After Card B is marked revealed, shouldRevealCardB should return false"
  );
}

/**
 * Test: Turn 1 with Shai-Hulud in Deck B (Advanced Rules)
 * 
 * Tests that Card B is only revealed once, even when Shai-Hulud cards appear
 * and trigger recursive card draws.
 * 
 * @rule-test 1.02.02 - FIRST TURN: Shai-Hulud cards are set aside on Turn 1
 * @rule-test 1.02.05 - SHAI-HULUD: Continue discarding until Territory Card
 * @rule-test 1.13.02 - DOUBLE SPICE BLOW: Card B revealed in Advanced Rules
 */
function testDoubleSpiceBlow_turn1ShaiHuludInDeckB(): void {
  section("1.13.02 + 1.02.02 + 1.02.05 - Turn 1: Card B stops after first territory card (even with Shai-Hulud)");

  // This test catches the bug where Card B was being revealed multiple times
  // when Shai-Hulud cards appeared in deck B on Turn 1.
  // 
  // Rules being tested:
  // - 1.13.02: Double Spice Blow (Card B revealed in Advanced Rules)
  // - 1.02.02: Turn 1 Shai-Hulud handling (set aside, continue drawing)
  // - 1.02.05: Continue drawing until Territory Card is discarded
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 1,
    phase: Phase.SPICE_BLOW,
    advancedRules: true, // Advanced rules = double spice blow
  });

  // Set up deck A with a simple territory card
  const cardDefA = getSpiceCardDefinition("spice_sihaya_ridge");
  if (!cardDefA) throw new Error("Card not found");
  state.spiceDeckA = [{
    definitionId: cardDefA.id,
    type: cardDefA.type,
    location: SpiceCardLocation.DECK,
  }];

  // Set up deck B with Shai-Hulud cards followed by territory cards
  // This is the bug scenario: Shai-Hulud -> Shai-Hulud -> Territory -> Territory
  // Should stop after FIRST territory card, not draw the second one
  const worm1Def = getSpiceCardDefinition("shai_hulud_1");
  const worm2Def = getSpiceCardDefinition("shai_hulud_2");
  const cardDefB1 = getSpiceCardDefinition("spice_the_minor_erg");
  const cardDefB2 = getSpiceCardDefinition("spice_hagga_basin");
  
  if (!worm1Def || !worm2Def || !cardDefB1 || !cardDefB2) {
    throw new Error("Cards not found");
  }

  state.spiceDeckB = [
    { definitionId: worm1Def.id, type: worm1Def.type, location: SpiceCardLocation.DECK },
    { definitionId: worm2Def.id, type: worm2Def.type, location: SpiceCardLocation.DECK },
    { definitionId: cardDefB1.id, type: cardDefB1.type, location: SpiceCardLocation.DECK },
    { definitionId: cardDefB2.id, type: cardDefB2.type, location: SpiceCardLocation.DECK },
  ];

  const handler = new SpiceBlowPhaseHandler();
  const initResult = handler.initialize(state);

  // Process until complete
  let currentState = initResult.state;
  let phaseComplete = initResult.phaseComplete;
  let stepCount = 0;
  const maxSteps = 20; // Safety limit
  let finalContext: SpiceBlowContext | null = null;

  while (!phaseComplete && stepCount < maxSteps) {
    stepCount++;
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;
    finalContext = stepResult.context;

    if (phaseComplete) {
      break;
    }
  }

  if (!finalContext) {
    throw new Error("Test failed: no context returned");
  }

  // Count territory cards revealed from deck B
  // We should have exactly 1 territory card from deck B (The Minor Erg)
  // NOT 2 (The Minor Erg + Hagga Basin)
  const territoryCardsFromB = currentState.spiceDiscardB.filter(card => {
    const def = getSpiceCardDefinition(card.definitionId);
    return def && def.type === "territory";
  });

  assert(
    territoryCardsFromB.length === 1,
    `Should have exactly 1 territory card in discard B, got ${territoryCardsFromB.length}`
  );

  // Verify cardBRevealed is true
  assert(
    finalContext.cardBRevealed === true,
    "cardBRevealed should be true after first territory card from deck B"
  );

  // Verify the second territory card (Hagga Basin) is still in the deck
  const remainingDeckB = currentState.spiceDeckB;
  const hasHaggaBasin = remainingDeckB.some(
    card => card.definitionId === cardDefB2.id
  );
  assert(
    hasHaggaBasin === true,
    "Second territory card (Hagga Basin) should still be in deck B, not drawn"
  );
}

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.13.02: DOUBLE SPICE BLOW");
  console.log("=".repeat(80));

  testDoubleSpiceBlow_onlyInAdvancedRules();
  testDoubleSpiceBlow_onlyOncePerPhase();
  testDoubleSpiceBlow_turn1ShaiHuludInDeckB();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
