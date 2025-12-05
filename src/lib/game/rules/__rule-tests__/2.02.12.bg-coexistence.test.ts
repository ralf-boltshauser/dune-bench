/**
 * Rule test: 2.02.12 BENE GESSERIT COEXISTENCE
 * @rule-test 2.02.12
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.12 COEXISTENCE: Advisors coexist peacefully with other faction Forces in the same Territory, including allies. Advisors have no effect on the play of the other factions whatsoever. Here is a list of things they CANNOT do: Advisors are still susceptible to storms, sandworms, lasgun/shield explosions, and Family Atomics."
 *
 * Key aspect: Advisors don't count toward occupancy limits (stronghold restrictions).
 * This is implemented in getFactionsOccupyingTerritory() which excludes BG if they only have advisors.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.12.bg-coexistence.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { getFactionsOccupyingTerritory } from "../../state/queries";

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
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

function addBGAdvisorsToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  advisorCount: number
): GameState {
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const existingStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    // Add forces and mark them all as advisors
    existingStack.forces.regular = (existingStack.forces.regular || 0) + advisorCount;
    existingStack.advisors = (existingStack.advisors || 0) + advisorCount;
  } else {
    bgState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: advisorCount, elite: 0 },
      advisors: advisorCount, // All forces are advisors
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };
}

function addBGFightersToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  fighterCount: number
): GameState {
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const existingStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    // Add forces but don't mark them as advisors (they're fighters)
    existingStack.forces.regular = (existingStack.forces.regular || 0) + fighterCount;
    // Keep advisors count unchanged (or set to 0 if undefined)
    if (existingStack.advisors === undefined) {
      existingStack.advisors = 0;
    }
  } else {
    bgState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: fighterCount, elite: 0 },
      advisors: 0, // No advisors, all are fighters
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };
}

function addOtherFactionForces(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState {
  const factionState = getFactionState(state, faction);
  const existingStack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + count;
  } else {
    factionState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: count, elite: 0 },
      advisors: undefined,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(faction, factionState),
  };
}

// =============================================================================
// Tests for 2.02.12
// =============================================================================

function testCoexistence_advisorsDontCountForOccupancy(): void {
  section("2.02.12 - advisors don't count toward occupancy limits (stronghold restrictions)");

  let state = buildBaseState();
  // Add BG advisors only to Arrakeen (stronghold)
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides forces
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);
  // Add Harkonnen forces
  state = addOtherFactionForces(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, 5);

  const occupants = getFactionsOccupyingTerritory(state, TerritoryId.ARRAKEEN);

  // BG should NOT be in occupants list (only advisors, no fighters)
  assert(
    !occupants.includes(Faction.BENE_GESSERIT),
    "BG with only advisors does NOT count toward occupancy limit"
  );
  assert(
    occupants.includes(Faction.ATREIDES),
    "Atreides with fighters counts toward occupancy limit"
  );
  assert(
    occupants.includes(Faction.HARKONNEN),
    "Harkonnen with fighters counts toward occupancy limit"
  );
  assert(
    occupants.length === 2,
    `exactly 2 factions count toward occupancy (actual: ${occupants.length})`
  );
}

function testCoexistence_fightersDoCountForOccupancy(): void {
  section("2.02.12 - BG fighters DO count toward occupancy limits");

  let state = buildBaseState();
  // Add BG fighters (not advisors) to Arrakeen
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides forces
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  const occupants = getFactionsOccupyingTerritory(state, TerritoryId.ARRAKEEN);

  // BG should be in occupants list (has fighters)
  assert(
    occupants.includes(Faction.BENE_GESSERIT),
    "BG with fighters DOES count toward occupancy limit"
  );
  assert(
    occupants.includes(Faction.ATREIDES),
    "Atreides with fighters counts toward occupancy limit"
  );
  assert(
    occupants.length === 2,
    `exactly 2 factions count toward occupancy (actual: ${occupants.length})`
  );
}

function testCoexistence_mixedAdvisorsAndFightersCounts(): void {
  section("2.02.12 - BG with both advisors and fighters counts (fighters present)");

  let state = buildBaseState();
  // Add BG with both advisors and fighters
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 2);
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides forces
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  const occupants = getFactionsOccupyingTerritory(state, TerritoryId.ARRAKEEN);

  // BG should be in occupants list (has fighters, even if also has advisors)
  assert(
    occupants.includes(Faction.BENE_GESSERIT),
    "BG with fighters (even if also has advisors) DOES count toward occupancy limit"
  );
  assert(
    occupants.includes(Faction.ATREIDES),
    "Atreides with fighters counts toward occupancy limit"
  );
  assert(
    occupants.length === 2,
    `exactly 2 factions count toward occupancy (actual: ${occupants.length})`
  );
}

function testCoexistence_appliesToAllStrongholds(): void {
  section("2.02.12 - coexistence applies to all strongholds, not just Arrakeen");

  let state = buildBaseState();
  // Test with Carthag (another stronghold)
  state = addBGAdvisorsToTerritory(state, TerritoryId.CARTHAG, 9, 3);
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.CARTHAG, 9, 5);
  state = addOtherFactionForces(state, Faction.HARKONNEN, TerritoryId.CARTHAG, 9, 5);

  const occupants = getFactionsOccupyingTerritory(state, TerritoryId.CARTHAG);

  assert(
    !occupants.includes(Faction.BENE_GESSERIT),
    "BG with only advisors does NOT count toward occupancy in Carthag"
  );
  assert(occupants.length === 2, `exactly 2 factions count (actual: ${occupants.length})`);
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.12 BENE GESSERIT COEXISTENCE");
  console.log("=".repeat(80));

  try {
    testCoexistence_advisorsDontCountForOccupancy();
  } catch (error) {
    console.error("❌ testCoexistence_advisorsDontCountForOccupancy failed:", error);
    failCount++;
  }

  try {
    testCoexistence_fightersDoCountForOccupancy();
  } catch (error) {
    console.error("❌ testCoexistence_fightersDoCountForOccupancy failed:", error);
    failCount++;
  }

  try {
    testCoexistence_mixedAdvisorsAndFightersCounts();
  } catch (error) {
    console.error("❌ testCoexistence_mixedAdvisorsAndFightersCounts failed:", error);
    failCount++;
  }

  try {
    testCoexistence_appliesToAllStrongholds();
  } catch (error) {
    console.error("❌ testCoexistence_appliesToAllStrongholds failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.12 tests completed: ${passCount} passed, ${failCount} failed`
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

