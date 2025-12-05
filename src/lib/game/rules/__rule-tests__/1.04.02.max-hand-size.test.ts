/**
 * Rule test: 1.04.02 MAX HAND SIZE
 * @rule-test 1.04.02
 *
 * Rule text (numbered_rules/1.md):
 * "A player's maximum hand size is 4 Treachery cards."
 *
 * These tests exercise the core behavior of max hand size:
 * - Standard factions have max hand size of 4
 * - Harkonnen has max hand size of 8 (faction ability 2.05.07)
 * - Function returns correct max for each faction
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/1.04.02.max-hand-size.test.ts
 */

import { Faction, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionMaxHandSize } from "../../state/queries";

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
// Tests for 1.04.02
// =============================================================================

function testMaxHandSize_StandardFactionsHave4(): void {
  section("1.04.02 - standard factions have max hand size of 4");

  const standardFactions = [
    Faction.ATREIDES,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.BENE_GESSERIT,
    Faction.SPACING_GUILD,
  ];

  for (const faction of standardFactions) {
    const maxHand = getFactionMaxHandSize(faction);
    assert(
      maxHand === 4,
      `${faction} has max hand size of 4 (got ${maxHand})`
    );
  }
}

function testMaxHandSize_HarkonnenHas8(): void {
  section("1.04.02 - Harkonnen has max hand size of 8");

  const maxHand = getFactionMaxHandSize(Faction.HARKONNEN);

  assert(
    maxHand === 8,
    `Harkonnen has max hand size of 8 (got ${maxHand})`
  );
}

function testMaxHandSize_AllFactionsHaveValidMax(): void {
  section("1.04.02 - all factions have valid max hand size");

  // Only test factions that are in FACTION_CONFIGS
  const configuredFactions = [
    Faction.ATREIDES,
    Faction.BENE_GESSERIT,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.HARKONNEN,
    Faction.SPACING_GUILD,
  ];

  for (const faction of configuredFactions) {
    const maxHand = getFactionMaxHandSize(faction);
    assert(
      maxHand > 0,
      `${faction} has positive max hand size (got ${maxHand})`
    );
    assert(
      maxHand <= 8,
      `${faction} has max hand size <= 8 (got ${maxHand})`
    );
  }
}

function testMaxHandSize_StandardFactionsHaveExactly4(): void {
  section("1.04.02 - standard factions have exactly 4 (rule says '4 Treachery cards')");

  const standardFactions = [
    Faction.ATREIDES,
    Faction.EMPEROR,
    Faction.FREMEN,
    Faction.BENE_GESSERIT,
    Faction.SPACING_GUILD,
  ];

  for (const faction of standardFactions) {
    const maxHand = getFactionMaxHandSize(faction);
    assert(
      maxHand === 4,
      `${faction} has exactly 4 as max hand size (rule says '4 Treachery cards') (got ${maxHand})`
    );
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runAllTests(): void {
  console.log("\n🧪 Running 1.04.02 MAX HAND SIZE tests...\n");

  testMaxHandSize_StandardFactionsHave4();
  testMaxHandSize_HarkonnenHas8();
  testMaxHandSize_AllFactionsHaveValidMax();
  testMaxHandSize_StandardFactionsHaveExactly4();

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total:  ${passCount + failCount}`);
  console.log("=".repeat(50) + "\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests();

