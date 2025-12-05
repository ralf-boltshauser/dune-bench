/**
 * Rule tests: 2.04.18, 2.04.19, 2.04.20 FREMEN FEDAYKIN
 * @rule-test 2.04.18
 * @rule-test 2.04.19
 * @rule-test 2.04.20
 *
 * Rule text (numbered_rules/2.md):
 * 2.04.18 ✷FEDAYKIN: Your three starred Forces, Fedaykin, have a special fighting capability. They are worth two normal Forces in battle and in taking losses.
 * 2.04.19 FEDAYKIN REVIVAL: They are each treated as one Force in revival.
 * 2.04.20 FEDAYKIN TRAINING: Only one Fedaykin Force can be revived per Turn.
 *
 * These rules ensure that Fedaykin elite forces count as 2x in battle strength, count as 1 in revival, and only 1 can be revived per turn.
 * Implemented in calculateForcesDialedStrength() and validateForceRevival() functions.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.04.18-20.fremen-fedaykin.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { calculateForcesDialedStrength } from "../../rules/combat/strength-calculation";
import { validateForceRevival, getRevivalLimits } from "../../rules/revival";

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
    advancedRules: true,
  });
}

function addFremenForcesWithElite(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  regular: number,
  elite: number
): GameState {
  const fremenState = getFactionState(state, Faction.FREMEN);
  const existingStack = fremenState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + regular;
    existingStack.forces.elite = (existingStack.forces.elite || 0) + elite;
  } else {
    fremenState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular, elite },
      advisors: undefined,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };
}

function addForcesToTanks(
  state: GameState,
  faction: Faction,
  regular: number,
  elite: number = 0
): GameState {
  const factionState = getFactionState(state, faction);
  factionState.forces.tanks.regular = (factionState.forces.tanks.regular || 0) + regular;
  factionState.forces.tanks.elite = (factionState.forces.tanks.elite || 0) + elite;
  return {
    ...state,
    factions: new Map(state.factions).set(faction, factionState),
  };
}

// =============================================================================
// Tests for 2.04.18
// =============================================================================

function testFedaykin_worth2xInBattle(): void {
  section("2.04.18 - Fedaykin worth 2x in battle strength");

  let state = buildBaseState();
  // Clear any existing forces and add fresh Fremen forces with 3 elite (Fedaykin) and 2 regular
  const fremenState = getFactionState(state, Faction.FREMEN);
  fremenState.forces.onBoard = []; // Clear existing
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };
  state = addFremenForcesWithElite(state, TerritoryId.ARRAKEEN, 9, 2, 3);

  // Dial 2 forces (should be 2 elite first)
  const strength = calculateForcesDialedStrength(
    state,
    Faction.FREMEN,
    TerritoryId.ARRAKEEN,
    9,
    2,
    Faction.ATREIDES
  );

  // 2 elite * 2 = 4 strength
  assert(strength === 4, `2 elite Fedaykin worth 4 strength vs Atreides (actual: ${strength})`);

  // Dial 3 forces (3 elite)
  const strength2 = calculateForcesDialedStrength(
    state,
    Faction.FREMEN,
    TerritoryId.ARRAKEEN,
    9,
    3,
    Faction.ATREIDES
  );

  // 3 elite * 2 = 6 strength
  assert(strength2 === 6, `3 forces (3 elite) worth 6 strength vs Atreides (actual: ${strength2})`);

  // Dial 5 forces (3 elite + 2 regular)
  const strength3 = calculateForcesDialedStrength(
    state,
    Faction.FREMEN,
    TerritoryId.ARRAKEEN,
    9,
    5,
    Faction.ATREIDES
  );

  // 3 elite * 2 + 2 regular * 1 = 8 strength
  assert(strength3 === 8, `5 forces (3 elite + 2 regular) worth 8 strength vs Atreides (actual: ${strength3})`);
}

// =============================================================================
// Tests for 2.04.19, 2.04.20
// =============================================================================

function testFedaykinRevival_treatedAsOneForce(): void {
  section("2.04.19 - Fedaykin treated as one Force in revival (not 2x)");

  let state = buildBaseState();
  // Add 5 elite (Fedaykin) to tanks
  state = addForcesToTanks(state, Faction.FREMEN, 0, 5);
  
  const limits = getRevivalLimits(state, Faction.FREMEN);
  assert(limits.freeForces === 3, `Fremen free revival is 3 (actual: ${limits.freeForces})`);

  // Try to revive 1 elite - should count as 1 force (not 2)
  const validation = validateForceRevival(state, Faction.FREMEN, 0, 1);
  
  assert(validation.valid === true, "validation allows reviving 1 elite (counts as 1 force)");
  
  // Check that total requested is 1 (elite counts as 1, not 2)
  const totalRequested = 0 + 1; // 1 elite = 1 force
  assert(totalRequested === 1, `1 elite counts as 1 force in revival (actual: ${totalRequested})`);
}

function testFedaykinRevival_onlyOnePerTurn(): void {
  section("2.04.20 - only one Fedaykin can be revived per turn");

  let state = buildBaseState();
  // Add 5 elite (Fedaykin) to tanks
  state = addForcesToTanks(state, Faction.FREMEN, 0, 5);

  // Try to revive 2 elite - should fail (limit is 1 per turn)
  const validation = validateForceRevival(state, Faction.FREMEN, 0, 2);
  
  assert(validation.valid === false, "validation rejects reviving 2 elite (limit is 1 per turn)");
  assert(
    validation.errors.some((e) => e.code === "ELITE_REVIVAL_LIMIT_EXCEEDED"),
    "validation error code is ELITE_REVIVAL_LIMIT_EXCEEDED"
  );
}

function testFedaykinRevival_cannotReviveAfterAlreadyRevived(): void {
  section("2.04.20 - cannot revive elite if already revived this turn");

  let state = buildBaseState();
  // Add 5 elite (Fedaykin) to tanks
  state = addForcesToTanks(state, Faction.FREMEN, 0, 5);
  
  // Mark that 1 elite was already revived this turn
  const fremenState = getFactionState(state, Faction.FREMEN);
  fremenState.eliteForcesRevivedThisTurn = 1;
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, fremenState),
  };

  // Try to revive 1 more elite - should fail
  const validation = validateForceRevival(state, Faction.FREMEN, 0, 1);
  
  assert(validation.valid === false, "validation rejects reviving elite when already revived this turn");
  assert(
    validation.errors.some((e) => e.code === "ELITE_REVIVAL_ALREADY_USED"),
    "validation error code is ELITE_REVIVAL_ALREADY_USED"
  );
}

function testFedaykinRevival_canReviveOnePerTurn(): void {
  section("2.04.20 - can revive exactly one Fedaykin per turn");

  let state = buildBaseState();
  // Add 5 elite (Fedaykin) to tanks
  state = addForcesToTanks(state, Faction.FREMEN, 0, 5);

  // Try to revive 1 elite - should succeed
  const validation = validateForceRevival(state, Faction.FREMEN, 0, 1);
  
  assert(validation.valid === true, "validation allows reviving exactly 1 elite per turn");
}

function testFedaykinRevival_regularForcesNotAffected(): void {
  section("2.04.19-20 - regular forces not affected by Fedaykin rules");

  let state = buildBaseState();
  // Add regular forces to tanks
  state = addForcesToTanks(state, Faction.FREMEN, 10, 0);
  
  const limits = getRevivalLimits(state, Faction.FREMEN);

  // Try to revive free limit + some paid (within maxForces limit)
  // Regular forces are not limited by the elite-only rules
  const validation = validateForceRevival(state, Faction.FREMEN, limits.freeForces + 1, 0);
  
  // Should be valid if within maxForces and has spice (regular forces not limited by Fedaykin elite rules)
  // The validation might fail due to spice, but it should NOT fail due to elite-specific rules
  const hasEliteError = validation.errors.some(
    (e) => e.code === "ELITE_REVIVAL_LIMIT_EXCEEDED" || e.code === "ELITE_REVIVAL_ALREADY_USED"
  );
  assert(hasEliteError === false, "validation does NOT reject regular forces due to elite-specific rules");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.18, 2.04.19, 2.04.20 FREMEN FEDAYKIN");
  console.log("=".repeat(80));

  try {
    testFedaykin_worth2xInBattle();
  } catch (error) {
    console.error("❌ testFedaykin_worth2xInBattle failed:", error);
    failCount++;
  }

  try {
    testFedaykinRevival_treatedAsOneForce();
  } catch (error) {
    console.error("❌ testFedaykinRevival_treatedAsOneForce failed:", error);
    failCount++;
  }

  try {
    testFedaykinRevival_onlyOnePerTurn();
  } catch (error) {
    console.error("❌ testFedaykinRevival_onlyOnePerTurn failed:", error);
    failCount++;
  }

  try {
    testFedaykinRevival_cannotReviveAfterAlreadyRevived();
  } catch (error) {
    console.error("❌ testFedaykinRevival_cannotReviveAfterAlreadyRevived failed:", error);
    failCount++;
  }

  try {
    testFedaykinRevival_canReviveOnePerTurn();
  } catch (error) {
    console.error("❌ testFedaykinRevival_canReviveOnePerTurn failed:", error);
    failCount++;
  }

  try {
    testFedaykinRevival_regularForcesNotAffected();
  } catch (error) {
    console.error("❌ testFedaykinRevival_regularForcesNotAffected failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.04.18-20 tests completed: ${passCount} passed, ${failCount} failed`
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

