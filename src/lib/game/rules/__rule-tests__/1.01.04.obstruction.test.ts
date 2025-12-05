/**
 * Rule test: 1.01.04 OBSTRUCTION
 *
 * Rule text (numbered_rules/1.md):
 * "OBSTRUCTION: Forces may not Ship/Send/Move into, out of, or through a Sector in Storm."
 *
 * @rule-test 1.01.04
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { validateSourceSectorNotInStorm, validateDestinationSectorNotInStorm, validateSectorNotInStorm } from "../../rules/storm-validation";
import { TERRITORY_DEFINITIONS } from "../../types/territories";

// =============================================================================
// Minimal test harness
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
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });
  return {
    ...state,
    stormSector: 5,
  };
}

// Helper to pick a sand territory with a sector index we care about
const anySandTerritoryId: TerritoryId = Object.entries(TERRITORY_DEFINITIONS)
  .find(([, def]) => def.type === 0 /* TerritoryType.SAND */)?.[0] as TerritoryId || TerritoryId.IMPERIAL_BASIN;

// =============================================================================
// Tests
// =============================================================================

function testObstruction_cannotMoveOutOfStormSector(): void {
  section("1.01.04 - cannot move OUT OF a sector in storm");

  const state = buildBaseState();

  // Put storm exactly in fromSector
  const fromSector = state.stormSector;

  const error = validateSourceSectorNotInStorm(
    state,
    Faction.ATREIDES,
    anySandTerritoryId,
    fromSector
  );

  assert(
    error !== null,
    `Movement OUT OF a sector in storm should be rejected (SOURCE_IN_STORM), got ${error ? error.code : "null"}`
  );
}

function testObstruction_cannotMoveIntoStormSector(): void {
  section("1.01.04 - cannot move INTO a sector in storm");

  const state = buildBaseState();
  const toSector = state.stormSector;

  const error = validateDestinationSectorNotInStorm(
    state,
    anySandTerritoryId,
    toSector,
    "toSector",
    "move to"
  );

  assert(
    error !== null,
    `Movement INTO a sector in storm should be rejected (DESTINATION_IN_STORM), got ${error ? error.code : "null"}`
  );
}

function testObstruction_cannotShipIntoStormSector(): void {
  section("1.01.04 - cannot SHIP into a sector in storm");

  const state = buildBaseState();
  const toSector = state.stormSector;

  const error = validateSectorNotInStorm(
    state,
    anySandTerritoryId,
    toSector
  );

  assert(
    error !== null,
    `Shipment INTO a sector in storm should be rejected (SECTOR_IN_STORM), got ${error ? error.code : "null"}`
  );
}

function testObstruction_fremenCanMoveThroughStorm(): void {
  section("1.01.04 + 2.04.17 - Fremen may move through storm");

  const state = buildBaseState();
  const sectorInStorm = state.stormSector;

  const errorOut = validateSourceSectorNotInStorm(
    state,
    Faction.FREMEN,
    anySandTerritoryId,
    sectorInStorm
  );

  assert(
    errorOut === null,
    `Fremen should be allowed to move OUT OF a storm sector (no SOURCE_IN_STORM error)`
  );
  // Destination-sector handling for Fremen is validated in movement rules/tests;
  // this test only asserts the OUT-OF-sector exception for 1.01.04 here.
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.01.04: OBSTRUCTION");
  console.log("=".repeat(80));

  testObstruction_cannotMoveOutOfStormSector();
  testObstruction_cannotMoveIntoStormSector();
  testObstruction_cannotShipIntoStormSector();
  testObstruction_fremenCanMoveThroughStorm();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
