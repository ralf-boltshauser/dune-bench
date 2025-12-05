/**
 * Rule tests: 2.06.01–2.06.03 SPACING GUILD SETUP & FREE REVIVAL
 *
 * Rule texts (numbered_rules/2.md):
 *
 * 2.06.01 STARTING SPICE [0.12]:
 * "Put 5 spice behind your shield from the bank."
 *
 * 2.06.02 STARTING FORCES [0.13]:
 * "Place 5 Forces in Tuek's Sietch and 15 Forces in reserves (off-planet)."
 *
 * 2.06.03 FREE REVIVAL:
 * "1 Force."
 *
 * @rule-test 2.06.01
 * @rule-test 2.06.02
 * @rule-test 2.06.03
 */

import { Faction, TerritoryId, type GameState } from "../../types";
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
  // Use Guild plus one other faction to satisfy 2–6 faction requirement
  return createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.06.01 / 2.06.02 – Guild starting spice and forces
// =============================================================================

function testGuildStartingSpiceAndForces(): void {
  section("2.06.01–02 - Guild starting spice and forces");

  const state = buildBaseState();
  const guild = getFactionState(state, Faction.SPACING_GUILD);
  const guildConfig = getFactionConfig(Faction.SPACING_GUILD);

  assert(
    guild.spice === 5 && guild.spice === guildConfig.startingSpice,
    `Guild starts with exactly 5 spice (config.startingSpice=${guildConfig.startingSpice}, state.spice=${guild.spice})`
  );

  const tueksStack = guild.forces.onBoard.find(
    (stack) => stack.territoryId === TerritoryId.TUEKS_SIETCH
  );
  const forcesInTueks =
    (tueksStack?.forces.regular ?? 0) + (tueksStack?.forces.elite ?? 0);

  assert(
    forcesInTueks === 5,
    `Guild starts with 5 forces in Tuek's Sietch (got ${forcesInTueks})`
  );

  const reservesRegular = guild.forces.reserves.regular;
  const reservesElite = guild.forces.reserves.elite;

  assert(
    reservesRegular + reservesElite === 15,
    `Guild starts with 15 forces in reserves (got ${reservesRegular + reservesElite})`
  );
}

// =============================================================================
// 2.06.03 – Guild free revival = 1
// =============================================================================

function testGuildFreeRevivalLimit(): void {
  section("2.06.03 - Guild free revival limit");

  const state = buildBaseState();
  const limits = getRevivalLimits(state, Faction.SPACING_GUILD);

  assert(
    limits.freeForces === 1,
    `Guild free revival is 1 force (got ${limits.freeForces})`
  );

  // Sanity-check another faction for contrast
  const atreidesLimits = getRevivalLimits(state, Faction.ATREIDES);
  assert(
    atreidesLimits.freeForces === getFactionConfig(Faction.ATREIDES).freeRevival,
    "Atreides free revival matches its faction config (baseline contrast)"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.06.01–2.06.03 SPACING GUILD SETUP & FREE REVIVAL");
  console.log("=".repeat(80));

  try {
    testGuildStartingSpiceAndForces();
    testGuildFreeRevivalLimit();
  } catch (error) {
    console.error("Unexpected error during 2.06.01–2.06.03 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.06.01–2.06.03 rule tests failed");
  }
}


