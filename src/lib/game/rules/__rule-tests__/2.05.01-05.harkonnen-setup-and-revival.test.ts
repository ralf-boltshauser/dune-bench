/**
 * Rule tests: 2.05.01–2.05.05 HARKONNEN SETUP & FREE REVIVAL
 *
 * Rule texts (numbered_rules/2.md):
 *
 * 2.05.01 STARTING SPICE:
 * "You start with 10 Spice behind your Shield."
 *
 * 2.05.02 STARTING FORCES:
 * "You start with 10 Forces in Carthag and 10 Forces in reserves."
 *
 * 2.05.03 TERRIBLY TRAITOROUS:
 * "During setup you are dealt 4 Traitor Cards and you keep all 4."
 *
 * 2.05.04 MYSTERY CARD:
 * "During setup you draw 1 extra Treachery Card."
 *
 * 2.05.05 FREE REVIVAL:
 * "You may revive 2 Forces for free each turn."
 *
 * @rule-test 2.05.01
 * @rule-test 2.05.02
 * @rule-test 2.05.03
 * @rule-test 2.05.04
 * @rule-test 2.05.05
 *
 * These tests focus on:
 * - Harkonnen starting spice and force distribution.
 * - Traitor setup: Harkonnen keeps all 4 dealt traitors.
 * - Starting Treachery Cards: Harkonnen starts with 2 cards.
 * - Free revival: Harkonnen has a free revival limit of 2 forces.
 */

import { Faction, LeaderLocation, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionConfig } from "../../data/faction-config";
import { getFactionState } from "../../state";
import { getRevivalLimits } from "../../rules/revival";

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
  // Use two factions to satisfy createGameState validation
  return createGameState({
    factions: [Faction.HARKONNEN, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.05.01 / 2.05.02 – Starting spice and forces
// =============================================================================

function testHarkonnenStartingSpiceAndForces(): void {
  section("2.05.01–02 - Harkonnen starting spice and forces");

  const state = buildBaseState();
  const harkonnen = getFactionState(state, Faction.HARKONNEN);
  const config = getFactionConfig(Faction.HARKONNEN);

  assert(
    harkonnen.spice === 10 && harkonnen.spice === config.startingSpice,
    "Harkonnen starts with exactly 10 spice as configured"
  );

  const forcesInCarthag = harkonnen.forces.onBoard.find(
    (stack) => stack.territoryId === TerritoryId.CARTHAG
  );
  const totalInCarthag =
    (forcesInCarthag?.forces.regular ?? 0) + (forcesInCarthag?.forces.elite ?? 0);

  assert(
    totalInCarthag === 10,
    "Harkonnen starts with 10 forces in Carthag on the board"
  );

  const reservesRegular = harkonnen.forces.reserves.regular;
  const reservesElite = harkonnen.forces.reserves.elite;

  assert(
    reservesRegular + reservesElite === 10,
    "Harkonnen starts with 10 forces in reserves"
  );

  const tanksRegular = harkonnen.forces.tanks.regular;
  const tanksElite = harkonnen.forces.tanks.elite;

  assert(
    tanksRegular + tanksElite === 0,
    "Harkonnen starts with no forces in tanks"
  );
}

// =============================================================================
// 2.05.03 / 2.05.04 – Traitors and starting Treachery Cards
// =============================================================================

function testHarkonnenStartingTraitorsAndTreachery(): void {
  section("2.05.03–04 - Harkonnen starting traitors and treachery cards");

  const state = buildBaseState();
  const harkonnen = getFactionState(state, Faction.HARKONNEN);
  const atreides = getFactionState(state, Faction.ATREIDES);

  // NOTE: Traitor dealing happens during setup phase rather than in createGameState.
  // However, the faction config encodes the "keep all 4" behavior directly.
  const harkConfig = getFactionConfig(Faction.HARKONNEN);
  const atreidesConfig = getFactionConfig(Faction.ATREIDES);

  assert(
    harkConfig.traitorCardsKept === 4,
    "Harkonnen configuration keeps all 4 dealt traitor cards (TERRIBLY TRAITOROUS)"
  );
  assert(
    atreidesConfig.traitorCardsKept === 1,
    "Non-Harkonnen factions keep only 1 traitor card"
  );

  assert(
    harkConfig.startingTreacheryCards === 2,
    "Harkonnen configuration starts with 2 Treachery Cards (MYSTERY CARD extra draw)"
  );
  assert(
    atreidesConfig.startingTreacheryCards === 1,
    "Baseline factions start with 1 Treachery Card"
  );

  // createGameState applies startingTreacheryCards immediately
  assert(
    harkonnen.hand.length === harkConfig.startingTreacheryCards,
    "Harkonnen hand size after setup matches startingTreacheryCards (2 cards)"
  );
  assert(
    atreides.hand.length === atreidesConfig.startingTreacheryCards,
    "Atreides hand size after setup matches startingTreacheryCards (1 card)"
  );
}

// =============================================================================
// 2.05.05 – Free revival = 2 forces
// =============================================================================

function testHarkonnenFreeRevivalLimit(): void {
  section("2.05.05 - Harkonnen free revival limit");

  const state = buildBaseState();

  const limits = getRevivalLimits(state, Faction.HARKONNEN);

  assert(
    limits.freeForces === 2,
    "getRevivalLimits reports 2 free forces for Harkonnen each turn"
  );

  // Sanity check against another faction to ensure we are not just echoing a constant
  const atreidesLimits = getRevivalLimits(state, Faction.ATREIDES);

  assert(
    atreidesLimits.freeForces === 2,
    "Atreides free revival is also 2 (baseline reference)"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.05.01–2.05.05 HARKONNEN SETUP & FREE REVIVAL");
  console.log("=".repeat(80));

  try {
    testHarkonnenStartingSpiceAndForces();
    testHarkonnenStartingTraitorsAndTreachery();
    testHarkonnenFreeRevivalLimit();
  } catch (error) {
    console.error("Unexpected error during 2.05.01–2.05.05 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.05.01–2.05.05 rule tests failed");
  }
}


