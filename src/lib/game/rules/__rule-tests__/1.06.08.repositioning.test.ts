/**
 * Rule test: 1.06.08 REPOSITIONING
 * @rule-test 1.06.08
 *
 * Rule text (numbered_rules/1.md):
 * "Repositioning: A player may use their movement action to reposition their Forces to relocate to a different Sector within the same Territory. Storm limitations still apply."
 *
 * This rule establishes that players can reposition forces within the same territory:
 * - Can move forces to a different sector within the same territory
 * - Must specify different sector (cannot move to same sector)
 * - Storm limitations still apply (cannot move from/to storm sectors)
 * - No pathfinding needed (same territory)
 * - No movement range limit (same territory)
 * - Sector must be valid for the territory
 *
 * These tests verify:
 * - Can reposition to different sector in same territory
 * - Cannot reposition to same sector (must be different)
 * - Storm limitations apply (cannot move from/to storm sectors)
 * - Sector must be valid for territory
 * - No pathfinding required (same territory)
 * - No movement range limit (same territory)
 * - Forces correctly moved between sectors
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateMovement } from "../../rules/movement/movement/validate-movement";
import { moveForces } from "../../state/mutations/forces";
import { validateSector } from "../../rules/movement/territory-rules/validation";
import { validateSourceSectorNotInStorm, validateDestinationSectorNotInStorm } from "../../rules/storm-validation";
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

function testRepositioning_CanRepositionToDifferentSectorInSameTerritory(): void {
  section("Can Reposition to Different Sector in Same Territory");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 2) {
    assert(
      false,
      `Territory ${territory} should have multiple sectors for this test`
    );
    return;
  }
  
  const fromSector = territoryDef.sectors[0];
  const toSector = territoryDef.sectors[1];
  
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

  // Test validation - should be valid (repositioning within same territory)
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
  
  assert(
    result.valid,
    `Should be able to reposition from sector ${fromSector} to sector ${toSector} in same territory`
  );
  
  // Test actual movement
  const movedState = moveForces(
    initialState,
    Faction.ATREIDES,
    territory,
    fromSector,
    territory,
    toSector,
    3,
    false
  );
  
  // Verify forces moved
  const finalAtreidesState = getFactionState(movedState, Faction.ATREIDES);
  const forcesInFromSector = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === territory && s.sector === fromSector
  );
  const forcesInToSector = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === territory && s.sector === toSector
  );
  
  // From sector should have remaining forces (5 - 3 = 2)
  const fromForces = forcesInFromSector.reduce((sum, stack) => 
    sum + stack.forces.regular + stack.forces.elite, 0
  );
  assert(
    fromForces === 2,
    `From sector should have 2 forces remaining, got ${fromForces}`
  );
  
  // To sector should have moved forces
  const toForces = forcesInToSector.reduce((sum, stack) => 
    sum + stack.forces.regular + stack.forces.elite, 0
  );
  assert(
    toForces === 3,
    `To sector should have 3 forces, got ${toForces}`
  );
}

function testRepositioning_CannotRepositionToSameSector(): void {
  section("Cannot Reposition to Same Sector (Must Be Different)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 1) {
    assert(
      false,
      `Territory ${territory} should have at least one sector for this test`
    );
    return;
  }
  
  const sector = territoryDef.sectors[0];
  
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
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  // Test validation - should be invalid (same sector)
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    territory,
    sector,
    territory,
    sector, // Same sector!
    3,
    false
  );
  
  assert(
    !result.valid,
    `Should NOT be able to reposition to same sector`
  );
  
  assert(
    result.errors.some(e => 
      e.code === 'INVALID_DESTINATION' ||
      e.message.toLowerCase().includes('different sector') ||
      e.message.toLowerCase().includes('repositioning')
    ),
    `Should have error about different sector requirement: ${result.errors.map(e => e.message).join(", ")}`
  );
}

function testRepositioning_StormLimitationsApply(): void {
  section("Storm Limitations Apply (Cannot Move From/To Storm Sectors)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 2) {
    assert(
      false,
      `Territory ${territory} should have multiple sectors for this test`
    );
    return;
  }
  
  const fromSector = territoryDef.sectors[0];
  const toSector = territoryDef.sectors[1];
  const stormSector = fromSector; // Storm is on from sector
  
  const initialState = {
    ...state,
    stormSector,
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

  // Test 1: Cannot move FROM storm sector
  const sourceValidation = validateSourceSectorNotInStorm(
    initialState,
    Faction.ATREIDES,
    territory,
    fromSector
  );
  
  assert(
    sourceValidation !== null,
    `Should NOT be able to move FROM storm sector ${fromSector}`
  );
  
  if (sourceValidation) {
    assert(
      sourceValidation.message.toLowerCase().includes('storm') ||
      sourceValidation.message.toLowerCase().includes('cannot move'),
      `Error message should mention storm: ${sourceValidation.message}`
    );
  }
  
  // Test 2: Cannot move TO storm sector
  const destValidation = validateDestinationSectorNotInStorm(
    initialState,
    territory,
    stormSector,
    'toSector',
    'reposition to'
  );
  
  assert(
    destValidation !== null,
    `Should NOT be able to move TO storm sector ${stormSector}`
  );
  
  if (destValidation) {
    assert(
      destValidation.message.toLowerCase().includes('storm') ||
      destValidation.message.toLowerCase().includes('reposition') ||
      destValidation.message.toLowerCase().includes('cannot'),
      `Error message should mention storm: ${destValidation.message}`
    );
  }
  
  // Test 3: Full validation should reject repositioning from storm sector
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
  
  assert(
    !result.valid,
    `Should NOT be able to reposition FROM storm sector`
  );
  
  assert(
    result.errors.some(e => 
      e.code === 'SOURCE_IN_STORM' ||
      e.message.toLowerCase().includes('storm')
    ),
    `Should have storm error: ${result.errors.map(e => e.message).join(", ")}`
  );
}

function testRepositioning_SectorMustBeValidForTerritory(): void {
  section("Sector Must Be Valid for Territory");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 1) {
    assert(
      false,
      `Territory ${territory} should have at least one sector for this test`
    );
    return;
  }
  
  const fromSector = territoryDef.sectors[0];
  const invalidSector = 999; // Invalid sector (not in territory)
  
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

  // Test sector validation
  const sectorValidation = validateSector(invalidSector, territory, 'toSector');
  assert(
    !sectorValidation.valid,
    `Invalid sector ${invalidSector} should fail validation for ${territory}`
  );
  
  // Test full validation
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    territory,
    fromSector,
    territory,
    invalidSector,
    3,
    false
  );
  
  assert(
    !result.valid,
    `Should NOT be able to reposition to invalid sector`
  );
  
  assert(
    result.errors.some(e => 
      e.code === 'INVALID_SECTOR' ||
      e.message.toLowerCase().includes('invalid sector') ||
      e.message.toLowerCase().includes('not valid') ||
      e.message.toLowerCase().includes('not part of') ||
      e.message.toLowerCase().includes('is not')
    ),
    `Should have invalid sector error: ${result.errors.map(e => e.message).join(", ")}`
  );
}

function testRepositioning_NoPathfindingRequired(): void {
  section("No Pathfinding Required (Same Territory)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 2) {
    assert(
      false,
      `Territory ${territory} should have multiple sectors for this test`
    );
    return;
  }
  
  const fromSector = territoryDef.sectors[0];
  const toSector = territoryDef.sectors[1];
  
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

  // Test validation - should be valid (no pathfinding needed)
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
  
  assert(
    result.valid,
    `Should be able to reposition without pathfinding (same territory)`
  );
  
  // Verify no pathfinding errors
  assert(
    !result.errors.some(e => 
      e.code === 'NO_PATH_AVAILABLE' ||
      e.code === 'EXCEEDS_MOVEMENT_RANGE'
    ),
    `Should NOT have pathfinding or range errors for repositioning: ${result.errors.map(e => e.code).join(", ")}`
  );
}

function testRepositioning_NoMovementRangeLimit(): void {
  section("No Movement Range Limit (Same Territory)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 2) {
    assert(
      false,
      `Territory ${territory} should have multiple sectors for this test`
    );
    return;
  }
  
  const fromSector = territoryDef.sectors[0];
  const toSector = territoryDef.sectors[territoryDef.sectors.length - 1]; // Last sector
  
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

  // Test validation - should be valid regardless of sector distance
  // (No movement range limit for repositioning)
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
  
  assert(
    result.valid,
    `Should be able to reposition to any sector in same territory (no range limit)`
  );
  
  // Verify no range errors
  assert(
    !result.errors.some(e => 
      e.code === 'EXCEEDS_MOVEMENT_RANGE'
    ),
    `Should NOT have range error for repositioning: ${result.errors.map(e => e.code).join(", ")}`
  );
}

function testRepositioning_ForcesCorrectlyMovedBetweenSectors(): void {
  section("Forces Correctly Moved Between Sectors");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const territoryDef = TERRITORY_DEFINITIONS[territory];
  
  if (territoryDef.sectors.length < 2) {
    assert(
      false,
      `Territory ${territory} should have multiple sectors for this test`
    );
    return;
  }
  
  const fromSector = territoryDef.sectors[0];
  const toSector = territoryDef.sectors[1];
  
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
          forces: { regular: 5, elite: 2 } 
        }],
      },
    })),
  };

  // Verify initial state
  const initialAtreidesState = getFactionState(initialState, Faction.ATREIDES);
  const initialForcesInFromSector = initialAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === territory && s.sector === fromSector
  );
  const initialForcesInToSector = initialAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === territory && s.sector === toSector
  );
  
  const initialFromForces = initialForcesInFromSector.reduce((sum, stack) => 
    sum + stack.forces.regular + stack.forces.elite, 0
  );
  const initialToForces = initialForcesInToSector.reduce((sum, stack) => 
    sum + stack.forces.regular + stack.forces.elite, 0
  );
  
  assert(
    initialFromForces === 7,
    `Initial state should have 7 forces in from sector, got ${initialFromForces}`
  );
  assert(
    initialToForces === 0,
    `Initial state should have 0 forces in to sector, got ${initialToForces}`
  );
  
  // Move 3 forces
  const movedState = moveForces(
    initialState,
    Faction.ATREIDES,
    territory,
    fromSector,
    territory,
    toSector,
    3,
    false
  );
  
  // Verify forces moved
  const finalAtreidesState = getFactionState(movedState, Faction.ATREIDES);
  const finalForcesInFromSector = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === territory && s.sector === fromSector
  );
  const finalForcesInToSector = finalAtreidesState.forces.onBoard.filter(
    (s) => s.territoryId === territory && s.sector === toSector
  );
  
  const finalFromForces = finalForcesInFromSector.reduce((sum, stack) => 
    sum + stack.forces.regular + stack.forces.elite, 0
  );
  const finalToForces = finalForcesInToSector.reduce((sum, stack) => 
    sum + stack.forces.regular + stack.forces.elite, 0
  );
  
  assert(
    finalFromForces === 4,
    `From sector should have 4 forces remaining (7 - 3 = 4), got ${finalFromForces}`
  );
  assert(
    finalToForces === 3,
    `To sector should have 3 forces, got ${finalToForces}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.08: REPOSITIONING");
  console.log("=".repeat(80));

  testRepositioning_CanRepositionToDifferentSectorInSameTerritory();
  testRepositioning_CannotRepositionToSameSector();
  testRepositioning_StormLimitationsApply();
  testRepositioning_SectorMustBeValidForTerritory();
  testRepositioning_NoPathfindingRequired();
  testRepositioning_NoMovementRangeLimit();
  testRepositioning_ForcesCorrectlyMovedBetweenSectors();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

