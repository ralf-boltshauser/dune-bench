/**
 * Rule test: 2.02.18, 2.02.19 BENE GESSERIT PEACETIME & STORMED IN
 * @rule-test 2.02.18
 * @rule-test 2.02.19
 *
 * Rule text (numbered_rules/2.md):
 * 2.02.18 PEACETIME: Advisors can not flip to fighters with an ally present.
 * 2.02.19 STORMED IN: Advisors can not flip to fighters under storm.
 *
 * These restrictions apply to all advisor-to-fighter flip abilities:
 * - ENLISTMENT (2.02.14)
 * - TAKE UP ARMS (2.02.16)
 * - WARTIME (2.02.17)
 * - UNIVERSAL STEWARDS (2.02.21)
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.18-19.bg-peacetime-and-stormed-in.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { formAlliance } from "../../state/mutations/alliances";
import {
  isPEACETIMERestrictionActive,
  isSTORMEDINRestrictionActive,
  validateAdvisorFlipToFighters,
} from "../../rules/bg-advisor-validation";

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
    existingStack.forces.regular = (existingStack.forces.regular || 0) + advisorCount;
    existingStack.advisors = (existingStack.advisors || 0) + advisorCount;
  } else {
    bgState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: advisorCount, elite: 0 },
      advisors: advisorCount,
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
// Tests for 2.02.18 PEACETIME
// =============================================================================

function testPEACETIME_blocksFlipWhenAllyPresent(): void {
  section("2.02.18 - PEACETIME blocks flip when ally has forces in territory");

  let state = buildBaseState();
  // Form alliance between BG and Atreides
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  // Add BG advisors to Arrakeen
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides (ally) forces to Arrakeen
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  const isBlocked = isPEACETIMERestrictionActive(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN);
  assert(isBlocked === true, "PEACETIME restriction is active when ally has forces in territory");

  const validation = validateAdvisorFlipToFighters(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9
  );
  assert(validation.canFlip === false, "validation blocks flip when PEACETIME restriction is active");
  assert(
    validation.restriction === "PEACETIME",
    `validation restriction is PEACETIME (actual: ${validation.restriction})`
  );
  assert(
    validation.reason?.includes("PEACETIME") || validation.reason?.includes("ally"),
    `validation reason mentions PEACETIME or ally (actual: ${validation.reason})`
  );
}

function testPEACETIME_noBlockWhenNoAlly(): void {
  section("2.02.18 - PEACETIME does not block when no ally");

  let state = buildBaseState();
  // No alliance formed
  // Add BG advisors to Arrakeen
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Harkonnen (non-ally) forces to Arrakeen
  state = addOtherFactionForces(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, 5);

  const isBlocked = isPEACETIMERestrictionActive(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN);
  assert(isBlocked === false, "PEACETIME restriction is NOT active when no ally");

  const validation = validateAdvisorFlipToFighters(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9
  );
  // Should not be blocked by PEACETIME (might be blocked by STORMED IN if in storm, but not PEACETIME)
  // Let's check that PEACETIME is not the reason
  if (!validation.canFlip) {
    assert(
      validation.restriction !== "PEACETIME",
      "if blocked, it's not due to PEACETIME (no ally present)"
    );
  }
}

function testPEACETIME_noBlockWhenAllyNotInTerritory(): void {
  section("2.02.18 - PEACETIME does not block when ally is not in the territory");

  let state = buildBaseState();
  // Form alliance between BG and Atreides
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  // Add BG advisors to Arrakeen
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  
  // Remove any Atreides forces from Arrakeen (they might start there)
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  atreidesState.forces.onBoard = atreidesState.forces.onBoard.filter(
    (s) => !(s.territoryId === TerritoryId.ARRAKEEN)
  );
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, atreidesState),
  };
  
  // Add Atreides (ally) forces to DIFFERENT territory (Carthag)
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.CARTHAG, 9, 5);

  const isBlocked = isPEACETIMERestrictionActive(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN);
  assert(
    isBlocked === false,
    "PEACETIME restriction is NOT active when ally is in different territory"
  );
}

// =============================================================================
// Tests for 2.02.19 STORMED IN
// =============================================================================

function testSTORMEDIN_blocksFlipWhenInStorm(): void {
  section("2.02.19 - STORMED IN blocks flip when advisors are in storm sector");

  let state = buildBaseState();
  // Add BG advisors to Arrakeen sector 9
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Set storm to cover Arrakeen sector 9
  state = { ...state, stormSector: 9 };

  const isBlocked = isSTORMEDINRestrictionActive(state, 9);
  assert(isBlocked === true, "STORMED IN restriction is active when sector is in storm");

  const validation = validateAdvisorFlipToFighters(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9
  );
  assert(validation.canFlip === false, "validation blocks flip when STORMED IN restriction is active");
  assert(
    validation.restriction === "STORMED_IN",
    `validation restriction is STORMED_IN (actual: ${validation.restriction})`
  );
  assert(
    validation.reason?.includes("STORMED IN") || validation.reason?.includes("storm"),
    `validation reason mentions STORMED IN or storm (actual: ${validation.reason})`
  );
}

function testSTORMEDIN_noBlockWhenNotInStorm(): void {
  section("2.02.19 - STORMED IN does not block when advisors are not in storm");

  let state = buildBaseState();
  // Add BG advisors to Arrakeen sector 9
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Set storm to different sector (sector 1)
  state = { ...state, stormSector: 1 };

  const isBlocked = isSTORMEDINRestrictionActive(state, 9);
  assert(isBlocked === false, "STORMED IN restriction is NOT active when sector is not in storm");

  const validation = validateAdvisorFlipToFighters(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9
  );
  // Should not be blocked by STORMED IN (might be blocked by PEACETIME if ally present, but not STORMED IN)
  // Let's check that STORMED IN is not the reason
  if (!validation.canFlip) {
    assert(
      validation.restriction !== "STORMED_IN",
      "if blocked, it's not due to STORMED IN (not in storm)"
    );
  }
}

function testBothRestrictions_blockWhenBothPresent(): void {
  section("2.02.18-19 - both restrictions block when ally present AND in storm");

  let state = buildBaseState();
  // Form alliance between BG and Atreides
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  // Add BG advisors to Arrakeen sector 9
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides (ally) forces to Arrakeen
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);
  // Set storm to cover Arrakeen sector 9
  state = { ...state, stormSector: 9 };

  const peacetime = isPEACETIMERestrictionActive(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN);
  const stormedIn = isSTORMEDINRestrictionActive(state, 9);

  assert(peacetime === true, "PEACETIME restriction is active");
  assert(stormedIn === true, "STORMED IN restriction is active");

  const validation = validateAdvisorFlipToFighters(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9
  );
  assert(validation.canFlip === false, "validation blocks flip when both restrictions are active");
  assert(
    validation.restriction === "BOTH",
    `validation restriction is BOTH (actual: ${validation.restriction})`
  );
  assert(
    validation.reason?.includes("PEACETIME") && validation.reason?.includes("STORMED IN"),
    `validation reason mentions both restrictions (actual: ${validation.reason})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.18, 2.02.19 BENE GESSERIT PEACETIME & STORMED IN");
  console.log("=".repeat(80));

  try {
    testPEACETIME_blocksFlipWhenAllyPresent();
  } catch (error) {
    console.error("❌ testPEACETIME_blocksFlipWhenAllyPresent failed:", error);
    failCount++;
  }

  try {
    testPEACETIME_noBlockWhenNoAlly();
  } catch (error) {
    console.error("❌ testPEACETIME_noBlockWhenNoAlly failed:", error);
    failCount++;
  }

  try {
    testPEACETIME_noBlockWhenAllyNotInTerritory();
  } catch (error) {
    console.error("❌ testPEACETIME_noBlockWhenAllyNotInTerritory failed:", error);
    failCount++;
  }

  try {
    testSTORMEDIN_blocksFlipWhenInStorm();
  } catch (error) {
    console.error("❌ testSTORMEDIN_blocksFlipWhenInStorm failed:", error);
    failCount++;
  }

  try {
    testSTORMEDIN_noBlockWhenNotInStorm();
  } catch (error) {
    console.error("❌ testSTORMEDIN_noBlockWhenNotInStorm failed:", error);
    failCount++;
  }

  try {
    testBothRestrictions_blockWhenBothPresent();
  } catch (error) {
    console.error("❌ testBothRestrictions_blockWhenBothPresent failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.18–2.02.19 tests completed: ${passCount} passed, ${failCount} failed`
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

