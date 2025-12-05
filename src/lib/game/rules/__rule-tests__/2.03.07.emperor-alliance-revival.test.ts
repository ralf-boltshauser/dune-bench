/**
 * Rule test: 2.03.07 EMPEROR ALLIANCE REVIVAL
 * @rule-test 2.03.07
 *
 * Rule text (numbered_rules/2.md):
 * "2.03.07 ALLIANCE: You may pay spice for the revival of up to 3 extra of your ally's Forces beyond their current limit from the Tleilaxu Tanks.✷"
 *
 * This rule allows Emperor to pay for extra revival of ally's forces (up to 3 beyond limit).
 * Implemented in revival tool/validation.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.03.07.emperor-alliance-revival.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState, getFactionState, formAlliance } from "../../state";
import { validateForceRevival } from "../../rules/revival";
import { getRevivalLimits } from "../../rules/revival";

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
// Tests for 2.03.07
// =============================================================================

function testEmperorAllianceRevival_bonusAvailableWhenAllied(): void {
  section("2.03.07 - Emperor bonus available when allied and ally has forces in tanks");

  let state = buildBaseState();
  state = formAlliance(state, Faction.EMPEROR, Faction.ATREIDES);
  
  // Add forces to Atreides tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 10, 0);
  
  // Get Atreides revival limits - should show Emperor bonus available
  const limits = getRevivalLimits(state, Faction.ATREIDES);
  assert(limits.freeForces === 2, `Atreides free revival is 2 (actual: ${limits.freeForces})`);
  assert(limits.emperorBonusAvailable === 3, `Emperor bonus available is 3 (actual: ${limits.emperorBonusAvailable})`);
  assert(limits.forcesInTanks === 10, `Atreides has 10 forces in tanks (actual: ${limits.forcesInTanks})`);
}

function testEmperorAllianceRevival_bonusReducedWhenUsed(): void {
  section("2.03.07 - bonus reduced when already used this turn");

  let state = buildBaseState();
  state = formAlliance(state, Faction.EMPEROR, Faction.ATREIDES);
  
  // Add forces to Atreides tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 10, 0);
  
  // Mark that 1 force was already revived using Emperor bonus
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  atreidesState.emperorAllyRevivalsUsed = 1;
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, atreidesState),
  };
  
  // Get Atreides revival limits - should show reduced bonus
  const limits = getRevivalLimits(state, Faction.ATREIDES);
  assert(limits.emperorBonusAvailable === 2, `Emperor bonus available is 2 after using 1 (actual: ${limits.emperorBonusAvailable})`);
  
  // Mark that 2 more were used (total 3)
  atreidesState.emperorAllyRevivalsUsed = 3;
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, atreidesState),
  };
  
  const limits2 = getRevivalLimits(state, Faction.ATREIDES);
  assert(limits2.emperorBonusAvailable === 0, `Emperor bonus available is 0 after using all 3 (actual: ${limits2.emperorBonusAvailable})`);
}

function testEmperorAllianceRevival_noBonusWhenNotAllied(): void {
  section("2.03.07 - no bonus available when not allied to Emperor");

  let state = buildBaseState();
  // No alliance formed
  
  // Add forces to Atreides tanks
  state = addForcesToTanks(state, Faction.ATREIDES, 10, 0);
  
  // Get Atreides revival limits - should show no Emperor bonus
  const limits = getRevivalLimits(state, Faction.ATREIDES);
  assert(limits.emperorBonusAvailable === 0, `Emperor bonus available is 0 when not allied (actual: ${limits.emperorBonusAvailable})`);
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.03.07 EMPEROR ALLIANCE REVIVAL");
  console.log("=".repeat(80));

  try {
    testEmperorAllianceRevival_bonusAvailableWhenAllied();
  } catch (error) {
    console.error("❌ testEmperorAllianceRevival_bonusAvailableWhenAllied failed:", error);
    failCount++;
  }

  try {
    testEmperorAllianceRevival_bonusReducedWhenUsed();
  } catch (error) {
    console.error("❌ testEmperorAllianceRevival_bonusReducedWhenUsed failed:", error);
    failCount++;
  }

  try {
    testEmperorAllianceRevival_noBonusWhenNotAllied();
  } catch (error) {
    console.error("❌ testEmperorAllianceRevival_noBonusWhenNotAllied failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.03.07 tests completed: ${passCount} passed, ${failCount} failed`
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

