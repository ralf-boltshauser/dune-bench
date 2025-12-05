/**
 * Rule tests: 1.02.02 FIRST TURN (Shai-Hulud)
 * @rule-test 1.02.02
 *
 * Rule text (numbered_rules/1.md):
 * "During the first turn's Spice Blow Phase only, all Shai-Hulud cards
 *  Revealed are ignored, Set Aside, then reshuffled back into the Spice
 *  deck after this Phase."
 *
 * These tests verify that on turn 1:
 * - Worm cards are NOT discarded when revealed.
 * - Worm cards are recorded in context.turnOneWormsSetAside.
 * - At cleanup, reshuffleTurnOneWorms puts the set-aside worms back
 *   into the spice decks (A/B).
 */

/* eslint-disable no-console */

import {
  Faction,
  SpiceCardLocation,
  SpiceCardType,
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
import { reshuffleTurnOneWorms } from "../../phases/handlers/spice-blow/deck/reshuffle";
import type { PhaseEvent } from "../../phases/types";

// =============================================================================
// Minimal test harness
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

function buildTurnOneState(): GameState {
  const base = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
  return { ...base, turn: 1 };
}

function makeWormCard(definitionId = "shai_hulud_1"): SpiceCard {
  return {
    definitionId,
    type: SpiceCardType.SHAI_HULUD,
    location: SpiceCardLocation.DECK,
  };
}

function stubReveal(
  state: GameState,
  _deck: DeckType,
  context: SpiceBlowContext
): SpiceBlowStepResult {
  // For these tests we only care about the immediate effect of the first worm;
  // do not actually continue revealing.
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
// Tests for 1.02.02
// =============================================================================

function testTurnOneWorm_isSetAsideNotDiscarded(): void {
  section("1.02.02 - Turn 1 worm is set aside, not discarded");

  const worm = makeWormCard();
  const initialState = buildTurnOneState();

  // Simulate that revealSpiceCard already removed the card from the deck
  const state: GameState = {
    ...initialState,
    spiceDeckA: [],
    spiceDiscardA: [],
  };

  const context = createInitialContext();
  const events: PhaseEvent[] = [];

  const result = handleShaiHulud(
    state,
    worm,
    "A",
    context,
    events,
    (s, deck) => stubReveal(s, deck, context)
  );

  const finalState = result.state;
  const finalContext = result.context;

  assert(
    finalState.spiceDiscardA.length === 0,
    "Turn 1 Shai-Hulud is NOT discarded to spiceDiscardA"
  );
  assert(
    finalContext.turnOneWormsSetAside.length === 1 &&
      finalContext.turnOneWormsSetAside[0]?.definitionId === worm.definitionId,
    "Turn 1 Shai-Hulud is recorded in context.turnOneWormsSetAside"
  );
}

function testTurnOneWorms_reshuffledBackIntoDecks(): void {
  section("1.02.02 - Set-aside worms are reshuffled back into decks at cleanup");

  const initialState = buildTurnOneState();
  const wormA = makeWormCard("shai_hulud_1");
  const wormB = makeWormCard("shai_hulud_2");

  const state: GameState = {
    ...initialState,
    spiceDeckA: [],
    spiceDeckB: [],
  };

  const context: SpiceBlowContext = {
    ...createInitialContext(),
    turnOneWormsSetAside: [wormA, wormB],
  };

  const reshuffled = reshuffleTurnOneWorms(state, context);

  const allDeckCards = [
    ...reshuffled.spiceDeckA,
    ...reshuffled.spiceDeckB,
  ].map((c) => c.definitionId);

  assert(
    allDeckCards.includes(wormA.definitionId) &&
      allDeckCards.includes(wormB.definitionId),
    "All set-aside worms are present in spiceDeckA/B after reshuffleTurnOneWorms"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.02.02 FIRST TURN SHAI-HULUD");
  console.log("=".repeat(80));

  try {
    testTurnOneWorm_isSetAsideNotDiscarded();
  } catch (error) {
    console.error(
      "❌ testTurnOneWorm_isSetAsideNotDiscarded failed:",
      error
    );
    failCount++;
  }

  try {
    testTurnOneWorms_reshuffledBackIntoDecks();
  } catch (error) {
    console.error(
      "❌ testTurnOneWorms_reshuffledBackIntoDecks failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.02.02 tests completed: ${passCount} passed, ${failCount} failed`
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


