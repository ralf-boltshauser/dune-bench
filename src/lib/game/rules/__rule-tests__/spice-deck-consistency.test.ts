/**
 * Spice Deck Consistency Tests
 * @rule-test 1.02.04
 *
 * Verifies that all territory spice cards in ALL_SPICE_CARDS:
 * - Point to a territory that is marked as a spice blow location (spiceBlowLocation: true)
 * - Use a sector that exists in the territory's sector list
 *
 * This guarantees that the "Spice Deck" only consists of valid spice blow locations,
 * matching the board definition in TERRITORY_DEFINITIONS.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/spice-deck-consistency.test.ts
 */

import {
  SpiceCardType,
  TerritoryId,
  TERRITORY_DEFINITIONS,
} from "../../types";
import { ALL_SPICE_CARDS } from "../../data/spice-cards";

// Minimal console-based harness
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

function runSpiceDeckConsistencyTests(): void {
  section("Spice Deck Consistency - Territory Cards");

  const territoryCards = ALL_SPICE_CARDS.filter(
    (card) => card.type === SpiceCardType.TERRITORY
  );

  // 1) Every territory spice card must have territoryId, sector, and spiceAmount
  for (const card of territoryCards) {
    assert(
      card.territoryId !== undefined,
      `card ${card.id} has a territoryId`
    );
    assert(card.sector !== undefined, `card ${card.id} has a sector`);
    assert(
      typeof card.spiceAmount === "number" && card.spiceAmount > 0,
      `card ${card.id} has a positive spiceAmount`
    );
  }

  // 2) For each territory card, territory must exist and have a spiceSlotId
  for (const card of territoryCards) {
    const territoryId = card.territoryId as TerritoryId;
    const def = TERRITORY_DEFINITIONS[territoryId];

    assert(
      !!def,
      `card ${card.id} references an existing territory definition (${territoryId})`
    );

    if (def) {
      assert(
        typeof def.spiceSlotId === "string" && def.spiceSlotId.length > 0,
        `territory ${territoryId} has a spiceSlotId (is a valid spice blow territory) for card ${card.id}`
      );
    }
  }

  // 3) For each territory card, its sector must be one of the territory's sectors
  for (const card of territoryCards) {
    const territoryId = card.territoryId as TerritoryId;
    const def = TERRITORY_DEFINITIONS[territoryId];
    const sector = card.sector;

    if (!def || sector === undefined) continue;

    assert(
      def.sectors.includes(sector),
      `card ${card.id} uses a sector (${sector}) that exists in territory ${territoryId}'s sectors [${def.sectors.join(
        ", "
      )}]`
    );
  }
}

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE / DATA TESTS: Spice Deck Consistency");
  console.log("=".repeat(80));

  try {
    runSpiceDeckConsistencyTests();
  } catch (error) {
    console.error("❌ Spice deck consistency tests failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Spice deck consistency tests completed: ${passCount} passed, ${failCount} failed`
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

