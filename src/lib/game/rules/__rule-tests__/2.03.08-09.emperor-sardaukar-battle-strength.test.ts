/**
 * Rule tests: 2.03.08, 2.03.09 EMPEROR SARDAUKAR BATTLE STRENGTH
 * @rule-test 2.03.08
 * @rule-test 2.03.09
 *
 * Rule text (numbered_rules/2.md):
 * 2.03.08 ✷SARDAUKAR: Your five starred Forces, elite Sardaukar, have a special fighting capability. They are worth two normal Forces in battle and in taking losses against all opponents except Fremen.
 * 2.03.09 SARDAUKAR WEAKNESS: Your starred Forces are worth just one Force against Fremen Forces.
 *
 * These rules ensure that Sardaukar elite forces count as 2x in battle strength, except when fighting Fremen (1x).
 * Implemented in calculateForcesDialedStrength() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.03.08-09.emperor-sardaukar-battle-strength.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { calculateForcesDialedStrength } from "../../rules/combat/strength-calculation";

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
    factions: [Faction.EMPEROR, Faction.ATREIDES, Faction.FREMEN],
    advancedRules: true,
  });
}

function addEmperorForcesWithElite(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  regular: number,
  elite: number
): GameState {
  const emperorState = getFactionState(state, Faction.EMPEROR);
  const existingStack = emperorState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + regular;
    existingStack.forces.elite = (existingStack.forces.elite || 0) + elite;
  } else {
    emperorState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular, elite },
      advisors: undefined,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.EMPEROR, emperorState),
  };
}

// =============================================================================
// Tests for 2.03.08, 2.03.09
// =============================================================================

function testSardaukar_worth2xAgainstNonFremen(): void {
  section("2.03.08 - Sardaukar worth 2x against non-Fremen opponents");

  let state = buildBaseState();
  // Clear any existing forces and add fresh Emperor forces with 3 elite (Sardaukar) and 2 regular
  const emperorState = getFactionState(state, Faction.EMPEROR);
  emperorState.forces.onBoard = []; // Clear existing
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.EMPEROR, emperorState),
  };
  state = addEmperorForcesWithElite(state, TerritoryId.ARRAKEEN, 9, 2, 3);

  // Dial 2 forces (should be 2 elite first, then regular)
  const strength = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    2,
    Faction.ATREIDES // Non-Fremen opponent
  );

  // 2 elite * 2 = 4 strength
  assert(strength === 4, `2 elite Sardaukar worth 4 strength vs Atreides (actual: ${strength})`);

  // Dial 3 forces (3 elite, since we have 3 elite available)
  const strength2 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    3,
    Faction.ATREIDES
  );

  // 3 elite * 2 = 6 strength (all elite dialed first)
  assert(strength2 === 6, `3 forces (3 elite) worth 6 strength vs Atreides (actual: ${strength2})`);

  // Dial 5 forces (3 elite + 2 regular)
  const strength3 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    5,
    Faction.ATREIDES
  );

  // 3 elite * 2 + 2 regular * 1 = 8 strength
  assert(strength3 === 8, `5 forces (3 elite + 2 regular) worth 8 strength vs Atreides (actual: ${strength3})`);
}

function testSardaukar_worth1xAgainstFremen(): void {
  section("2.03.09 - Sardaukar worth 1x against Fremen (weakness)");

  let state = buildBaseState();
  // Add Emperor forces with 3 elite (Sardaukar) and 2 regular
  state = addEmperorForcesWithElite(state, TerritoryId.ARRAKEEN, 9, 2, 3);

  // Dial 2 forces (should be 2 elite first)
  const strength = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    2,
    Faction.FREMEN // Fremen opponent
  );

  // 2 elite * 1 = 2 strength (weakness applies)
  assert(strength === 2, `2 elite Sardaukar worth 2 strength vs Fremen (weakness, actual: ${strength})`);

  // Dial 3 forces (2 elite + 1 regular)
  const strength2 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    3,
    Faction.FREMEN
  );

  // 2 elite * 1 + 1 regular * 1 = 3 strength
  assert(strength2 === 3, `3 forces (2 elite + 1 regular) worth 3 strength vs Fremen (actual: ${strength2})`);

  // Dial 5 forces (3 elite + 2 regular)
  const strength3 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    5,
    Faction.FREMEN
  );

  // 3 elite * 1 + 2 regular * 1 = 5 strength
  assert(strength3 === 5, `5 forces (3 elite + 2 regular) worth 5 strength vs Fremen (actual: ${strength3})`);
}

function testSardaukar_regularForcesAlways1x(): void {
  section("2.03.08 - regular forces always worth 1x (not affected by Sardaukar rules)");

  let state = buildBaseState();
  // Add Emperor forces with only regular forces (no elite)
  state = addEmperorForcesWithElite(state, TerritoryId.ARRAKEEN, 9, 5, 0);

  // Dial 3 regular forces
  const strength = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    3,
    Faction.ATREIDES
  );

  assert(strength === 3, `3 regular forces worth 3 strength (actual: ${strength})`);

  // Same against Fremen
  const strength2 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    3,
    Faction.FREMEN
  );

  assert(strength2 === 3, `3 regular forces worth 3 strength vs Fremen (actual: ${strength2})`);
}

function testSardaukar_eliteDialedFirst(): void {
  section("2.03.08 - elite forces are dialed first (assumed behavior)");

  let state = buildBaseState();
  // Add Emperor forces with 2 elite and 5 regular
  state = addEmperorForcesWithElite(state, TerritoryId.ARRAKEEN, 9, 5, 2);

  // Dial 1 force - should be 1 elite
  const strength1 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    1,
    Faction.ATREIDES
  );

  assert(strength1 === 2, `1 force dialed = 1 elite = 2 strength (actual: ${strength1})`);

  // Dial 2 forces - should be 2 elite
  const strength2 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    2,
    Faction.ATREIDES
  );

  assert(strength2 === 4, `2 forces dialed = 2 elite = 4 strength (actual: ${strength2})`);

  // Dial 3 forces - should be 2 elite + 1 regular
  const strength3 = calculateForcesDialedStrength(
    state,
    Faction.EMPEROR,
    TerritoryId.ARRAKEEN,
    9,
    3,
    Faction.ATREIDES
  );

  assert(strength3 === 5, `3 forces dialed = 2 elite + 1 regular = 5 strength (actual: ${strength3})`);
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.03.08, 2.03.09 EMPEROR SARDAUKAR BATTLE STRENGTH");
  console.log("=".repeat(80));

  try {
    testSardaukar_worth2xAgainstNonFremen();
  } catch (error) {
    console.error("❌ testSardaukar_worth2xAgainstNonFremen failed:", error);
    failCount++;
  }

  try {
    testSardaukar_worth1xAgainstFremen();
  } catch (error) {
    console.error("❌ testSardaukar_worth1xAgainstFremen failed:", error);
    failCount++;
  }

  try {
    testSardaukar_regularForcesAlways1x();
  } catch (error) {
    console.error("❌ testSardaukar_regularForcesAlways1x failed:", error);
    failCount++;
  }

  try {
    testSardaukar_eliteDialedFirst();
  } catch (error) {
    console.error("❌ testSardaukar_eliteDialedFirst failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.03.08-09 tests completed: ${passCount} passed, ${failCount} failed`
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

