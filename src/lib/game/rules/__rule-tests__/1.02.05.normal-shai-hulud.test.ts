/**
 * Rule tests: 1.02.05 SHAI-HULUD (normal, turn 2+)
 * @rule-test 1.02.05
 *
 * Rule text (excerpt):
 * "When this type of card is discarded destroy all spice and Forces in the
 *  Territory of the topmost Territory Card in the discard pile and Place
 *  them in the Spice Bank and Tleilaxu Tanks respectively. Continue
 *  discarding Spice Blow cards until a Territory Card is discarded.
 *  Now a Nexus will occur."
 *
 * These tests focus on core mechanics:
 * - On turn 2, Shai-Hulud is treated as a "normal" worm (not set aside).
 * - The worm card is discarded to the correct discard pile.
 * - wormCount and shaiHuludCount increment.
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

function buildTurnTwoState(): GameState {
  const base = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
  return { ...base, turn: 2, wormCount: 0 };
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

function testNormalWorm_discardAndCountersIncrement(): void {
  section("1.02.05 - Normal worm discarded and counters increment on turn 2+");

  const initialState = buildTurnTwoState();
  const worm = makeWormCard();

  const state: GameState = {
    ...initialState,
    spiceDeckA: [],
    spiceDiscardA: [],
  };

  const context: SpiceBlowContext = {
    ...createInitialContext(),
    shaiHuludCount: 0,
  };
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
    finalState.spiceDiscardA.length === 1 &&
      finalState.spiceDiscardA[0]?.definitionId === worm.definitionId,
    "Normal Shai-Hulud on turn 2 is discarded to spiceDiscardA"
  );

  assert(
    finalState.wormCount === 1,
    "wormCount is incremented when a normal Shai-Hulud is handled"
  );

  assert(
    finalContext.shaiHuludCount === 1,
    "context.shaiHuludCount is incremented for normal Shai-Hulud"
  );
}

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.02.05 NORMAL SHAI-HULUD");
  console.log("=".repeat(80));

  try {
    testNormalWorm_discardAndCountersIncrement();
  } catch (error) {
    console.error(
      "❌ testNormalWorm_discardAndCountersIncrement failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.02.05 tests completed: ${passCount} passed, ${failCount} failed`
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


