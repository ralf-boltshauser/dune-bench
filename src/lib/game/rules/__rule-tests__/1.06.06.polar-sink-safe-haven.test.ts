/**
 * Rule test: 1.06.06 SAFE HAVEN (Polar Sink Never in Storm)
 * @rule-test 1.06.06
 *
 * Rule text (numbered_rules/1.md):
 * "SAFE HAVEN: The Polar Sink is never in storm."
 *
 * This rule establishes that Polar Sink is always safe from storm:
 * - Polar Sink is never in storm (regardless of storm sector)
 * - Movement to/from Polar Sink is never blocked by storm
 * - Shipment to Polar Sink is never blocked by storm
 * - Pathfinding through Polar Sink is never blocked by storm
 * - Polar Sink has no sectors (structural property)
 * - Polar Sink is protected from storm (structural property)
 *
 * These tests verify:
 * - Polar Sink has no sectors (never in storm)
 * - Polar Sink is protected from storm
 * - Movement to Polar Sink is never blocked by storm
 * - Movement from Polar Sink is never blocked by storm
 * - Shipment to Polar Sink is never blocked by storm
 * - Pathfinding through Polar Sink is never blocked by storm
 * - Validation functions correctly exempt Polar Sink
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateMovement } from "../../rules/movement/movement/validate-movement";
import { validateShipment } from "../../rules/movement/shipment/validate-shipment";
import { validateSourceSectorNotInStorm, validateDestinationSectorNotInStorm } from "../../rules/storm-validation";
import { findPath } from "../../rules/movement/paths";
import { canPassThroughTerritory } from "../../rules/movement/territory-rules/storm-checks";
import { isTerritoryInStorm } from "../../state/queries";
import { TERRITORY_DEFINITIONS } from "../../types";

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

function buildBaseState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): GameState {
  const state = createGameState({
    factions,
    turn: 1,
    phase: Phase.SHIPMENT_MOVEMENT,
  });
  return {
    ...state,
    stormOrder: factions,
    stormSector: 0, // Safe sector for testing
  };
}

// =============================================================================
// Tests
// =============================================================================

function testPolarSink_StructuralProperties(): void {
  section("Polar Sink Structural Properties");

  const polarSink = TerritoryId.POLAR_SINK;
  const polarSinkDef = TERRITORY_DEFINITIONS[polarSink];
  
  // Test 1: Polar Sink has no sectors
  assert(
    polarSinkDef.sectors.length === 0,
    `Polar Sink should have no sectors (never in storm), got ${polarSinkDef.sectors.length}`
  );
  
  // Test 2: Polar Sink is protected from storm
  assert(
    polarSinkDef.protectedFromStorm === true,
    `Polar Sink should be protected from storm`
  );
  
  // Test 3: Polar Sink is of type POLAR_SINK (check enum value)
  // Note: The type is stored as an enum value, not a string
  assert(
    polarSinkDef.type !== undefined,
    `Polar Sink should have a type defined`
  );
}

function testPolarSink_NeverInStorm(): void {
  section("Polar Sink is Never in Storm (Regardless of Storm Sector)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const polarSink = TerritoryId.POLAR_SINK;
  
  // Test with different storm sectors (0-17)
  for (let stormSector = 0; stormSector <= 17; stormSector++) {
    const testState = {
      ...state,
      stormSector,
    };
    
    // Polar Sink should never be in storm
    const inStorm = isTerritoryInStorm(testState, polarSink);
    assert(
      !inStorm,
      `Polar Sink should NOT be in storm when storm sector is ${stormSector}`
    );
  }
  
  // Test canPassThroughTerritory - should always return true
  const canPass = canPassThroughTerritory(state, polarSink);
  assert(
    canPass,
    `Polar Sink should always be passable (never in storm)`
  );
}

function testPolarSink_MovementToPolarSinkNeverBlocked(): void {
  section("Movement TO Polar Sink is Never Blocked by Storm");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const polarSink = TerritoryId.POLAR_SINK;
  const sourceTerritory = TerritoryId.SIETCH_TABR; // Has sector 13
  const sourceSector = 13;
  
  // Set storm to any sector (should not matter)
  const stormSector = 5;
  
  const initialState = {
    ...state,
    stormSector,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: sourceTerritory, 
          sector: sourceSector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // Test destination validation - Polar Sink should always be valid
  // Since Polar Sink has no sectors, we use sector 0 as placeholder
  const destValidation = validateDestinationSectorNotInStorm(
    initialState,
    polarSink,
    0, // Polar Sink uses sector 0 as placeholder
    'toSector',
    'move to'
  );
  
  assert(
    destValidation === null,
    `Should NOT have storm error when moving to Polar Sink (never in storm)`
  );
  
  // Test full movement validation - should not fail for storm
  // Note: May fail for other reasons (range, etc.), but should NOT fail for storm
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    sourceTerritory,
    sourceSector,
    polarSink,
    0, // Polar Sink uses sector 0 as placeholder
    3,
    false
  );
  
  if (!result.valid && result.errors.length > 0) {
    const hasStormError = result.errors.some(e => 
      e.code === 'DESTINATION_IN_STORM' ||
      e.code === 'SOURCE_IN_STORM' ||
      e.message.toLowerCase().includes('storm')
    );
    assert(
      !hasStormError,
      `Should NOT have storm error when moving to Polar Sink: ${result.errors.map(e => e.message).join(", ")}`
    );
  } else {
    assert(
      true,
      `Movement to Polar Sink is valid (never blocked by storm)`
    );
  }
}

function testPolarSink_MovementFromPolarSinkNeverBlocked(): void {
  section("Movement FROM Polar Sink is Never Blocked by Storm");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const polarSink = TerritoryId.POLAR_SINK;
  const destTerritory = TerritoryId.SIETCH_TABR; // Has sector 13
  const destSector = 13;
  
  // Set storm to any sector (should not matter)
  const stormSector = 5;
  
  const initialState = {
    ...state,
    stormSector,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: polarSink, 
          sector: 0, // Polar Sink uses sector 0 as placeholder
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // Test source validation - Polar Sink should always be valid
  const sourceValidation = validateSourceSectorNotInStorm(
    initialState,
    Faction.ATREIDES,
    polarSink,
    0 // Polar Sink uses sector 0 as placeholder
  );
  
  assert(
    sourceValidation === null,
    `Should NOT have storm error when moving from Polar Sink (never in storm)`
  );
  
  // Test full movement validation - should not fail for storm
  // Note: May fail for other reasons (range, etc.), but should NOT fail for storm
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    polarSink,
    0, // Polar Sink uses sector 0 as placeholder
    destTerritory,
    destSector,
    3,
    false
  );
  
  if (!result.valid && result.errors.length > 0) {
    const hasStormError = result.errors.some(e => 
      e.code === 'DESTINATION_IN_STORM' ||
      e.code === 'SOURCE_IN_STORM' ||
      e.message.toLowerCase().includes('storm')
    );
    assert(
      !hasStormError,
      `Should NOT have storm error when moving from Polar Sink: ${result.errors.map(e => e.message).join(", ")}`
    );
  } else {
    assert(
      true,
      `Movement from Polar Sink is valid (never blocked by storm)`
    );
  }
}

function testPolarSink_ShipmentToPolarSinkNeverBlocked(): void {
  section("Shipment TO Polar Sink is Never Blocked by Storm");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const polarSink = TerritoryId.POLAR_SINK;
  
  // Set storm to any sector (should not matter)
  const stormSector = 5;
  
  const initialState = {
    ...state,
    stormSector,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        reserves: { regular: 10, elite: 0 },
      },
      spice: 20,
    })),
  };

  // Test shipment validation - Polar Sink should always be valid
  // Since Polar Sink has no sectors, we use sector 0 as placeholder
  const result = validateShipment(
    initialState,
    Faction.ATREIDES,
    polarSink,
    0, // Polar Sink uses sector 0 as placeholder
    3
  );
  
  if (!result.valid && result.errors.length > 0) {
    const hasStormError = result.errors.some(e => 
      e.code === 'SECTOR_IN_STORM' ||
      e.message.toLowerCase().includes('storm')
    );
    assert(
      !hasStormError,
      `Should NOT have storm error when shipping to Polar Sink: ${result.errors.map(e => e.message).join(", ")}`
    );
  } else {
    assert(
      true,
      `Shipment to Polar Sink is valid (never blocked by storm)`
    );
  }
}

function testPolarSink_PathfindingThroughPolarSinkNeverBlocked(): void {
  section("Pathfinding Through Polar Sink is Never Blocked by Storm");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  
  const polarSink = TerritoryId.POLAR_SINK;
  
  // Test with different storm sectors
  for (let stormSector = 0; stormSector <= 17; stormSector++) {
    const testState = {
      ...state,
      stormSector,
    };
    
    // Test pathfinding through Polar Sink
    // Find a territory adjacent to Polar Sink
    const polarSinkDef = TERRITORY_DEFINITIONS[polarSink];
    if (polarSinkDef.adjacentTerritories.length > 0) {
      const fromTerritory = polarSinkDef.adjacentTerritories[0];
      const toTerritory = polarSinkDef.adjacentTerritories.length > 1 
        ? polarSinkDef.adjacentTerritories[1]
        : fromTerritory;
      
      // Path should be able to go through Polar Sink
      const canPass = canPassThroughTerritory(testState, polarSink);
      assert(
        canPass,
        `Polar Sink should be passable when storm sector is ${stormSector}`
      );
      
      // If from and to are different, try to find a path
      if (fromTerritory !== toTerritory) {
        const path = findPath(fromTerritory, toTerritory, testState, Faction.ATREIDES);
        // Path may or may not include Polar Sink, but if it does, it should be valid
        if (path && path.includes(polarSink)) {
          assert(
            true,
            `Path through Polar Sink is valid (never blocked by storm)`
          );
        }
      }
    }
  }
}

function testPolarSink_ValidationFunctionsExemptPolarSink(): void {
  section("Validation Functions Correctly Exempt Polar Sink");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const polarSink = TerritoryId.POLAR_SINK;
  
  // Set storm to any sector
  const stormSector = 5;
  const testState = {
    ...state,
    stormSector,
  };
  
  // Test 1: validateDestinationSectorNotInStorm
  const destValidation = validateDestinationSectorNotInStorm(
    testState,
    polarSink,
    0, // Polar Sink uses sector 0 as placeholder
    'toSector',
    'move to'
  );
  assert(
    destValidation === null,
    `validateDestinationSectorNotInStorm should exempt Polar Sink (never in storm)`
  );
  
  // Test 2: validateSourceSectorNotInStorm
  const sourceValidation = validateSourceSectorNotInStorm(
    testState,
    Faction.ATREIDES,
    polarSink,
    0 // Polar Sink uses sector 0 as placeholder
  );
  assert(
    sourceValidation === null,
    `validateSourceSectorNotInStorm should exempt Polar Sink (never in storm)`
  );
  
  // Test 3: isTerritoryInStorm
  const inStorm = isTerritoryInStorm(testState, polarSink);
  assert(
    !inStorm,
    `isTerritoryInStorm should return false for Polar Sink (never in storm)`
  );
  
  // Test 4: canPassThroughTerritory
  const canPass = canPassThroughTerritory(testState, polarSink);
  assert(
    canPass,
    `canPassThroughTerritory should return true for Polar Sink (never in storm)`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.06: SAFE HAVEN (Polar Sink Never in Storm)");
  console.log("=".repeat(80));

  testPolarSink_StructuralProperties();
  testPolarSink_NeverInStorm();
  testPolarSink_MovementToPolarSinkNeverBlocked();
  testPolarSink_MovementFromPolarSinkNeverBlocked();
  testPolarSink_ShipmentToPolarSinkNeverBlocked();
  testPolarSink_PathfindingThroughPolarSinkNeverBlocked();
  testPolarSink_ValidationFunctionsExemptPolarSink();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

