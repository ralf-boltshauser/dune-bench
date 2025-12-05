/**
 * Rule tests: 1.02.03 NO NEXUS
 * @rule-test 1.02.03
 *
 * Rule text:
 * "There can not be a Nexus on Turn one for any reason."
 *
 * These tests verify that:
 * - canNexusOccur() is false on turn 1, true from turn 2 onward.
 * - checkNexusTriggerAfterTerritoryCard() never triggers on turn 1,
 *   even if shaiHuludCount > 0.
 */

/* eslint-disable no-console */

import { createGameState } from "../../state/factory";
import { Faction, type GameState } from "../../types";
import {
  canNexusOccur,
  checkNexusTriggerAfterTerritoryCard,
} from "../../phases/handlers/spice-blow/nexus/detection";
import {
  createInitialContext,
  type SpiceBlowContext,
} from "../../phases/handlers/spice-blow/context";

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

function buildState(turn: number): GameState {
  const base = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
  return { ...base, turn };
}

function testCanNexusOccur_respectsTurnNumber(): void {
  section("1.02.03 - canNexusOccur respects turn number");

  const stateTurn1 = buildState(1);
  const stateTurn2 = buildState(2);

  const ctx: SpiceBlowContext = createInitialContext();

  assert(
    canNexusOccur(stateTurn1, ctx) === false,
    "Nexus cannot occur on turn 1"
  );
  assert(
    canNexusOccur(stateTurn2, ctx) === true,
    "Nexus may occur on turn 2+"
  );
}

function testCheckNexusTriggerAfterTerritoryCard_noTriggerOnTurnOne(): void {
  section(
    "1.02.03 - checkNexusTriggerAfterTerritoryCard does not trigger on turn 1"
  );

  const baseCtx: SpiceBlowContext = {
    ...createInitialContext(),
    shaiHuludCount: 1,
    nexusTriggered: false,
  };

  const stateTurn1 = buildState(1);
  const stateTurn2 = buildState(2);

  const triggerTurn1 = checkNexusTriggerAfterTerritoryCard(
    stateTurn1,
    baseCtx
  );
  const triggerTurn2 = checkNexusTriggerAfterTerritoryCard(
    stateTurn2,
    baseCtx
  );

  assert(
    triggerTurn1 === false,
    "Even after Shai-Hulud and Territory Card, NO Nexus trigger on turn 1"
  );
  assert(
    triggerTurn2 === true,
    "After Shai-Hulud and Territory Card, Nexus trigger allowed on turn 2+"
  );
}

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 1.02.03 NO NEXUS ON TURN ONE");
  console.log("=".repeat(80));

  try {
    testCanNexusOccur_respectsTurnNumber();
  } catch (error) {
    console.error(
      "❌ testCanNexusOccur_respectsTurnNumber failed:",
      error
    );
    failCount++;
  }

  try {
    testCheckNexusTriggerAfterTerritoryCard_noTriggerOnTurnOne();
  } catch (error) {
    console.error(
      "❌ testCheckNexusTriggerAfterTerritoryCard_noTriggerOnTurnOne failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 1.02.03 tests completed: ${passCount} passed, ${failCount} failed`
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


