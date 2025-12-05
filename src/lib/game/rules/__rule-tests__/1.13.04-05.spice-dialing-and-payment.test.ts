/**
 * Rule tests: 1.13.04–1.13.05 (Spice Dialing & Payment)
 *
 * @rule-test 1.13.04
 * @rule-test 1.13.04.02
 * @rule-test 1.13.04.04
 * @rule-test 1.13.04.05
 * @rule-test 1.13.05
 *
 * Rule text (numbered_rules/1.md):
 * 1.13.04 SPICE DIALING: Each Force used in a battle is valued at its full strength if 1 spice is paid to support it.
 * 1.13.04.02 UNSPICED FORCES: A Force used in a battle that is not supported by 1 spice is valued at half strength.
 * 1.13.04.04 SPICED FORCES: When creating a Battle Plan, a player must add the amount of spice they plan to pay in the battle to their Battle Wheel.
 * 1.13.04.05 PAYMENT: All spice paid for Spice Dialing is Placed in the Spice Bank.
 * 1.13.05 LOSING NOTHING: When a traitor card is played, the winner keeps all spice paid to support their Forces.
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { calculateSpicedForceStrength } from "../../rules/combat/strength-calculation";
import { applySpiceHandling } from "../../phases/handlers/battle/resolution/spice-handling";
import type { CurrentBattle, PhaseEvent } from "../../phases/types";
import type { BattleResult } from "../../rules/types";

// Minimal harness
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

function buildAdvancedState(): GameState {
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 5,
    phase: 0 as any,
    advancedRules: true,
  });
  return state;
}

// =============================================================================
// 1.13.04 / 1.13.04.02 - Spice dialing strength calculation
// =============================================================================

function testSpiceDialing_nonAdvancedReturnsBase(): void {
  section("1.13.04 - no effect when advanced rules are off");

  const base = 10;
  const effective = calculateSpicedForceStrength(
    Faction.ATREIDES,
    base,
    5,
    0,
    false
  );

  assert(
    effective === base,
    `Without advanced rules, spice dialing should not change strength (got ${effective})`
  );
}

function testSpiceDialing_allSpicedFullStrength(): void {
  section("1.13.04 - fully spiced forces count at full strength");

  const base = 6; // e.g. 3 forces at strength 2 each
  const forcesDialed = 3;
  const spiceDialed = 3; // 1 spice per force

  const effective = calculateSpicedForceStrength(
    Faction.ATREIDES,
    base,
    forcesDialed,
    spiceDialed,
    true
  );

  assert(
    effective === base,
    `When all forces are spiced, effective strength should equal base (${base}), got ${effective}`
  );
}

function testSpiceDialing_unspicedHalfStrength(): void {
  section("1.13.04.02 - unspiced forces count at half strength");

  const base = 4; // e.g. 4 regular forces at strength 1
  const forcesDialed = 4;

  // Case 1: No spice → all unspiced → half strength
  const noneSpiced = calculateSpicedForceStrength(
    Faction.ATREIDES,
    base,
    forcesDialed,
    0,
    true
  );

  assert(
    noneSpiced === 2,
    `With no spice, all 4 forces should count at half strength (2), got ${noneSpiced}`
  );

  // Case 2: Half spiced (2 of 4)
  const halfSpiced = calculateSpicedForceStrength(
    Faction.ATREIDES,
    base,
    forcesDialed,
    2,
    true
  );

  // 2 forces at full (2), 2 at half (1) → total 3
  assert(
    halfSpiced === 3,
    `With 2 spiced and 2 unspiced forces, total should be 3, got ${halfSpiced}`
  );
}

function testSpiceDialing_fremenException(): void {
  section("1.13.04 - Fremen do not need spice for full strength");

  const base = 5;
  const forcesDialed = 5;

  const noSpice = calculateSpicedForceStrength(
    Faction.FREMEN,
    base,
    forcesDialed,
    0,
    true
  );

  const withSpice = calculateSpicedForceStrength(
    Faction.FREMEN,
    base,
    forcesDialed,
    3,
    true
  );

  assert(
    noSpice === base && withSpice === base,
    `Fremen forces should count at full strength regardless of spice dialing (got ${noSpice} / ${withSpice})`
  );
}

// =============================================================================
// 1.13.04.05 / 1.13.05 - Spice payment & traitor handling
// =============================================================================

function buildSimpleBattle(spiceA: number, spiceB: number): {
  state: GameState;
  battle: CurrentBattle;
  result: BattleResult;
  events: PhaseEvent[];
} {
  let state = buildAdvancedState();

  // Normalize spice so assertions are simple
  const atreides = getFactionState(state, Faction.ATREIDES);
  const harkonnen = getFactionState(state, Faction.HARKONNEN);

  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, { ...atreides, spice: spiceA })
      .set(Faction.HARKONNEN, { ...harkonnen, spice: spiceB }),
  };

  const battle: CurrentBattle = {
    id: "test-battle",
    aggressor: Faction.ATREIDES,
    defender: Faction.HARKONNEN,
    territoryId: "imperial_basin" as any,
    sector: 1,
    aggressorPlan: { spiceDialed: 2 } as any,
    defenderPlan: { spiceDialed: 3 } as any,
  } as CurrentBattle;

  const result: BattleResult = {
    winner: Faction.ATREIDES,
    loser: Faction.HARKONNEN,
    winnerTotal: 0,
    loserTotal: 0,
    traitorRevealed: false,
    traitorRevealedBy: null,
    aggressorResult: { forcesLost: 0 } as any,
    defenderResult: { forcesLost: 0 } as any,
    spicePayouts: [],
  };

  const events: PhaseEvent[] = [];

  return { state, battle, result, events };
}

function testSpicePayment_normalBattleBothPayBank(): void {
  section("1.13.04.05 - in normal battle, both sides pay spice to bank");

  const { state, battle, result, events } = buildSimpleBattle(10, 10);

  const after = applySpiceHandling(state, battle, result, events);

  const atreidesAfter = getFactionState(after, Faction.ATREIDES);
  const harkonnenAfter = getFactionState(after, Faction.HARKONNEN);

  assert(
    atreidesAfter.spice === 8,
    `Atreides should pay 2 spice to bank (10 → 8), got ${atreidesAfter.spice}`
  );
  assert(
    harkonnenAfter.spice === 7,
    `Harkonnen should pay 3 spice to bank (10 → 7), got ${harkonnenAfter.spice}`
  );
}

function testSpicePayment_traitorWinnerKeepsTheirSpice(): void {
  section("1.13.05 - when traitor is played, winner keeps their spice; loser still pays");

  const { state, battle, result, events } = buildSimpleBattle(10, 10);

  const traitorResult: BattleResult = {
    ...result,
    traitorRevealed: true,
  };

  const after = applySpiceHandling(state, battle, traitorResult, events);

  const atreidesAfter = getFactionState(after, Faction.ATREIDES);
  const harkonnenAfter = getFactionState(after, Faction.HARKONNEN);

  // Winner (Atreides) keeps 2 spice they dialed
  assert(
    atreidesAfter.spice === 10,
    `Winner should keep their dialed spice when traitor is revealed (10 → 10), got ${atreidesAfter.spice}`
  );
  // Loser (Harkonnen) still pays 3 to bank
  assert(
    harkonnenAfter.spice === 7,
    `Loser should still pay their dialed spice to bank (10 → 7), got ${harkonnenAfter.spice}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rules 1.13.04–1.13.05: SPICE DIALING & PAYMENT");
  console.log("=".repeat(80));

  testSpiceDialing_nonAdvancedReturnsBase();
  testSpiceDialing_allSpicedFullStrength();
  testSpiceDialing_unspicedHalfStrength();
  testSpiceDialing_fremenException();
  testSpicePayment_normalBattleBothPayBank();
  testSpicePayment_traitorWinnerKeepsTheirSpice();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
