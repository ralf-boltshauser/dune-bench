/**
 * Rule test: 0.15 TURN MARKER
 * @rule-test 0.15
 *
 * Rule text (numbered_rules/0.md):
 * "0.15 TURN MARKER: Place the turn marker at 1 on the Turn Track."
 *
 * These tests exercise the initialization of the game state in createGameState():
 * - The turn marker is set to 1 at game start.
 * - This is true regardless of:
 *   - Which factions are in the game.
 *   - The configured maximum number of turns.
 *   - Whether advanced rules or variants are enabled.
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";

// =============================================================================
// Minimal console-based test harness
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

function buildBaseState(options?: Partial<Parameters<typeof createGameState>[0]>): GameState {
  // Use two standard factions to satisfy createGameState validation (2–6 factions)
  const baseOptions = {
    factions: [Faction.ATREIDES, Faction.HARKONNEN] as const,
    advancedRules: true,
  };

  return createGameState({
    ...baseOptions,
    ...(options ?? {}),
  });
}

// =============================================================================
// Tests for 0.15 TURN MARKER
// =============================================================================

function testTurnMarkerStartsAtOne_basic(): void {
  section("0.15 - basic: turn marker starts at 1");

  const state = buildBaseState();

  assert(state.turn === 1, `turn marker is initialized to 1 (got ${state.turn})`);
}

function testTurnMarkerStartsAtOne_differentFactions(): void {
  section("0.15 - turn marker is 1 regardless of factions");

  const state = buildBaseState({
    factions: [Faction.BENE_GESSERIT, Faction.EMPEROR],
  });

  assert(
    state.turn === 1,
    `turn marker remains 1 even with different faction mix (got ${state.turn})`
  );
}

function testTurnMarkerStartsAtOne_differentMaxTurnsAndVariants(): void {
  section("0.15 - turn marker is 1 regardless of maxTurns and variants");

  const state = buildBaseState({
    maxTurns: 15,
    advancedRules: false,
    variants: {
      shieldWallStronghold: true,
      leaderSkillCards: true,
      homeworlds: true,
    },
  });

  assert(
    state.turn === 1,
    `turn marker is 1 even when maxTurns/variants are changed (got ${state.turn})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 0.15 TURN MARKER");
  console.log("=".repeat(80));

  try {
    testTurnMarkerStartsAtOne_basic();
    testTurnMarkerStartsAtOne_differentFactions();
    testTurnMarkerStartsAtOne_differentMaxTurnsAndVariants();
  } catch (error) {
    console.error("Unexpected error during 0.15 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 0.15 rule tests failed");
  }
}


