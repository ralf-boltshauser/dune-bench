/**
 * Rule test: 1.02.01 BLOW THE SPICE
 * @rule-test 1.02.01
 *
 * Rule text (numbered_rules/1.md):
 * "The top card of the Spice Deck is Revealed and discarded."
 *
 * These tests exercise the core behavior of revealSpiceCard():
 * - Draw the top card from the correct deck
 * - Remove it from the deck
 * - Move it to the appropriate discard pile
 * - Mark the corresponding "cardXRevealed" flag in context
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.02.01.blow-the-spice.test.ts
 */

import {
  Faction,
  SpiceCardLocation,
  SpiceCardType,
  type GameState,
  type SpiceCard,
} from "../../types";
import { ALL_SPICE_CARDS } from "../../data";
import { createGameState } from "../../state/factory";
import {
  createInitialContext,
  type SpiceBlowContext,
} from "../../phases/handlers/spice-blow/context";
import {
  revealSpiceCard,
} from "../../phases/handlers/spice-blow/reveal";
import type {
  DeckType,
  SpiceBlowStepResult,
} from "../../phases/handlers/spice-blow/types";

// =============================================================================
// Minimal test harness (console-based, like movement.test.ts)
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
  // Use two standard factions to satisfy createGameState validation (2–6 factions)
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

function makeTerritorySpiceCard(): SpiceCard {
  const territoryDef = ALL_SPICE_CARDS.find(
    (def) =>
      def.type === SpiceCardType.TERRITORY &&
      def.territoryId !== undefined &&
      def.sector !== undefined
  );

  if (!territoryDef) {
    throw new Error(
      "Could not find a territory spice card definition for 1.02.01 tests"
    );
  }

  return {
    definitionId: territoryDef.id,
    type: territoryDef.type,
    location: SpiceCardLocation.DECK,
  };
}

function runReveal(
  state: GameState,
  deckType: DeckType,
  context: SpiceBlowContext
): SpiceBlowStepResult {
  // For these tests we do not want recursive reveals, so we pass a stub
  const stubReveal = (_state: GameState, _deck: DeckType): SpiceBlowStepResult =>
    // This should never be called in our scenarios; if it is, fail loudly.
    (() => {
      throw new Error("stubReveal should not have been called in this test");
    })();

  return revealSpiceCard(state, deckType, context, stubReveal);
}

// =============================================================================
// Tests for 1.02.01
// =============================================================================

function testBlowTheSpice_drawsAndDiscardsTopCard(): void {
  section("1.02.01 - basic blow behavior (draw & discard)");

  const initialState = buildBaseState();
  const card = makeTerritorySpiceCard();

  // Start with a deck that has only our test card, and an empty discard pile
  const state: GameState = {
    ...initialState,
    spiceDeckA: [card],
    spiceDiscardA: [],
  };
  const context = createInitialContext();

  const result = runReveal(state, "A", context);

  const finalState = result.state;
  const finalContext = result.context;

  assert(
    finalState.spiceDeckA.length === 0,
    "removes the top card from spiceDeckA"
  );
  assert(
    finalState.spiceDiscardA.length === 1,
    "adds the revealed card to spiceDiscardA"
  );
  assert(
    finalState.spiceDiscardA[0]?.definitionId === card.definitionId,
    "discard pile contains the correct card"
  );
  assert(
    finalContext.cardARevealed === true,
    "context.cardARevealed is set to true after reveal"
  );
  assert(
    finalContext.cardBRevealed === false,
    "context.cardBRevealed remains false"
  );
}

function testBlowTheSpice_doesNotRevealSameDeckTwice(): void {
  section("1.02.01 - guard: already revealed deck is not drawn again");

  const initialState = buildBaseState();
  const card = makeTerritorySpiceCard();

  const state: GameState = {
    ...initialState,
    spiceDeckA: [card],
    spiceDiscardA: [],
  };
  const context: SpiceBlowContext = {
    ...createInitialContext(),
    cardARevealed: true, // deck A already revealed
  };

  const result = runReveal(state, "A", context);

  const finalState = result.state;
  const finalContext = result.context;

  assert(
    finalState.spiceDeckA.length === 1 &&
      finalState.spiceDeckA[0]?.definitionId === card.definitionId,
    "when cardARevealed is already true, deckA is left unchanged"
  );
  assert(
    finalState.spiceDiscardA.length === 0,
    "when cardARevealed is already true, discardA remains unchanged"
  );
  assert(
    finalContext.cardARevealed === true,
    "context.cardARevealed stays true"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.02.01 BLOW THE SPICE");
  console.log("=".repeat(80));

  try {
    testBlowTheSpice_drawsAndDiscardsTopCard();
  } catch (error) {
    console.error("❌ testBlowTheSpice_drawsAndDiscardsTopCard failed:", error);
    failCount++;
  }

  try {
    testBlowTheSpice_doesNotRevealSameDeckTwice();
  } catch (error) {
    console.error(
      "❌ testBlowTheSpice_doesNotRevealSameDeckTwice failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.02.01 tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // Allow this file to be run directly via tsx
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRuleTests();
}

