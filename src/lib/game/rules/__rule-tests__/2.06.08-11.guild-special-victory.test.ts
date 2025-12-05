/**
 * Rule tests: 2.06.08–2.06.11 SPACING GUILD SPECIAL VICTORY & ALLIANCE
 *
 * Rule texts (numbered_rules/2.md):
 *
 * 2.06.08 SPACING GUILD SPECIAL VICTORY CONDITION:
 * "If no faction has been able to win the game by the end of play, you have prevented control of Dune
 *  and automatically win the game."
 *
 * 2.06.09 ALLIANCE (HALF PRICE SHIPPING) and 2.06.10 ALLIANCE (CROSS-SHIP)
 * are exercised indirectly via movement/shipment tests.
 *
 * 2.06.11 ALLIANCE:
 * "Your ally wins with you when you win with the Spacing Guild Special Victory Condition [2.06.08]."
 *
 * (2.06.09 and 2.06.10 are covered in movement/shipment tests; this file focuses on victory.)
 *
 * @rule-test 2.06.08
 * @rule-test 2.06.11
 */

import { AllianceStatus, Faction, WinCondition, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { checkGuildSpecialVictory } from "../../rules/victory";

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

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.06.08 – Guild special victory when no one else wins
// =============================================================================

function testGuildSpecialVictorySolo(): void {
  section("2.06.08 - Guild special victory (solo)");

  const state = buildBaseState();

  const result = checkGuildSpecialVictory(state);

  assert(result !== null, "Guild special victory should return a WinResult when Guild is in game");
  assert(
    result?.condition === WinCondition.GUILD_SPECIAL,
    `Win condition is GUILD_SPECIAL (got ${result?.condition})`
  );
  assert(
    result?.winners.length === 1 &&
      result.winners[0] === Faction.SPACING_GUILD,
    "Only Guild is listed as winner when unallied"
  );
}

// =============================================================================
// 2.06.11 – Guild ally wins with Guild on special victory
// =============================================================================

function testGuildSpecialVictoryWithAlly(): void {
  section("2.06.11 - Guild ally wins with Guild on special victory");

  let state = buildBaseState();

  const guild = getFactionState(state, Faction.SPACING_GUILD);
  const atreides = getFactionState(state, Faction.ATREIDES);

  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.SPACING_GUILD, {
        ...guild,
        allianceStatus: AllianceStatus.ALLIED,
        allyId: Faction.ATREIDES,
      })
      .set(Faction.ATREIDES, {
        ...atreides,
        allianceStatus: AllianceStatus.ALLIED,
        allyId: Faction.SPACING_GUILD,
      }),
  };

  const result = checkGuildSpecialVictory(state);

  assert(result !== null, "Guild special victory should still apply when allied");
  assert(
    result?.winners.includes(Faction.SPACING_GUILD) &&
      result.winners.includes(Faction.ATREIDES),
    "Both Guild and its ally are listed as winners"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.06.08–2.06.11 SPACING GUILD SPECIAL VICTORY & ALLIANCE");
  console.log("=".repeat(80));

  try {
    testGuildSpecialVictorySolo();
    testGuildSpecialVictoryWithAlly();
  } catch (error) {
    console.error("Unexpected error during 2.06.08–2.06.11 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.06.08–2.06.11 rule tests failed");
  }
}


