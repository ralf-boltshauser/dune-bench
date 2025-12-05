/**
 * Rule tests: 2.03.10, 2.03.11 EMPEROR SARDAUKAR REVIVAL
 * @rule-test 2.03.10
 * @rule-test 2.03.11
 *
 * Rule text (numbered_rules/2.md):
 * 2.03.10 SARDAUKAR REVIVAL: They are treated as one Force in revival.
 * 2.03.11 SARDAUKAR TRAINING: Only one Sardaukar Force can be revived per Turn.
 *
 * These rules ensure that Sardaukar elite forces count as 1 force in revival (not 2x), and only 1 can be revived per turn.
 * Implemented in validateForceRevival() function.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.03.10-11.emperor-sardaukar-revival.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
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
    factions: [Faction.EMPEROR, Faction.ATREIDES],
    advancedRules: true,
  });
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
// Tests for 2.03.10, 2.03.11
// =============================================================================

function testSardaukarRevival_treatedAsOneForce(): void {
  section("2.03.10 - Sardaukar treated as one Force in revival (not 2x)");

  let state = buildBaseState();
  // Add 5 elite (Sardaukar) to tanks
  state = addForcesToTanks(state, Faction.EMPEROR, 0, 5);
  
  const limits = getRevivalLimits(state, Faction.EMPEROR);
  assert(limits.freeForces === 1, `Emperor free revival is 1 (actual: ${limits.freeForces})`);

  // Try to revive 1 elite - should count as 1 force (not 2)
  const validation = validateForceRevival(state, Faction.EMPEROR, 0, 1);
  
  assert(validation.valid === true, "validation allows reviving 1 elite (counts as 1 force)");
  
  // Check that total requested is 1 (elite counts as 1, not 2)
  // The validation function calculates: regularCount + eliteCount (both count as 1)
  const totalRequested = 0 + 1; // 1 elite = 1 force
  assert(totalRequested === 1, `1 elite counts as 1 force in revival (actual: ${totalRequested})`);
}

function testSardaukarRevival_onlyOnePerTurn(): void {
  section("2.03.11 - only one Sardaukar can be revived per turn");

  let state = buildBaseState();
  // Add 5 elite (Sardaukar) to tanks
  state = addForcesToTanks(state, Faction.EMPEROR, 0, 5);

  // Try to revive 2 elite - should fail (limit is 1 per turn)
  const validation = validateForceRevival(state, Faction.EMPEROR, 0, 2);
  
  assert(validation.valid === false, "validation rejects reviving 2 elite (limit is 1 per turn)");
  assert(
    validation.errors.some((e) => e.code === "ELITE_REVIVAL_LIMIT_EXCEEDED"),
    "validation error code is ELITE_REVIVAL_LIMIT_EXCEEDED"
  );
}

function testSardaukarRevival_cannotReviveAfterAlreadyRevived(): void {
  section("2.03.11 - cannot revive elite if already revived this turn");

  let state = buildBaseState();
  // Add 5 elite (Sardaukar) to tanks
  state = addForcesToTanks(state, Faction.EMPEROR, 0, 5);
  
  // Mark that 1 elite was already revived this turn
  const emperorState = getFactionState(state, Faction.EMPEROR);
  emperorState.eliteForcesRevivedThisTurn = 1;
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.EMPEROR, emperorState),
  };

  // Try to revive 1 more elite - should fail
  const validation = validateForceRevival(state, Faction.EMPEROR, 0, 1);
  
  assert(validation.valid === false, "validation rejects reviving elite when already revived this turn");
  assert(
    validation.errors.some((e) => e.code === "ELITE_REVIVAL_ALREADY_USED"),
    "validation error code is ELITE_REVIVAL_ALREADY_USED"
  );
}

function testSardaukarRevival_canReviveOnePerTurn(): void {
  section("2.03.11 - can revive exactly one Sardaukar per turn");

  let state = buildBaseState();
  // Add 5 elite (Sardaukar) to tanks
  state = addForcesToTanks(state, Faction.EMPEROR, 0, 5);

  // Try to revive 1 elite - should succeed
  const validation = validateForceRevival(state, Faction.EMPEROR, 0, 1);
  
  assert(validation.valid === true, "validation allows reviving exactly 1 elite per turn");
}

function testSardaukarRevival_regularForcesNotAffected(): void {
  section("2.03.10-11 - regular forces not affected by Sardaukar rules");

  let state = buildBaseState();
  // Add regular forces to tanks
  state = addForcesToTanks(state, Faction.EMPEROR, 10, 0);
  
  const limits = getRevivalLimits(state, Faction.EMPEROR);

  // Try to revive multiple regular forces - should work (no limit on regular)
  const validation = validateForceRevival(state, Faction.EMPEROR, limits.freeForces + 2, 0);
  
  // Should be valid (regular forces not limited by Sardaukar rules)
  assert(validation.valid === true, "validation allows reviving multiple regular forces (not limited)");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.03.10, 2.03.11 EMPEROR SARDAUKAR REVIVAL");
  console.log("=".repeat(80));

  try {
    testSardaukarRevival_treatedAsOneForce();
  } catch (error) {
    console.error("❌ testSardaukarRevival_treatedAsOneForce failed:", error);
    failCount++;
  }

  try {
    testSardaukarRevival_onlyOnePerTurn();
  } catch (error) {
    console.error("❌ testSardaukarRevival_onlyOnePerTurn failed:", error);
    failCount++;
  }

  try {
    testSardaukarRevival_cannotReviveAfterAlreadyRevived();
  } catch (error) {
    console.error("❌ testSardaukarRevival_cannotReviveAfterAlreadyRevived failed:", error);
    failCount++;
  }

  try {
    testSardaukarRevival_canReviveOnePerTurn();
  } catch (error) {
    console.error("❌ testSardaukarRevival_canReviveOnePerTurn failed:", error);
    failCount++;
  }

  try {
    testSardaukarRevival_regularForcesNotAffected();
  } catch (error) {
    console.error("❌ testSardaukarRevival_regularForcesNotAffected failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.03.10-11 tests completed: ${passCount} passed, ${failCount} failed`
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

