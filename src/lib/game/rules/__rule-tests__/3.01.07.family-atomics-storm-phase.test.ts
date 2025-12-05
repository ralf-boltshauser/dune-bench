/**
 * Rule test: 3.01.07 FAMILY ATOMICS
 *
 * Rule text (numbered_rules/3.md):
 * "3.01.07 FAMILY ATOMICS: Special-Storm - After the first game Turn, if you have one or more Forces on
 *  the Shield Wall or a Territory adjacent to the Shield Wall with no storm between your Sector and the Wall
 *  play after the storm movement is calculated but, before the storm is moved. All Forces on the Shield Wall
 *  are destroyed. Place the Destroyed Shield Wall token on the Shield Wall as a reminder. The Imperial Basin,
 *  Arrakeen, and Carthag are no longer protected from the Storm for the rest of the game. Set Aside this card."
 *
 * This rule is enforced by the Family Atomics storm handlers:
 * - checkFamilyAtomics: detects eligible factions after storm movement is calculated and prompts them
 * - processFamilyAtomics: when played, destroys all forces on Shield Wall and sets shieldWallDestroyed=true
 *
 * @rule-test 3.01.07
 */

import {
  Faction,
  TerritoryId,
  CardLocation,
  type GameState,
  type TreacheryCard,
} from "../../types";
import { getTreacheryCardDefinition } from "../../data";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import type { AgentResponse } from "../../phases/types";
import {
  type StormPhaseContext,
  checkFamilyAtomics,
  processFamilyAtomics,
} from "../../phases/handlers/storm/family-atomics";

// =============================================================================
// Minimal console-based test harness
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

function buildBaseStormState(): GameState {
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Start on turn 2 so Family Atomics is allowed
  return { ...state, turn: 2 };
}

function giveFamilyAtomicsToFaction(
  state: GameState,
  faction: Faction
): GameState {
  const def = getTreacheryCardDefinition("family_atomics");
  if (!def) throw new Error("Missing family_atomics definition for tests");

  const card: TreacheryCard = {
    definitionId: def.id,
    location: CardLocation.HAND,
    ownerId: faction,
  };

  const factions = new Map(state.factions);
  const factionState = { ...getFactionState(state, faction) };
  factionState.hand = [...factionState.hand, card];
  factions.set(faction, factionState);

  return { ...state, factions };
}

function placeForcesOnShieldWall(
  state: GameState,
  faction: Faction,
  count: number,
  sector: number
): GameState {
  const factions = new Map(state.factions);
  const factionState = { ...getFactionState(state, faction) };
  const forces = { ...factionState.forces };
  const onBoard = [...forces.onBoard];

  onBoard.push({
    territoryId: TerritoryId.SHIELD_WALL,
    sector,
    forces: { regular: count, elite: 0 },
  });

  forces.onBoard = onBoard;
  factionState.forces = forces;
  factions.set(faction, factionState);

  return { ...state, factions };
}

function makeStormContext(movement: number): StormPhaseContext {
  return {
    dialingFactions: null,
    dials: new Map(),
    stormMovement: movement,
    weatherControlUsed: false,
    weatherControlBy: null,
    familyAtomicsUsed: false,
    familyAtomicsBy: null,
    waitingForFamilyAtomics: false,
    waitingForWeatherControl: false,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testFamilyAtomicsPromptedWhenEligible(): void {
  section("3.01.07 - eligible faction is prompted to play Family Atomics");

  let state = buildBaseStormState();
  state = giveFamilyAtomicsToFaction(state, Faction.ATREIDES);
  state = placeForcesOnShieldWall(state, Faction.ATREIDES, 5, 7);

  const context = makeStormContext(3);

  const result = checkFamilyAtomics(state, context);

  assert(!result.phaseComplete, "phase not complete while waiting for response");
  assert(
    result.pendingRequests.length === 1,
    "exactly one request is created for Family Atomics"
  );
  const req = result.pendingRequests[0];
  assert(
    req.factionId === Faction.ATREIDES,
    "request is addressed to the faction holding Family Atomics"
  );
  assert(
    req.requestType === "PLAY_FAMILY_ATOMICS",
    "request type is PLAY_FAMILY_ATOMICS"
  );
}

function testFamilyAtomicsDestroysShieldWallForcesAndMarksWallDestroyed(): void {
  section(
    "3.01.07 - playing Family Atomics destroys all forces on Shield Wall and marks shieldWallDestroyed"
  );

  let state = buildBaseStormState();
  state = giveFamilyAtomicsToFaction(state, Faction.ATREIDES);
  state = placeForcesOnShieldWall(state, Faction.ATREIDES, 5, 7);

  const context = makeStormContext(4);
  context.waitingForFamilyAtomics = true;

  const responses: AgentResponse[] = [
    {
      factionId: Faction.ATREIDES,
      actionType: "PLAY_FAMILY_ATOMICS",
      data: {},
      passed: false,
    },
  ];

  const result = processFamilyAtomics(state, responses, context);

  const finalState = result.state;
  assert(
    finalState.shieldWallDestroyed === true,
    "shieldWallDestroyed flag is set to true"
  );
  assert(
    context.familyAtomicsUsed === true,
    "familyAtomicsUsed flag is set in context"
  );
  assert(
    context.familyAtomicsBy === Faction.ATREIDES,
    "familyAtomicsBy records the faction that played the card"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.07 FAMILY ATOMICS");
  console.log("=".repeat(80));

  try {
    testFamilyAtomicsPromptedWhenEligible();
  } catch (error) {
    console.error(
      "❌ testFamilyAtomicsPromptedWhenEligible failed:",
      error
    );
    failCount++;
  }

  try {
    testFamilyAtomicsDestroysShieldWallForcesAndMarksWallDestroyed();
  } catch (error) {
    console.error(
      "❌ testFamilyAtomicsDestroysShieldWallForcesAndMarksWallDestroyed failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.07 tests completed: ${passCount} passed, ${failCount} failed`
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


