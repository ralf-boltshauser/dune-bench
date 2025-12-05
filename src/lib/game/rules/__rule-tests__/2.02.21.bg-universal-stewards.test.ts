/**
 * Rule test: 2.02.21 BENE GESSERIT UNIVERSAL STEWARDS
 * @rule-test 2.02.21
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.21 UNIVERSAL STEWARDS: When advisors are ever alone in a Territory before Battle Phase [1.07],
 * they automatically flip to fighters."
 *
 * This rule automatically flips BG advisors to fighters when they are alone in a territory.
 * Implemented in applyUniversalStewards() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.21.bg-universal-stewards.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState, getFactionsInTerritory } from "../../state";
import { formAlliance } from "../../state/mutations/alliances";
import { applyUniversalStewards } from "../../phases/handlers/battle/initialization/universal-stewards";
import { getBGFightersInSector, getBGAdvisorsInTerritory } from "../../state/queries";

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
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
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
// Tests for 2.02.21
// =============================================================================

function testUniversalStewards_autoFlipsWhenAlone(): void {
  section("2.02.21 - auto-flips advisors to fighters when alone in territory");

  let state = buildBaseState();
  // Ensure territory is not in storm (STORMED IN restriction would block flipping)
  state.stormSector = 10; // Storm away from Arrakeen (sector 9)

  // Add BG advisors to Arrakeen (no other forces)
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);

  const advisorsBefore = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN);
  assert(advisorsBefore === 3, `BG has 3 advisors before (actual: ${advisorsBefore})`);

  const occupants = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
  assert(occupants.length === 0, "territory is unoccupied (advisors don't count)");

  const events: any[] = [];
  const newState = applyUniversalStewards(state, events);

  const advisorsAfter = getBGAdvisorsInTerritory(newState, TerritoryId.ARRAKEEN);
  const fightersAfter = getBGFightersInSector(newState, TerritoryId.ARRAKEEN, 9);

  assert(advisorsAfter === 0, `BG has 0 advisors after (actual: ${advisorsAfter})`);
  assert(fightersAfter === 3, `BG has 3 fighters after (actual: ${fightersAfter})`);
  assert(events.length === 1, `one event emitted (got ${events.length})`);
  assert(events[0] && events[0].type === "ADVISORS_FLIPPED", `event type is ADVISORS_FLIPPED (got ${events[0]?.type})`);
  assert(
    events[0]?.data?.reason === "universal_stewards",
    `event reason is universal_stewards (got ${events[0]?.data?.reason})`
  );
}

function testUniversalStewards_doesNotFlipWhenOtherFactionsPresent(): void {
  section("2.02.21 - does not flip when other factions are present");

  let state = buildBaseState();
  // Add BG advisors to Arrakeen
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides forces (other faction)
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  const occupants = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
  assert(occupants.length === 1, "territory has 1 occupant (Atreides)");
  assert(occupants[0] === Faction.ATREIDES, "occupant is Atreides");

  const events: any[] = [];
  const newState = applyUniversalStewards(state, events);

  const advisorsAfter = getBGAdvisorsInTerritory(newState, TerritoryId.ARRAKEEN);
  assert(advisorsAfter === 3, `BG still has 3 advisors (not alone, actual: ${advisorsAfter})`);
  assert(events.length === 0, "no events emitted (not alone)");
}

function testUniversalStewards_doesNotFlipWhenBGFightersPresent(): void {
  section("2.02.21 - does not flip when BG fighters are present (not alone)");

  let state = buildBaseState();
  // Add BG advisors to Arrakeen
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add BG fighters to same territory
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const stack = bgState.forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 9
  );
  if (stack) {
    stack.forces.regular = (stack.forces.regular || 0) + 5;
    // Keep advisors at 3, fighters = 5
  }
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };

  const occupants = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
  assert(occupants.length === 1, "territory has 1 occupant (BG with fighters)");
  assert(occupants[0] === Faction.BENE_GESSERIT, "occupant is BG");

  const events: any[] = [];
  const newState = applyUniversalStewards(state, events);

  const advisorsAfter = getBGAdvisorsInTerritory(newState, TerritoryId.ARRAKEEN);
  assert(advisorsAfter === 3, `BG still has 3 advisors (fighters present, not alone, actual: ${advisorsAfter})`);
  assert(events.length === 0, "no events emitted (fighters present, not alone)");
}

function testUniversalStewards_respectsPEACETIMERestriction(): void {
  section("2.02.21 - respects PEACETIME restriction");

  let state = buildBaseState();
  // Form alliance
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  // Add BG advisors (alone)
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides (ally) forces to same territory
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  const events: any[] = [];
  const newState = applyUniversalStewards(state, events);

  const advisorsAfter = getBGAdvisorsInTerritory(newState, TerritoryId.ARRAKEEN);
  assert(advisorsAfter === 3, `BG still has 3 advisors (PEACETIME restriction, actual: ${advisorsAfter})`);
  assert(events.length === 0, "no events emitted (PEACETIME restriction)");
}

function testUniversalStewards_onlyInAdvancedRules(): void {
  section("2.02.21 - only applies in Advanced Rules");

  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: false, // Basic rules
  });
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);

  const events: any[] = [];
  const newState = applyUniversalStewards(state, events);

  const advisorsAfter = getBGAdvisorsInTerritory(newState, TerritoryId.ARRAKEEN);
  assert(advisorsAfter === 3, `BG still has 3 advisors (basic rules, actual: ${advisorsAfter})`);
  assert(events.length === 0, "no events emitted (basic rules)");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.21 BENE GESSERIT UNIVERSAL STEWARDS");
  console.log("=".repeat(80));

  try {
    testUniversalStewards_autoFlipsWhenAlone();
  } catch (error) {
    console.error("❌ testUniversalStewards_autoFlipsWhenAlone failed:", error);
    failCount++;
  }

  try {
    testUniversalStewards_doesNotFlipWhenOtherFactionsPresent();
  } catch (error) {
    console.error("❌ testUniversalStewards_doesNotFlipWhenOtherFactionsPresent failed:", error);
    failCount++;
  }

  try {
    testUniversalStewards_doesNotFlipWhenBGFightersPresent();
  } catch (error) {
    console.error("❌ testUniversalStewards_doesNotFlipWhenBGFightersPresent failed:", error);
    failCount++;
  }

  try {
    testUniversalStewards_respectsPEACETIMERestriction();
  } catch (error) {
    console.error("❌ testUniversalStewards_respectsPEACETIMERestriction failed:", error);
    failCount++;
  }

  try {
    testUniversalStewards_onlyInAdvancedRules();
  } catch (error) {
    console.error("❌ testUniversalStewards_onlyInAdvancedRules failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.21 tests completed: ${passCount} passed, ${failCount} failed`
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

