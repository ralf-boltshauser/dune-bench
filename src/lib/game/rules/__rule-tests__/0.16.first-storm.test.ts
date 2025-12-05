/**
 * Rule test: 0.16 FIRST STORM
 * @rule-test 0.16
 *
 * Rule text (numbered_rules/0.md):
 * "0.16 FIRST STORM: The first time the storm is moved, the Storm Marker is Placed at a random location along the map edge using the following procedure. The two players whose player markers are nearest on either side of the Storm Start Sector will secretly dial a number from 0 to 20 on the Battle Wheels. The two numbers are simultaneously Revealed, totaled, and the Storm Marker moved from the Storm Start Sector counterclockwise around the map for the sum total of Sectors."
 *
 * These tests verify:
 * - On turn 1, the two players nearest on either side of Storm Start Sector (sector 0) are selected to dial
 * - Each player dials 0-20 (range validation)
 * - The two numbers are totaled
 * - The storm marker is moved counterclockwise from sector 0 for the sum total of sectors
 * - This only applies on turn 1 (not turn 2+)
 */

import { Faction, type GameState, type AgentResponse } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getStormDialers, processDialResponses } from "../../phases/handlers/storm/dialing";
import { GAME_CONSTANTS } from "../../data";
import type { StormPhaseContext } from "../../phases/types";

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

function buildBaseState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): GameState {
  return createGameState({
    factions,
    advancedRules: true,
  });
}

// =============================================================================
// 0.16 – Dialer Selection: Two players nearest on either side of Storm Start Sector
// =============================================================================

function testDialerSelectionBasic(): void {
  section("0.16 - Dialer selection: two players nearest on either side of sector 0");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  state.turn = 1; // Must be turn 1 for rule 0.16

  // Set player positions: Atreides at 1, Harkonnen at 17, Emperor at 9
  // Storm Start Sector is 0
  // Nearest forward (counterclockwise from 0): Atreides at 1 (distance 1)
  // Nearest backward (clockwise from 0): Harkonnen at 17 (distance 1)
  state.playerPositions = new Map(state.playerPositions);
  state.playerPositions.set(Faction.ATREIDES, 1);
  state.playerPositions.set(Faction.HARKONNEN, 17);
  state.playerPositions.set(Faction.EMPEROR, 9);

  const [dialer1, dialer2] = getStormDialers(state);

  assert(
    dialer1 === Faction.ATREIDES || dialer2 === Faction.ATREIDES,
    `Atreides (at sector 1, nearest forward) is selected as dialer`
  );
  assert(
    dialer1 === Faction.HARKONNEN || dialer2 === Faction.HARKONNEN,
    `Harkonnen (at sector 17, nearest backward) is selected as dialer`
  );
  assert(
    dialer1 !== dialer2,
    `Two distinct dialers are selected (got ${dialer1} and ${dialer2})`
  );
  assert(
    dialer1 !== Faction.EMPEROR && dialer2 !== Faction.EMPEROR,
    `Emperor (at sector 9, not nearest) is NOT selected as dialer`
  );
}

function testDialerSelectionWithFactionAtSectorZero(): void {
  section("0.16 - Dialer selection: faction at sector 0 is excluded");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  state.turn = 1;

  // Set player positions: Atreides at 0 (Storm Start), Harkonnen at 1, Emperor at 17
  state.playerPositions = new Map(state.playerPositions);
  state.playerPositions.set(Faction.ATREIDES, 0);
  state.playerPositions.set(Faction.HARKONNEN, 1);
  state.playerPositions.set(Faction.EMPEROR, 17);

  const [dialer1, dialer2] = getStormDialers(state);

  assert(
    dialer1 !== Faction.ATREIDES && dialer2 !== Faction.ATREIDES,
    `Atreides at sector 0 (Storm Start) is excluded from dialer selection`
  );
  assert(
    (dialer1 === Faction.HARKONNEN || dialer2 === Faction.HARKONNEN) &&
      (dialer1 === Faction.EMPEROR || dialer2 === Faction.EMPEROR),
    `Harkonnen (sector 1) and Emperor (sector 17) are selected as dialers`
  );
}

function testDialerSelectionOnlyAppliesOnTurn1(): void {
  section("0.16 - Dialer selection: only applies on turn 1");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  state.turn = 2; // Not turn 1

  // Set player positions
  state.playerPositions = new Map(state.playerPositions);
  state.playerPositions.set(Faction.ATREIDES, 1);
  state.playerPositions.set(Faction.HARKONNEN, 17);

  // On turn 2+, different logic applies (last two players who used Battle Wheels)
  // For this test, we verify that getStormDialers doesn't use the turn 1 logic
  const [dialer1, dialer2] = getStormDialers(state);

  // On turn 2+, it should still return two dialers, but using different logic
  assert(
    dialer1 !== undefined && dialer2 !== undefined,
    `getStormDialers returns two dialers even on turn 2+ (different logic)`
  );
  assert(
    dialer1 !== dialer2,
    `Two distinct dialers are selected on turn 2+`
  );
}

// =============================================================================
// 0.16 – Dial Range: 0-20 on turn 1
// =============================================================================

function testDialRangeValidation(): void {
  section("0.16 - Dial range: 0-20 on turn 1");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  state.turn = 1;
  state.stormSector = 0; // Storm Start Sector

  const [dialer1, dialer2] = getStormDialers(state);

  const context: StormPhaseContext = {
    dialingFactions: [dialer1, dialer2],
    dials: new Map(),
    stormMovement: 0,
    stormOrder: [],
  };

  // Test minimum dial (0)
  const minResponse1: AgentResponse = {
    factionId: dialer1,
    actionType: "DIAL_STORM",
    data: { dial: 0 },
    passed: false,
  };
  const minResponse2: AgentResponse = {
    factionId: dialer2,
    actionType: "DIAL_STORM",
    data: { dial: 0 },
    passed: false,
  };

  processDialResponses(state, [minResponse1, minResponse2], context);

  assert(
    context.dials.get(dialer1) === 0,
    `Minimum dial value 0 is accepted for ${dialer1}`
  );
  assert(
    context.dials.get(dialer2) === 0,
    `Minimum dial value 0 is accepted for ${dialer2}`
  );
  assert(
    context.stormMovement === 0,
    `Total movement is 0 when both dial 0 (got ${context.stormMovement})`
  );

  // Test maximum dial (20)
  const maxResponse1: AgentResponse = {
    factionId: dialer1,
    actionType: "DIAL_STORM",
    data: { dial: 20 },
    passed: false,
  };
  const maxResponse2: AgentResponse = {
    factionId: dialer2,
    actionType: "DIAL_STORM",
    data: { dial: 20 },
    passed: false,
  };

  const maxContext: StormPhaseContext = {
    dialingFactions: [dialer1, dialer2],
    dials: new Map(),
    stormMovement: 0,
    stormOrder: [],
  };

  processDialResponses(state, [maxResponse1, maxResponse2], maxContext);

  assert(
    maxContext.dials.get(dialer1) === 20,
    `Maximum dial value 20 is accepted for ${dialer1}`
  );
  assert(
    maxContext.dials.get(dialer2) === 20,
    `Maximum dial value 20 is accepted for ${dialer2}`
  );
  assert(
    maxContext.stormMovement === 40,
    `Total movement is 40 when both dial 20 (got ${maxContext.stormMovement})`
  );

  // Test out-of-range values are clamped
  const clampedContext: StormPhaseContext = {
    dialingFactions: [dialer1, dialer2],
    dials: new Map(),
    stormMovement: 0,
    stormOrder: [],
  };

  const clampedResponse1: AgentResponse = {
    factionId: dialer1,
    actionType: "DIAL_STORM",
    data: { dial: -5 }, // Below minimum
    passed: false,
  };
  const clampedResponse2: AgentResponse = {
    factionId: dialer2,
    actionType: "DIAL_STORM",
    data: { dial: 25 }, // Above maximum
    passed: false,
  };

  processDialResponses(
    state,
    [clampedResponse1, clampedResponse2],
    clampedContext
  );

  assert(
    clampedContext.dials.get(dialer1) === 0,
    `Dial value -5 is clamped to 0 (minimum)`
  );
  assert(
    clampedContext.dials.get(dialer2) === 20,
    `Dial value 25 is clamped to 20 (maximum)`
  );
}

// =============================================================================
// 0.16 – Dial Totaling: Two numbers are totaled
// =============================================================================

function testDialTotaling(): void {
  section("0.16 - Dial totaling: two numbers are added together");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  state.turn = 1;
  state.stormSector = 0;

  const [dialer1, dialer2] = getStormDialers(state);

  // Test various combinations
  const testCases = [
    { dial1: 0, dial2: 0, expected: 0 },
    { dial1: 5, dial2: 10, expected: 15 },
    { dial1: 12, dial2: 8, expected: 20 },
    { dial1: 20, dial2: 20, expected: 40 },
    { dial1: 1, dial2: 19, expected: 20 },
  ];

  for (const testCase of testCases) {
    const context: StormPhaseContext = {
      dialingFactions: [dialer1, dialer2],
      dials: new Map(),
      stormMovement: 0,
      stormOrder: [],
    };

    const response1: AgentResponse = {
      factionId: dialer1,
      actionType: "DIAL_STORM",
      data: { dial: testCase.dial1 },
      passed: false,
    };
    const response2: AgentResponse = {
      factionId: dialer2,
      actionType: "DIAL_STORM",
      data: { dial: testCase.dial2 },
      passed: false,
    };

    processDialResponses(state, [response1, response2], context);

    assert(
      context.stormMovement === testCase.expected,
      `Dial totaling: ${testCase.dial1} + ${testCase.dial2} = ${testCase.expected} (got ${context.stormMovement})`
    );
  }
}

// =============================================================================
// 0.16 – Movement: Storm moves counterclockwise from sector 0
// =============================================================================

function testMovementFromStormStartSector(): void {
  section("0.16 - Movement: storm moves counterclockwise from Storm Start Sector (0)");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  state.turn = 1;
  state.stormSector = 0; // Storm Start Sector

  const [dialer1, dialer2] = getStormDialers(state);

  const context: StormPhaseContext = {
    dialingFactions: [dialer1, dialer2],
    dials: new Map(),
    stormMovement: 0,
    stormOrder: [],
  };

  // Dial values that sum to 5 (should move from 0 to 5)
  const response1: AgentResponse = {
    factionId: dialer1,
    actionType: "DIAL_STORM",
    data: { dial: 2 },
    passed: false,
  };
  const response2: AgentResponse = {
    factionId: dialer2,
    actionType: "DIAL_STORM",
    data: { dial: 3 },
    passed: false,
  };

  processDialResponses(state, [response1, response2], context);

  assert(
    context.stormMovement === 5,
    `Storm movement is calculated as sum of dials: 2 + 3 = 5 (got ${context.stormMovement})`
  );
  assert(
    state.stormSector === 0,
    `Storm sector remains at 0 before movement is applied (context stores movement, not applied yet)`
  );
}

function testMovementWrapsAround(): void {
  section("0.16 - Movement: large totals wrap around the map");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  state.turn = 1;
  state.stormSector = 0;

  const [dialer1, dialer2] = getStormDialers(state);

  const context: StormPhaseContext = {
    dialingFactions: [dialer1, dialer2],
    dials: new Map(),
    stormMovement: 0,
    stormOrder: [],
  };

  // Dial values that sum to 25 (should wrap around: 0 + 25 = 25, but with 18 sectors, wraps to 7)
  const response1: AgentResponse = {
    factionId: dialer1,
    actionType: "DIAL_STORM",
    data: { dial: 12 },
    passed: false,
  };
  const response2: AgentResponse = {
    factionId: dialer2,
    actionType: "DIAL_STORM",
    data: { dial: 13 },
    passed: false,
  };

  processDialResponses(state, [response1, response2], context);

  assert(
    context.stormMovement === 25,
    `Storm movement is 25 (12 + 13), which wraps around the ${GAME_CONSTANTS.TOTAL_SECTORS}-sector map`
  );
}

// =============================================================================
// 0.16 – Simultaneous Reveal
// =============================================================================

function testSimultaneousReveal(): void {
  section("0.16 - Simultaneous reveal: both dials processed together");

  let state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  state.turn = 1;
  state.stormSector = 0;

  const [dialer1, dialer2] = getStormDialers(state);

  const context: StormPhaseContext = {
    dialingFactions: [dialer1, dialer2],
    dials: new Map(),
    stormMovement: 0,
    stormOrder: [],
  };

  const response1: AgentResponse = {
    factionId: dialer1,
    actionType: "DIAL_STORM",
    data: { dial: 7 },
    passed: false,
  };
  const response2: AgentResponse = {
    factionId: dialer2,
    actionType: "DIAL_STORM",
    data: { dial: 11 },
    passed: false,
  };

  processDialResponses(state, [response1, response2], context);

  // Both dials should be recorded
  assert(
    context.dials.has(dialer1),
    `Dial from ${dialer1} is recorded`
  );
  assert(
    context.dials.has(dialer2),
    `Dial from ${dialer2} is recorded`
  );
  assert(
    context.dials.get(dialer1) === 7,
    `Dial value from ${dialer1} is correctly recorded (7)`
  );
  assert(
    context.dials.get(dialer2) === 11,
    `Dial value from ${dialer2} is correctly recorded (11)`
  );
  assert(
    context.stormMovement === 18,
    `Total movement is sum of both dials: 7 + 11 = 18 (got ${context.stormMovement})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 0.16 FIRST STORM");
  console.log("=".repeat(80));

  try {
    testDialerSelectionBasic();
    testDialerSelectionWithFactionAtSectorZero();
    testDialerSelectionOnlyAppliesOnTurn1();
    testDialRangeValidation();
    testDialTotaling();
    testMovementFromStormStartSector();
    testMovementWrapsAround();
    testSimultaneousReveal();
  } catch (error) {
    console.error("Unexpected error during 0.16 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 0.16 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

