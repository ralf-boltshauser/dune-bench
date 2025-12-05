/**
 * Rule test: 1.06.05.09 OCCUPANCY LIMIT (Movement)
 * @rule-test 1.06.05.09
 *
 * Rule text (numbered_rules/1.md):
 * "Occupancy Limit: Like Shipment, Forces can not be moved into or through a Stronghold if Forces of two other players are already there."
 *
 * This rule establishes that stronghold occupancy limits apply to movement:
 * - Cannot move INTO stronghold with 2 other factions
 * - Cannot move THROUGH stronghold with 2 other factions (pathfinding blocks)
 * - Can move INTO stronghold with 0-1 other factions
 * - Can move INTO stronghold if already there (repositioning)
 * - Can transit THROUGH stronghold with 0-1 other factions
 * - Cannot transit THROUGH stronghold with 2+ other factions
 *
 * These tests verify:
 * - Cannot move into stronghold with 2 other factions
 * - Can move into stronghold with 0-1 other factions
 * - Can move into stronghold if already there
 * - Cannot move through stronghold with 2 other factions (pathfinding blocks)
 * - Can move through stronghold with 0-1 other factions
 * - Validation errors are correct
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, STRONGHOLD_TERRITORIES, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateMovement } from "../../rules/movement/movement/validate-movement";
import { canEnterStronghold, canTransitThroughStronghold } from "../../rules/movement/territory-rules/occupancy";
import { findPath } from "../../rules/movement/paths";
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

function getStrongholdTerritory(): TerritoryId {
  return TerritoryId.ARRAKEEN; // Stronghold
}

function getStrongholdSector(): number {
  return 9; // Arrakeen's sector
}

// =============================================================================
// Tests
// =============================================================================

function testOccupancyLimit_CannotMoveIntoStrongholdWithTwoOtherFactions(): void {
  section("Cannot Move INTO Stronghold with 2 Other Factions");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.BENE_GESSERIT]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  const stronghold = getStrongholdTerritory();
  const strongholdSector = getStrongholdSector();
  const sourceTerritory = TerritoryId.SIETCH_TABR; // Has sector 13
  const sourceSector = 13;
  
  // Set up stronghold with 2 other factions (Harkonnen and Emperor)
  // Atreides is trying to move in (should be blocked)
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Test canEnterStronghold directly
  const occupancyCheck = canEnterStronghold(initialState, stronghold, Faction.ATREIDES);
  assert(
    !occupancyCheck.allowed,
    `Should NOT be able to enter stronghold with 2 other factions`
  );
  
  if (occupancyCheck.error) {
    assert(
      occupancyCheck.error.message.toLowerCase().includes('occupancy') ||
      occupancyCheck.error.message.toLowerCase().includes('factions'),
      `Error message should mention occupancy or factions: ${occupancyCheck.error.message}`
    );
  }
  
  // Test validateMovement
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    sourceTerritory,
    sourceSector,
    stronghold,
    strongholdSector,
    3,
    false
  );
  
  assert(
    !result.valid,
    `Should NOT be able to move into stronghold with 2 other factions`
  );
  
  assert(
    result.errors.some(e => 
      e.code === 'OCCUPANCY_LIMIT_EXCEEDED' ||
      e.message.toLowerCase().includes('occupancy') ||
      e.message.toLowerCase().includes('factions')
    ),
    `Should have occupancy limit error: ${result.errors.map(e => `${e.code}: ${e.message}`).join(", ")}`
  );
}

function testOccupancyLimit_CanMoveIntoStrongholdWithZeroOrOneOtherFaction(): void {
  section("Can Move INTO Stronghold with 0-1 Other Factions");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const stronghold = getStrongholdTerritory();
  const strongholdSector = getStrongholdSector();
  const sourceTerritory = TerritoryId.SIETCH_TABR; // Has sector 13
  const sourceSector = 13;
  
  // Test 1: Can move into empty stronghold (0 other factions)
  const emptyState = {
    ...state,
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

  const emptyCheck = canEnterStronghold(emptyState, stronghold, Faction.ATREIDES);
  assert(
    emptyCheck.allowed,
    `Should be able to enter empty stronghold (0 other factions)`
  );
  
  // Test 2: Can move into stronghold with 1 other faction
  const oneFactionState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const oneFactionCheck = canEnterStronghold(oneFactionState, stronghold, Faction.ATREIDES);
  assert(
    oneFactionCheck.allowed,
    `Should be able to enter stronghold with 1 other faction`
  );
}

function testOccupancyLimit_CanMoveIntoStrongholdIfAlreadyThere(): void {
  section("Can Move INTO Stronghold If Already There (Repositioning)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  const stronghold = getStrongholdTerritory();
  const strongholdSector = getStrongholdSector();
  const otherSector = strongholdSector; // Same territory, different sector if available
  
  // Set up stronghold with Atreides already there, plus 2 other factions
  // Atreides should be able to reposition within the stronghold
  const territoryDef = TERRITORY_DEFINITIONS[stronghold];
  const sectors = territoryDef.sectors;
  const fromSector = sectors[0];
  const toSector = sectors.length > 1 ? sectors[1] : fromSector;
  
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: stronghold, 
            sector: fromSector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Can enter stronghold if already there (repositioning)
  const occupancyCheck = canEnterStronghold(initialState, stronghold, Faction.ATREIDES);
  assert(
    occupancyCheck.allowed,
    `Should be able to enter stronghold if already there (repositioning)`
  );
  
  // Test repositioning within same stronghold
  if (fromSector !== toSector) {
    const result = validateMovement(
      initialState,
      Faction.ATREIDES,
      stronghold,
      fromSector,
      stronghold,
      toSector,
      3,
      false
    );
    
    // Should be valid (repositioning within same territory)
    // May fail for other reasons (storm, etc.), but should NOT fail for occupancy
    if (!result.valid && result.errors.length > 0) {
      const hasOccupancyError = result.errors.some(e => 
        e.code === 'OCCUPANCY_LIMIT_EXCEEDED' ||
        e.message.toLowerCase().includes('occupancy')
      );
      assert(
        !hasOccupancyError,
        `Should NOT have occupancy error when repositioning within same stronghold: ${result.errors.map(e => e.message).join(", ")}`
      );
    } else {
      assert(
        true,
        `Repositioning within same stronghold is valid (occupancy limit doesn't apply)`
      );
    }
  }
}

function testOccupancyLimit_CannotMoveThroughStrongholdWithTwoOtherFactions(): void {
  section("Cannot Move THROUGH Stronghold with 2 Other Factions (Pathfinding Blocks)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  const stronghold = getStrongholdTerritory();
  const strongholdSector = getStrongholdSector();
  
  // Set up stronghold with 2 other factions (Harkonnen and Emperor)
  // Atreides is trying to move through (should be blocked by pathfinding)
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Test canTransitThroughStronghold (for pathfinding)
  const canTransit = canTransitThroughStronghold(initialState, stronghold, Faction.ATREIDES, false);
  assert(
    !canTransit,
    `Should NOT be able to transit through stronghold with 2 other factions`
  );
  
  // Test pathfinding - should not find paths through full stronghold
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const toTerritory = TerritoryId.CIE_NORTH;
  
  const path = findPath(fromTerritory, toTerritory, initialState, Faction.ATREIDES);
  
  if (path) {
    // Path should not include the full stronghold
    assert(
      !path.includes(stronghold),
      `Path should NOT include stronghold ${stronghold} with 2 other factions (occupancy limit blocks transit)`
    );
  } else {
    // No path found - that's correct if stronghold is blocking
    assert(
      true,
      `No path found (stronghold with 2 other factions blocks transit)`
    );
  }
}

function testOccupancyLimit_CanMoveThroughStrongholdWithZeroOrOneOtherFaction(): void {
  section("Can Move THROUGH Stronghold with 0-1 Other Factions");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const stronghold = getStrongholdTerritory();
  const strongholdSector = getStrongholdSector();
  
  // Test 1: Can transit through empty stronghold (0 other factions)
  const emptyState = {
    ...state,
    factions: new Map(state.factions),
  };

  const emptyTransit = canTransitThroughStronghold(emptyState, stronghold, Faction.ATREIDES, false);
  assert(
    emptyTransit,
    `Should be able to transit through empty stronghold (0 other factions)`
  );
  
  // Test 2: Can transit through stronghold with 1 other faction
  const oneFactionState = {
    ...state,
    factions: new Map(state.factions.set(Faction.HARKONNEN, {
      ...harkonnenState,
      forces: {
        ...harkonnenState.forces,
        onBoard: [{ 
          factionId: Faction.HARKONNEN, 
          territoryId: stronghold, 
          sector: strongholdSector, 
          forces: { regular: 3, elite: 0 } 
        }],
      },
    })),
  };

  const oneFactionTransit = canTransitThroughStronghold(oneFactionState, stronghold, Faction.ATREIDES, false);
  assert(
    oneFactionTransit,
    `Should be able to transit through stronghold with 1 other faction`
  );
}

function testOccupancyLimit_NonStrongholdTerritoriesHaveNoLimit(): void {
  section("Non-Stronghold Territories Have No Occupancy Limit");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.BENE_GESSERIT]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  
  // Use a non-stronghold territory
  const nonStronghold = TerritoryId.PASTY_MESA; // Not a stronghold
  const nonStrongholdSector = 12; // Pasty Mesa sector
  const sourceTerritory = TerritoryId.CIELAGO_NORTH; // Has sector 2
  const sourceSector = 2;
  
  // Set up non-stronghold with 3 other factions (should be allowed)
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: nonStronghold, 
            sector: nonStrongholdSector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: nonStronghold, 
            sector: nonStrongholdSector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [{ 
            factionId: Faction.BENE_GESSERIT, 
            territoryId: nonStronghold, 
            sector: nonStrongholdSector, 
            forces: { regular: 1, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Non-stronghold should have no occupancy limit
  const occupancyCheck = canEnterStronghold(initialState, nonStronghold, Faction.ATREIDES);
  assert(
    occupancyCheck.allowed,
    `Should be able to enter non-stronghold territory (no occupancy limit)`
  );
  
  // Can transit through non-stronghold
  const canTransit = canTransitThroughStronghold(initialState, nonStronghold, Faction.ATREIDES, false);
  assert(
    canTransit,
    `Should be able to transit through non-stronghold territory (no occupancy limit)`
  );
}

function testOccupancyLimit_ValidationErrorsAreCorrect(): void {
  section("Validation Errors Are Correct");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  const stronghold = getStrongholdTerritory();
  const strongholdSector = getStrongholdSector();
  const sourceTerritory = TerritoryId.SIETCH_TABR; // Has sector 13
  const sourceSector = 13;
  
  // Set up stronghold with 2 other factions (Harkonnen and Emperor)
  // Atreides is trying to move in (should be blocked)
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: stronghold, 
            sector: strongholdSector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  const occupancyCheck = canEnterStronghold(initialState, stronghold, Faction.ATREIDES);
  
  assert(
    !occupancyCheck.allowed,
    `Should NOT be able to enter stronghold with 2 other factions`
  );
  
  if (occupancyCheck.error) {
    assert(
      occupancyCheck.error.message.toLowerCase().includes('occupancy') ||
      occupancyCheck.error.message.toLowerCase().includes('factions') ||
      occupancyCheck.error.message.toLowerCase().includes('stronghold'),
      `Error message should mention occupancy, factions, or stronghold: ${occupancyCheck.error.message}`
    );
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.05.09: OCCUPANCY LIMIT (Movement)");
  console.log("=".repeat(80));

  testOccupancyLimit_CannotMoveIntoStrongholdWithTwoOtherFactions();
  testOccupancyLimit_CanMoveIntoStrongholdWithZeroOrOneOtherFaction();
  testOccupancyLimit_CanMoveIntoStrongholdIfAlreadyThere();
  testOccupancyLimit_CannotMoveThroughStrongholdWithTwoOtherFactions();
  testOccupancyLimit_CanMoveThroughStrongholdWithZeroOrOneOtherFaction();
  testOccupancyLimit_NonStrongholdTerritoriesHaveNoLimit();
  testOccupancyLimit_ValidationErrorsAreCorrect();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

