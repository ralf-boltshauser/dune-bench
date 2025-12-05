/**
 * Rule tests: 2.02.01, 2.02.02, 2.02.04 (Bene Gesserit starting resources & free revival)
 *
 * @rule-test 2.02.01
 * @rule-test 2.02.02
 * @rule-test 2.02.04
 *
 * Rule text (numbered_rules/2.md):
 * 2.02.01 Starting Spice [0.12]: Put 5 spice behind your shield from the bank.
 * 2.02.02 Starting Forces [0.13]: Place 1 Force in Polar Sink and 19 forces in reserves (off-planet).
 * 2.02.04 FREE REVIVAL: 1 Force.
 *
 * These tests verify that:
 * - Bene Gesserit starts with exactly 5 spice.
 * - Bene Gesserit starting forces are 1 in Polar Sink (as advisors) and 19 in reserves.
 * - Bene Gesserit free revival limit is 1 force per turn, independent of advanced/basic rules.
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getRevivalLimits } from "../../rules";

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

function buildBaseState(advancedRules: boolean): GameState {
  // Use BG and Atreides as two standard factions
  return createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules,
  });
}

// =============================================================================
// Tests for 2.02.01 & 2.02.02 – Starting spice & forces
// =============================================================================

function testBeneGesseritStartingResources_basicRules(): void {
  section("2.02.01/02 - Bene Gesserit starting spice and forces (basic rules)");

  const state = buildBaseState(false);
  const bg = getFactionState(state, Faction.BENE_GESSERIT);
  const atreides = getFactionState(state, Faction.ATREIDES);

  assert(!!bg, "Bene Gesserit faction state exists");
  assert(!!atreides, "Atreides faction state exists");

  // 2.02.01 – Starting spice = 5
  assert(
    bg.spice === 5,
    `Bene Gesserit starts with 5 spice (actual: ${bg.spice})`
  );

  // 2.02.02 – Starting forces: 1 in Polar Sink, 19 in reserves
  const forces = bg.forces;

  const polarStack = forces.onBoard.find(
    (stack) => stack.territoryId === TerritoryId.POLAR_SINK
  );

  assert(
    !!polarStack,
    "Bene Gesserit has a force stack in Polar Sink at game start"
  );

  const polarRegular = polarStack?.forces.regular ?? 0;
  const polarElite = polarStack?.forces.elite ?? 0;

  assert(
    polarRegular === 1 && polarElite === 0,
    `Polar Sink stack has 1 regular force and 0 elite (actual: regular=${polarRegular}, elite=${polarElite})`
  );

  // BG-specific: starting on-board forces should all be advisors
  const polarAdvisors = (polarStack as any).advisors ?? 0;
  assert(
    polarAdvisors === 1,
    `Polar Sink stack has 1 advisor (BG forces start as advisors), actual: ${polarAdvisors}`
  );

  const reservesRegular = forces.reserves.regular;
  const reservesElite = forces.reserves.elite;

  assert(
    reservesRegular === 19 && reservesElite === 0,
    `Bene Gesserit has 19 regular forces and 0 elite forces in reserves (actual: regular=${reservesRegular}, elite=${reservesElite})`
  );
}

function testBeneGesseritStartingResources_advancedRules(): void {
  section("2.02.01/02 - Bene Gesserit starting spice and forces (advanced rules)");

  const state = buildBaseState(true);
  const bg = getFactionState(state, Faction.BENE_GESSERIT);

  assert(!!bg, "Bene Gesserit faction state exists");

  assert(
    bg.spice === 5,
    `Bene Gesserit starting spice remains 5 with advanced rules (actual: ${bg.spice})`
  );

  const forces = bg.forces;
  const polarStack = forces.onBoard.find(
    (stack) => stack.territoryId === TerritoryId.POLAR_SINK
  );

  assert(
    !!polarStack,
    "Bene Gesserit still has a force stack in Polar Sink with advanced rules"
  );

  const polarRegular = polarStack?.forces.regular ?? 0;
  const polarElite = polarStack?.forces.elite ?? 0;
  const polarAdvisors = (polarStack as any).advisors ?? 0;

  assert(
    polarRegular === 1 && polarElite === 0 && polarAdvisors === 1,
    `Polar Sink stack remains 1 regular advisor (regular=1, elite=0, advisors=1; actual: regular=${polarRegular}, elite=${polarElite}, advisors=${polarAdvisors})`
  );

  const reservesRegular = forces.reserves.regular;
  const reservesElite = forces.reserves.elite;

  assert(
    reservesRegular === 19 && reservesElite === 0,
    `Bene Gesserit still has 19 regular forces and 0 elite forces in reserves with advanced rules (actual: regular=${reservesRegular}, elite=${reservesElite})`
  );
}

// =============================================================================
// Tests for 2.02.04 – FREE REVIVAL
// =============================================================================

function testBeneGesseritFreeRevival_basicAndAdvanced(): void {
  section("2.02.04 - Bene Gesserit free revival is 1 force");

  const basicState = buildBaseState(false);
  const advancedState = buildBaseState(true);

  const basicLimits = getRevivalLimits(basicState, Faction.BENE_GESSERIT);
  const advancedLimits = getRevivalLimits(advancedState, Faction.BENE_GESSERIT);

  assert(
    basicLimits.freeForces === 1,
    `Bene Gesserit free revival is 1 force in basic rules (actual: ${basicLimits.freeForces})`
  );
  assert(
    advancedLimits.freeForces === 1,
    `Bene Gesserit free revival remains 1 force with advanced rules (actual: ${advancedLimits.freeForces})`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log(
    "RULE TESTS: 2.02.01, 2.02.02, 2.02.04 BENE GESSERIT STARTING RESOURCES & FREE REVIVAL"
  );
  console.log("=".repeat(80));

  try {
    testBeneGesseritStartingResources_basicRules();
  } catch (error) {
    console.error(
      "❌ testBeneGesseritStartingResources_basicRules failed:",
      error
    );
    failCount++;
  }

  try {
    testBeneGesseritStartingResources_advancedRules();
  } catch (error) {
    console.error(
      "❌ testBeneGesseritStartingResources_advancedRules failed:",
      error
    );
    failCount++;
  }

  try {
    testBeneGesseritFreeRevival_basicAndAdvanced();
  } catch (error) {
    console.error(
      "❌ testBeneGesseritFreeRevival_basicAndAdvanced failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.01/02/04 tests completed: ${passCount} passed, ${failCount} failed`
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


