/**
 * Rule test: 3.01.23 WEATHER CONTROL
 *
 * Rule text (numbered_rules/3.md):
 * "3.01.23 WEATHER CONTROL: Special-Storm - After the first game Turn, play during 1.01.02 before the Storm
 *  Marker is moved. You control the storm this Phase and move it 1 through 10 Sectors in a Counterclockwise
 *  direction OR decide the Storm Marker does not move this Turn. Discard after use."
 *
 * This rule is enforced by Weather Control storm handlers:
 * - checkWeatherControl: asks eligible factions after storm movement is calculated, but before movement
 * - processWeatherControl: allows chosen faction to override stormMovement (0-10) and discards the card
 *
 * @rule-test 3.01.23
 */

import {
  Faction,
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
  checkWeatherControl,
  processWeatherControl,
} from "../../phases/handlers/storm/weather-control";

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

  // Start on turn 2 so Weather Control is allowed
  return { ...state, turn: 2 };
}

function giveWeatherControlToFaction(
  state: GameState,
  faction: Faction
): GameState {
  const def = getTreacheryCardDefinition("weather_control");
  if (!def) throw new Error("Missing weather_control definition for tests");

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

function makeStormContext(movement: number | null): StormPhaseContext {
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

function testWeatherControlPromptedWhenEligible(): void {
  section("3.01.23 - eligible faction is prompted to play Weather Control");

  let state = buildBaseStormState();
  state = giveWeatherControlToFaction(state, Faction.HARKONNEN);

  const context = makeStormContext(6);

  const result = checkWeatherControl(state, context);

  assert(!result.phaseComplete, "phase not complete while waiting for response");
  assert(
    result.pendingRequests.length === 1,
    "exactly one request is created for Weather Control"
  );
  const req = result.pendingRequests[0];
  assert(
    req.factionId === Faction.HARKONNEN,
    "request is addressed to faction holding Weather Control"
  );
  assert(
    req.requestType === "PLAY_WEATHER_CONTROL",
    "request type is PLAY_WEATHER_CONTROL"
  );
}

function testWeatherControlOverridesStormMovementAndDiscardsCard(): void {
  section(
    "3.01.23 - playing Weather Control overrides storm movement and discards card"
  );

  let state = buildBaseStormState();
  state = giveWeatherControlToFaction(state, Faction.HARKONNEN);

  const context = makeStormContext(7);
  context.waitingForWeatherControl = true;

  const responses: AgentResponse[] = [
    {
      factionId: Faction.HARKONNEN,
      actionType: "PLAY_WEATHER_CONTROL",
      data: { movement: 0 }, // choose to stop the storm
      passed: false,
    },
  ];

  const result = processWeatherControl(state, responses, context);

  // processWeatherControl always applies movement afterwards; we only assert that
  // the context and card-handling behavior match the rule
  assert(
    context.weatherControlUsed === true,
    "weatherControlUsed flag is set so it is not asked again"
  );
  assert(
    context.weatherControlBy === Faction.HARKONNEN,
    "weatherControlBy records the faction that played the card"
  );
  assert(
    context.stormMovement === 0,
    "stormMovement is overridden to 0 (no movement) by Weather Control"
  );

  const finalState = result.state;
  const harkonnenState = getFactionState(finalState, Faction.HARKONNEN);
  const stillHasCard = harkonnenState.hand.some(
    (c) => c.definitionId === "weather_control"
  );
  assert(!stillHasCard, "Weather Control card is discarded from hand");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.23 WEATHER CONTROL");
  console.log("=".repeat(80));

  try {
    testWeatherControlPromptedWhenEligible();
  } catch (error) {
    console.error(
      "❌ testWeatherControlPromptedWhenEligible failed:",
      error
    );
    failCount++;
  }

  try {
    testWeatherControlOverridesStormMovementAndDiscardsCard();
  } catch (error) {
    console.error(
      "❌ testWeatherControlOverridesStormMovementAndDiscardsCard failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.23 tests completed: ${passCount} passed, ${failCount} failed`
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


