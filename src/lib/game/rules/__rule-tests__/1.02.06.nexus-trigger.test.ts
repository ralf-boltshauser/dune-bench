/**
 * Rule tests: 1.02.06 NEXUS
 * @rule-test 1.02.06
 *
 * Rule text:
 * "Revealing a Shai-Hulud card after the first Turn causes a Nexus at the
 *  end of the Phase. In a Nexus, Alliances can be formed and broken."
 *
 * These tests focus on the Nexus trigger helpers:
 * - triggerNexus() should NOT set nexusOccurring on turn 1 (guarded by detection).
 * - On turn 2+, with shaiHuludCount > 0 and no Fremen in game, triggerNexus()
 *   sets nexusOccurring, marks nexusTriggered and emits a Nexus-started event.
 */

/* eslint-disable no-console */

import { createGameState } from "../../state/factory";
import {
  Faction,
  type GameState,
} from "../../types";
import {
  createInitialContext,
  type SpiceBlowContext,
} from "../../phases/handlers/spice-blow/context";
import type { PhaseEvent } from "../../phases/types";
import { triggerNexus } from "../../phases/handlers/spice-blow/nexus";

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

function buildState(turn: number, factions: Faction[]): GameState {
  const base = createGameState({
    factions,
    advancedRules: true,
  });
  return { ...base, turn };
}

function testTriggerNexus_turnTwo_noFremen(): void {
  section("1.02.06 - Nexus is triggered on turn 2+ after Shai-Hulud");

  const state = buildState(2, [Faction.ATREIDES, Faction.HARKONNEN]);
  const context: SpiceBlowContext = {
    ...createInitialContext(),
    shaiHuludCount: 1,
    nexusTriggered: false,
  };
  const events: PhaseEvent[] = [];

  const result = triggerNexus(state, context, events);

  const finalState = result.state;
  const finalContext = result.context;

  assert(
    finalState.nexusOccurring === true,
    "triggerNexus sets state.nexusOccurring to true"
  );
  assert(
    finalContext.nexusTriggered === true,
    "triggerNexus marks context.nexusTriggered as true"
  );
  assert(
    events.length > 0,
    "triggerNexus emits at least one event (Nexus started)"
  );
}

function testTriggerNexus_doesNotDependOnTurnOne(): void {
  section("1.02.06 - turn 1 guard is enforced by detection, not by triggerNexus");

  const stateTurn1 = buildState(1, [Faction.ATREIDES, Faction.HARKONNEN]);
  const context: SpiceBlowContext = {
    ...createInitialContext(),
    shaiHuludCount: 1,
    nexusTriggered: false,
  };
  const events: PhaseEvent[] = [];

  const result = triggerNexus(stateTurn1, context, events);

  // triggerNexus itself does not check the turn; that responsibility is in
  // detection helpers (1.02.03). Here we just assert that it behaves
  // consistently regardless of turn once called.
  assert(
    result.state.nexusOccurring === true,
    "triggerNexus always sets nexusOccurring once invoked (turn check is external)"
  );
}

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.02.06 NEXUS TRIGGER");
  console.log("=".repeat(80));

  try {
    testTriggerNexus_turnTwo_noFremen();
  } catch (error) {
    console.error(
      "❌ testTriggerNexus_turnTwo_noFremen failed:",
      error
    );
    failCount++;
  }

  try {
    testTriggerNexus_doesNotDependOnTurnOne();
  } catch (error) {
    console.error(
      "❌ testTriggerNexus_doesNotDependOnTurnOne failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.02.06 tests completed: ${passCount} passed, ${failCount} failed`
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


