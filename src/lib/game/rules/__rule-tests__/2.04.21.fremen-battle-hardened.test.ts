/**
 * Rule test: 2.04.21 FREMEN BATTLE HARDENED
 * @rule-test 2.04.21
 *
 * Rule text (numbered_rules/2.md):
 * "2.04.21 ✷BATTLE HARDENED: Your Forces do not require spice to count at full strength in battles."
 *
 * This rule ensures that Fremen forces always count at full strength in battle, even without paying spice.
 * Implemented in calculateSpicedForcesStrength() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.04.21.fremen-battle-hardened.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { calculateForcesDialedStrength, calculateSpicedForceStrength } from "../../rules/combat/strength-calculation";

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
    factions: [Faction.FREMEN, Faction.ATREIDES],
    advancedRules: true, // Required for spice dialing
  });
}

function addFremenForces(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  regular: number
): GameState {
  const fremenState = getFactionState(state, Faction.FREMEN);
  const existingStack = fremenState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + regular;
  } else {
    fremenState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular, elite: 0 },
      advisors: undefined,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };
}

// =============================================================================
// Tests for 2.04.21
// =============================================================================

function testBattleHardened_fullStrengthWithoutSpice(): void {
  section("2.04.21 - Fremen forces count at full strength without spice");

  let state = buildBaseState();
  // Clear any existing forces
  const fremenState = getFactionState(state, Faction.FREMEN);
  fremenState.forces.onBoard = [];
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };
  
  // Add 5 Fremen forces
  state = addFremenForces(state, TerritoryId.ARRAKEEN, 9, 5);

  // First calculate base force strength (without spice)
  const baseStrength = calculateForcesDialedStrength(
    state,
    Faction.FREMEN,
    TerritoryId.ARRAKEEN,
    9,
    5, // 5 forces dialed
    Faction.ATREIDES
  );

  // Then calculate spiced strength with 0 spice dialed (should still be full strength)
  const strength = calculateSpicedForceStrength(
    Faction.FREMEN,
    baseStrength,
    5, // 5 forces dialed
    0, // 0 spice dialed
    true // advanced rules
  );

  // Should be 5 (full strength, no reduction for lack of spice)
  assert(strength === 5, `5 Fremen forces worth 5 strength with 0 spice (full strength, actual: ${strength})`);
}

function testBattleHardened_fullStrengthWithSpice(): void {
  section("2.04.21 - Fremen forces still count at full strength with spice (no change)");

  let state = buildBaseState();
  // Clear any existing forces
  const fremenState = getFactionState(state, Faction.FREMEN);
  fremenState.forces.onBoard = [];
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };
  
  // Add 5 Fremen forces
  state = addFremenForces(state, TerritoryId.ARRAKEEN, 9, 5);

  // First calculate base force strength
  const baseStrength = calculateForcesDialedStrength(
    state,
    Faction.FREMEN,
    TerritoryId.ARRAKEEN,
    9,
    5, // 5 forces dialed
    Faction.ATREIDES
  );

  // Then calculate spiced strength with 5 spice dialed (should still be full strength)
  const strength = calculateSpicedForceStrength(
    Faction.FREMEN,
    baseStrength,
    5, // 5 forces dialed
    5, // 5 spice dialed
    true // advanced rules
  );

  // Should be 5 (full strength, same as without spice)
  assert(strength === 5, `5 Fremen forces worth 5 strength with 5 spice (full strength, actual: ${strength})`);
}

function testBattleHardened_otherFactionsNeedSpice(): void {
  section("2.04.21 - other factions need spice for full strength (comparison)");

  let state = buildBaseState();
  // Add 5 Atreides forces
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  atreidesState.forces.onBoard.push({
    territoryId: TerritoryId.ARRAKEEN,
    sector: 9,
    forces: { regular: 5, elite: 0 },
    advisors: undefined,
  });
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, atreidesState),
  };

  // First calculate base force strength for Atreides
  const baseStrengthAtreides = calculateForcesDialedStrength(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9,
    5, // 5 forces dialed
    Faction.FREMEN
  );

  // Calculate strength with 0 spice dialed (should be half strength)
  const strengthNoSpice = calculateSpicedForceStrength(
    Faction.ATREIDES,
    baseStrengthAtreides,
    5, // 5 forces dialed
    0, // 0 spice dialed
    true // advanced rules
  );

  // Should be 2.5 (half strength) - but might be rounded or handled differently
  assert(strengthNoSpice < 5, `5 Atreides forces worth less than 5 with 0 spice (actual: ${strengthNoSpice})`);

  // Calculate strength with 5 spice dialed (should be full strength)
  const strengthWithSpice = calculateSpicedForceStrength(
    Faction.ATREIDES,
    baseStrengthAtreides,
    5, // 5 forces dialed
    5, // 5 spice dialed
    true // advanced rules
  );

  // Should be 5 (full strength with spice)
  assert(strengthWithSpice === 5, `5 Atreides forces worth 5 strength with 5 spice (actual: ${strengthWithSpice})`);
}

function testBattleHardened_onlyInAdvancedRules(): void {
  section("2.04.21 - only applies in Advanced Rules (spice dialing)");

  let state = createGameState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    advancedRules: false, // Basic rules
  });
  
  // Clear any existing forces
  const fremenState = getFactionState(state, Faction.FREMEN);
  fremenState.forces.onBoard = [];
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };
  
  // Add 5 Fremen forces
  state = addFremenForces(state, TerritoryId.ARRAKEEN, 9, 5);

  // First calculate base force strength
  const baseStrength = calculateForcesDialedStrength(
    state,
    Faction.FREMEN,
    TerritoryId.ARRAKEEN,
    9,
    5, // 5 forces dialed
    Faction.ATREIDES
  );

  // In basic rules, spice dialing doesn't apply, so strength is always full
  const strength = calculateSpicedForceStrength(
    Faction.FREMEN,
    baseStrength,
    5, // 5 forces dialed
    0, // 0 spice dialed
    false // basic rules
  );

  // Should be 5 (basic rules don't use spice dialing)
  assert(strength === 5, `5 Fremen forces worth 5 strength in basic rules (spice dialing doesn't apply, actual: ${strength})`);
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.21 FREMEN BATTLE HARDENED");
  console.log("=".repeat(80));

  try {
    testBattleHardened_fullStrengthWithoutSpice();
  } catch (error) {
    console.error("❌ testBattleHardened_fullStrengthWithoutSpice failed:", error);
    failCount++;
  }

  try {
    testBattleHardened_fullStrengthWithSpice();
  } catch (error) {
    console.error("❌ testBattleHardened_fullStrengthWithSpice failed:", error);
    failCount++;
  }

  try {
    testBattleHardened_otherFactionsNeedSpice();
  } catch (error) {
    console.error("❌ testBattleHardened_otherFactionsNeedSpice failed:", error);
    failCount++;
  }

  try {
    testBattleHardened_onlyInAdvancedRules();
  } catch (error) {
    console.error("❌ testBattleHardened_onlyInAdvancedRules failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.04.21 tests completed: ${passCount} passed, ${failCount} failed`
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

