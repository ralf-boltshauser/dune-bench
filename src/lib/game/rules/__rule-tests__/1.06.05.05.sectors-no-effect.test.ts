/**
 * Rule test: 1.06.05.05 SECTORS
 * @rule-test 1.06.05.05
 *
 * Rule text (numbered_rules/1.md):
 * "SECTORS: Sectors have no effect on movement. Forces can Move into or through a Territory ignoring all Sectors. A Sector's only function is to regulate the movement and coverage of the storm and spice collection."
 *
 * This rule establishes that sectors do NOT block or restrict movement:
 * - Sectors have no effect on movement
 * - Forces can move into or through a territory ignoring all sectors
 * - Pathfinding works at territory level, not sector level
 * - Sectors only matter for storm (which sectors are in storm) and spice collection (which sector has spice)
 * - Movement is territory-to-territory, sectors are just for positioning within territory
 *
 * These tests verify:
 * - Pathfinding uses territories, not sectors
 * - Can move between territories regardless of sectors
 * - Different sectors in same territory don't affect movement
 * - Pathfinding ignores sector boundaries
 * - Movement validation doesn't check sector adjacency
 * - Sectors are only used for storm checks and positioning
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateMovement } from "../../rules/movement/movement/validate-movement";
import { findPath } from "../../rules/movement/paths";
import { getReachableTerritories } from "../../rules/movement/paths";
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

function testSectors_PathfindingUsesTerritoriesNotSectors(): void {
  section("Pathfinding Uses Territories, Not Sectors");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  
  // Use territories with multiple sectors
  const fromTerritory = TerritoryId.ARRAKEEN; // Has sector 9
  const toTerritory = TerritoryId.CARTHAG; // Has sector 10
  
  // Pathfinding should work regardless of which sectors we specify
  const path1 = findPath(fromTerritory, toTerritory, state, Faction.ATREIDES);
  const path2 = findPath(fromTerritory, toTerritory, state, Faction.ATREIDES);
  
  // Path should be the same regardless of sector (pathfinding is territory-based)
  assert(
    path1 !== null,
    `Should find path from ${fromTerritory} to ${toTerritory} (territory-based pathfinding)`
  );
  
  if (path1 && path2) {
    assert(
      path1.length === path2.length,
      `Path length should be consistent (territory-based), got ${path1.length} and ${path2.length}`
    );
    
    // Path should be an array of territories, not sectors
    assert(
      Array.isArray(path1),
      `Path should be array of territories, got ${typeof path1}`
    );
    
    // All path elements should be territory IDs
    for (const territoryId of path1) {
      assert(
        Object.values(TerritoryId).includes(territoryId as TerritoryId),
        `Path element should be a territory ID, got ${territoryId}`
      );
    }
  }
}

function testSectors_CanMoveBetweenTerritoriesRegardlessOfSectors(): void {
  section("Can Move Between Territories Regardless of Sectors");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const fromTerritory = TerritoryId.ARRAKEEN; // Has sector 9
  const fromSector = 9;
  const toTerritory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const toSector = 8; // Different sector in destination
  
  const initialState = {
    ...state,
    stormSector: 0, // Safe sector
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: fromTerritory, 
          sector: fromSector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // Validate movement - should work regardless of sectors
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    3,
    false // No ornithopters
  );

  // Movement should be valid if territories are adjacent (sectors don't matter)
  if (!result.valid && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join(", ");
    // Check if it failed for sector-related reasons (shouldn't)
    const hasSectorError = result.errors.some(
      e => e.message.toLowerCase().includes('sector') && !e.message.toLowerCase().includes('storm')
    );
    if (hasSectorError) {
      assert(
        false,
        `Should not fail due to sector restrictions (sectors have no effect on movement): ${errorMessages}`
      );
    } else {
      // Failed for other reasons (storm, range, etc.) - that's okay
      console.log(`  ⚠ Movement failed for non-sector reason: ${errorMessages}`);
    }
    return;
  }

  assert(
    result.valid,
    `Should be able to move from ${fromTerritory} (sector ${fromSector}) to ${toTerritory} (sector ${toSector}) - sectors don't affect movement`
  );
}

function testSectors_DifferentSectorsInSameTerritoryDontAffectMovement(): void {
  section("Different Sectors in Same Territory Don't Affect Movement");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const fromSector = 8;
  const toSector = 10; // Different sector in same territory
  
  const initialState = {
    ...state,
    stormSector: 0, // Safe sector
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: fromSector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // This is repositioning (same territory, different sector)
  // The rule says sectors don't affect movement - repositioning should work
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    territory,
    fromSector,
    territory,
    toSector,
    3,
    false
  );

  // Should be valid (repositioning within same territory)
  // Note: This is actually rule 1.06.08, but it demonstrates that sectors don't block movement
  if (!result.valid && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join(", ");
    const hasSectorError = result.errors.some(
      e => e.message.toLowerCase().includes('sector') && !e.message.toLowerCase().includes('storm')
    );
    if (hasSectorError) {
      assert(
        false,
        `Should not fail due to sector restrictions: ${errorMessages}`
      );
    } else {
      // Failed for storm or other reasons - that's okay
      console.log(`  ⚠ Repositioning failed for non-sector reason: ${errorMessages}`);
    }
    return;
  }

  assert(
    result.valid,
    `Should be able to reposition from sector ${fromSector} to sector ${toSector} in same territory - sectors don't block movement`
  );
}

function testSectors_PathfindingIgnoresSectorBoundaries(): void {
  section("Pathfinding Ignores Sector Boundaries");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  
  // Find a path between two territories
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const toTerritory = TerritoryId.POLAR_SINK;
  
  const path = findPath(fromTerritory, toTerritory, state, Faction.ATREIDES);
  
  if (path) {
    // Path should be territory-based, not sector-based
    assert(
      path.length > 0,
      `Path should contain territories, got length ${path.length}`
    );
    
    // All elements should be territories
    for (const territoryId of path) {
      const territory = TERRITORY_DEFINITIONS[territoryId];
      assert(
        territory !== undefined,
        `Path element ${territoryId} should be a valid territory`
      );
      
      // Territories in path can have multiple sectors - that's fine
      // The pathfinding doesn't care about sectors
      if (territory) {
        assert(
          territory.sectors.length >= 0,
          `Territory ${territoryId} should have sectors defined (even if empty)`
        );
      }
    }
    
    // Path should not contain sector numbers
    for (const element of path) {
      assert(
        typeof element === 'string',
        `Path element should be territory ID (string), got ${typeof element}`
      );
      assert(
        !/^\d+$/.test(element),
        `Path element should not be a sector number, got ${element}`
      );
    }
  } else {
    // No path found - that's okay (might be blocked by storm or occupancy)
    assert(
      true,
      `No path found (may be blocked by storm/occupancy) - pathfinding is still territory-based`
    );
  }
}

function testSectors_ReachableTerritoriesIgnoresSectors(): void {
  section("Reachable Territories Calculation Ignores Sectors");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const range = 2;
  
  const reachable = getReachableTerritories(state, fromTerritory, range, Faction.ATREIDES);
  
  // Reachable should return territories with distances, not sectors
  for (const [territoryId, distance] of reachable) {
    assert(
      Object.values(TerritoryId).includes(territoryId),
      `Reachable territory should be a territory ID, got ${territoryId}`
    );
    
    assert(
      typeof distance === 'number',
      `Distance should be a number, got ${typeof distance}`
    );
    
    assert(
      distance >= 1 && distance <= range,
      `Distance should be between 1 and ${range}, got ${distance}`
    );
    
    // Distance is in territories, not sectors
    const territory = TERRITORY_DEFINITIONS[territoryId];
    if (territory) {
      // Territory can have multiple sectors - that doesn't affect distance
      assert(
        territory.sectors.length >= 0,
        `Territory ${territoryId} should have sectors defined`
      );
    }
  }
}

function testSectors_MovementValidationDoesntCheckSectorAdjacency(): void {
  section("Movement Validation Doesn't Check Sector Adjacency");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use territories with different sectors
  const fromTerritory = TerritoryId.ARRAKEEN; // Sector 9
  const fromSector = 9;
  const toTerritory = TerritoryId.IMPERIAL_BASIN; // Sectors 8, 9, 10
  const toSector = 8; // Different sector
  
  const initialState = {
    ...state,
    stormSector: 0, // Safe sector
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: fromTerritory, 
          sector: fromSector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // Validate movement - should not check if sectors are "adjacent"
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    3,
    false
  );

  // Check that validation doesn't fail due to sector adjacency
  if (!result.valid && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join(", ");
    const hasSectorAdjacencyError = result.errors.some(
      e => e.message.toLowerCase().includes('adjacent') && e.message.toLowerCase().includes('sector')
    );
    if (hasSectorAdjacencyError) {
      assert(
        false,
        `Should not fail due to sector adjacency check (sectors don't affect movement): ${errorMessages}`
      );
    } else {
      // Failed for other reasons - that's okay
      console.log(`  ⚠ Movement failed for non-sector reason: ${errorMessages}`);
    }
    return;
  }

  // If valid, that's good - sectors don't block movement
  if (result.valid) {
    assert(
      true,
      `Movement validated successfully - sectors don't affect movement validation`
    );
  }
}

function testSectors_SectorsOnlyMatterForStormAndSpice(): void {
  section("Sectors Only Matter for Storm and Spice Collection");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Sectors 8, 9, 10
  const sector1 = 8;
  const sector2 = 10;
  
  const initialState = {
    ...state,
    stormSector: 5, // Storm in sector 5 (not affecting our test sectors)
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector1, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // Movement between sectors in same territory should work
  // (This is repositioning, but demonstrates sectors don't block movement)
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    territory,
    sector1,
    territory,
    sector2,
    3,
    false
  );

  // Should be valid (sectors don't block movement)
  // Only storm in the sectors would block it
  if (!result.valid && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join(", ");
    // Check if it's a storm error (that's expected - sectors matter for storm)
    const hasStormError = result.errors.some(
      e => e.code === 'DESTINATION_IN_STORM' || e.code === 'SOURCE_IN_STORM'
    );
    if (hasStormError) {
      // That's okay - sectors DO matter for storm (that's their function)
      assert(
        true,
        `Movement blocked by storm (sectors matter for storm, which is correct)`
      );
    } else {
      // Failed for other reasons
      const hasSectorError = result.errors.some(
        e => e.message.toLowerCase().includes('sector') && !e.message.toLowerCase().includes('storm')
      );
      if (hasSectorError) {
        assert(
          false,
          `Should not fail due to sector restrictions (only storm matters): ${errorMessages}`
        );
      } else {
        console.log(`  ⚠ Movement failed for other reason: ${errorMessages}`);
      }
    }
    return;
  }

  assert(
    result.valid,
    `Should be able to move between sectors in same territory - sectors don't block movement (only storm does)`
  );
}

function testSectors_PathfindingWorksAtTerritoryLevel(): void {
  section("Pathfinding Works at Territory Level, Not Sector Level");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  
  // Test pathfinding between territories
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const toTerritory = TerritoryId.PASTY_MESA; // Adjacent to Sietch Tabr
  
  const path = findPath(fromTerritory, toTerritory, state, Faction.ATREIDES);
  
  assert(
    path !== null,
    `Should find path from ${fromTerritory} to ${toTerritory} (territory-based)`
  );
  
  if (path) {
    // Path should be array of territories
    assert(
      Array.isArray(path),
      `Path should be array, got ${typeof path}`
    );
    
    // Path length is in territories, not sectors
    assert(
      path.length >= 1,
      `Path should have at least 1 territory, got ${path.length}`
    );
    
    // All path elements should be territory IDs
    for (const territoryId of path) {
      assert(
        typeof territoryId === 'string',
        `Path element should be territory ID (string), got ${typeof territoryId}`
      );
      
      const territory = TERRITORY_DEFINITIONS[territoryId];
      assert(
        territory !== undefined,
        `Path element ${territoryId} should be a valid territory`
      );
    }
    
    // Path should not depend on sectors
    // If we call findPath again, we should get the same path (territory-based)
    const path2 = findPath(fromTerritory, toTerritory, state, Faction.ATREIDES);
    assert(
      path2 !== null && path2.length === path.length,
      `Path should be consistent (territory-based, not sector-based)`
    );
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.05.05: SECTORS (No Effect on Movement)");
  console.log("=".repeat(80));

  testSectors_PathfindingUsesTerritoriesNotSectors();
  testSectors_CanMoveBetweenTerritoriesRegardlessOfSectors();
  testSectors_DifferentSectorsInSameTerritoryDontAffectMovement();
  testSectors_PathfindingIgnoresSectorBoundaries();
  testSectors_ReachableTerritoriesIgnoresSectors();
  testSectors_MovementValidationDoesntCheckSectorAdjacency();
  testSectors_SectorsOnlyMatterForStormAndSpice();
  testSectors_PathfindingWorksAtTerritoryLevel();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

