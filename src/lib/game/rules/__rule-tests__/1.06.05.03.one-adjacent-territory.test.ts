/**
 * Rule test: 1.06.05.03 ONE ADJACENT TERRITORY
 * @rule-test 1.06.05.03
 *
 * Rule text (numbered_rules/1.md):
 * "ONE ADJACENT TERRITORY: A player without a Force in either Arrakeen or Carthag at the start of their movement can only Move their Forces to one adjacent Territory."
 *
 * This rule establishes the base movement range for players without ornithopters:
 * - Movement range is 1 territory (one adjacent territory)
 * - Checked at "start of movement" (phase start) - ornithopter access is determined then
 * - Without forces in Arrakeen/Carthag = no ornithopters = range 1
 * - Can move to adjacent territory (distance 1)
 * - Cannot move to territories 2+ steps away
 * - Pathfinding respects this limit
 * - Validation rejects moves beyond 1 territory
 *
 * Note: Fremen get 2 territories base (Rule 2.04.06), but this rule applies to all other factions.
 * Note: Ornithopters grant 3 territories (Rule 1.06.05.04), but this rule is for players WITHOUT ornithopters.
 *
 * These tests verify:
 * - Normal faction without ornithopters has range 1
 * - Can move to adjacent territory (validation passes)
 * - Cannot move to territory 2 steps away (validation fails)
 * - Cannot move to territory 3+ steps away (validation fails)
 * - Pathfinding only finds territories within 1 step
 * - getMovementRangeForFaction returns 1 for normal faction without ornithopters
 * - checkOrnithopterAccess returns false when no forces in Arrakeen/Carthag
 * - Movement validation uses the correct range
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { validateMovement } from "../../rules/movement/movement/validate-movement";
import { getMovementRangeForFaction } from "../../rules/movement/ornithopter/range";
import { checkOrnithopterAccess } from "../../rules/movement/ornithopter/access";
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
    stormSector: 5, // Storm not blocking our test territories
  };
}

/**
 * Get an adjacent territory to a given territory
 */
function getAdjacentTerritory(territoryId: TerritoryId): TerritoryId | null {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory || territory.adjacentTerritories.length === 0) {
    return null;
  }
  return territory.adjacentTerritories[0];
}

/**
 * Get a territory 2 steps away (via an intermediate territory)
 */
function getTerritoryTwoStepsAway(territoryId: TerritoryId): TerritoryId | null {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory || territory.adjacentTerritories.length === 0) {
    return null;
  }
  
  const firstAdjacent = territory.adjacentTerritories[0];
  const firstAdjacentDef = TERRITORY_DEFINITIONS[firstAdjacent];
  if (!firstAdjacentDef || firstAdjacentDef.adjacentTerritories.length === 0) {
    return null;
  }
  
  // Find a territory adjacent to the first adjacent (but not the original)
  for (const secondAdjacent of firstAdjacentDef.adjacentTerritories) {
    if (secondAdjacent !== territoryId) {
      return secondAdjacent;
    }
  }
  
  return null;
}

// =============================================================================
// Tests
// =============================================================================

function testOneAdjacent_RangeIsOne(): void {
  section("Normal Faction Without Ornithopters Has Range 1");

  // Test various non-Fremen factions
  const factions = [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.BENE_GESSERIT];
  
  for (const faction of factions) {
    const range = getMovementRangeForFaction(faction, false);
    assert(
      range === 1,
      `${faction} without ornithopters has range 1, got ${range}`
    );
  }
}

function testOneAdjacent_NoOrnithoptersWhenNoForcesInArrakeenCarthag(): void {
  section("No Ornithopters When No Forces in Arrakeen/Carthag");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Set up: Forces in a territory that is NOT Arrakeen or Carthag
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: TerritoryId.SIETCH_TABR, // Not Arrakeen or Carthag
          sector: 5, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  const hasOrnithopters = checkOrnithopterAccess(initialState, Faction.ATREIDES);
  assert(
    !hasOrnithopters,
    `Should not have ornithopters when forces are in Sietch Tabr (not Arrakeen/Carthag)`
  );
}

function testOneAdjacent_CanMoveToAdjacentTerritory(): void {
  section("Can Move to Adjacent Territory (Distance 1)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use Sietch Tabr (sector 13) and PASTY_MESA (adjacent, protected from storm)
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const fromSector = 13; // Sietch Tabr's sector
  const toTerritory = TerritoryId.PASTY_MESA; // Adjacent to Sietch Tabr
  const toTerritoryDef = TERRITORY_DEFINITIONS[toTerritory];
  const toSector = toTerritoryDef?.sectors[0] ?? 1;
  
  // Set storm to a safe sector (not blocking our test territories)
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

  // Validate movement to adjacent territory (should pass)
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

  if (!result.valid && result.errors.length > 0) {
    // Log errors for debugging
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join(", ");
    assert(
      false,
      `Should be able to move to adjacent territory ${toTerritory} from ${fromTerritory}, but got errors: ${errorMessages}`
    );
    return;
  }

  assert(
    result.valid,
    `Should be able to move to adjacent territory ${toTerritory} from ${fromTerritory}`
  );
  
  if (result.valid && result.context) {
    assert(
      result.context.movementRange === 1,
      `Movement range should be 1, got ${result.context.movementRange}`
    );
    assert(
      result.context.pathLength === 1,
      `Path length should be 1 (adjacent), got ${result.context.pathLength}`
    );
  }
}

function testOneAdjacent_CannotMoveTwoStepsAway(): void {
  section("Cannot Move to Territory 2 Steps Away");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use Sietch Tabr -> PASTY_MESA -> POLAR_SINK (2 steps)
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const fromSector = 13;
  const toTerritory = TerritoryId.POLAR_SINK; // 2 steps via PASTY_MESA
  const toTerritoryDef = TERRITORY_DEFINITIONS[toTerritory];
  const toSector = 0; // Polar Sink uses sector 0
  
  // Set storm to a safe sector
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

  // Validate movement to territory 2 steps away (should fail)
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

  assert(
    !result.valid,
    `Should NOT be able to move to territory 2 steps away ${toTerritory} from ${fromTerritory}`
  );
  
  if (!result.valid && result.errors.length > 0) {
    const hasRangeError = result.errors.some(
      e => e.code === 'EXCEEDS_MOVEMENT_RANGE' || e.message.toLowerCase().includes('range') || e.message.toLowerCase().includes('territories away')
    );
    assert(
      hasRangeError,
      `Should have range error when trying to move 2 steps away. Errors: ${result.errors.map(e => e.code).join(", ")}`
    );
  }
}

function testOneAdjacent_PathfindingRespectsRange(): void {
  section("Pathfinding Only Finds Territories Within Range 1");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Set up: Forces in a territory (not Arrakeen/Carthag)
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const fromSector = 5;
  
  const initialState = {
    ...state,
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

  // Get reachable territories with range 1
  const reachable = getReachableTerritories(initialState, fromTerritory, 1, Faction.ATREIDES);
  
  // All reachable territories should be at distance 1
  for (const [territoryId, distance] of reachable) {
    assert(
      distance === 1,
      `Reachable territory ${territoryId} should be at distance 1, got ${distance}`
    );
  }
  
  // Should have at least one adjacent territory
  const territory = TERRITORY_DEFINITIONS[fromTerritory];
  if (territory && territory.adjacentTerritories.length > 0) {
    assert(
      reachable.size > 0,
      `Should find at least one reachable territory from ${fromTerritory}`
    );
  }
}

function testOneAdjacent_ValidationUsesCorrectRange(): void {
  section("Validation Uses Correct Range (1) for Non-Ornithopter Faction");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Use Sietch Tabr -> PASTY_MESA (adjacent)
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const fromSector = 13;
  const toTerritory = TerritoryId.PASTY_MESA;
  const toTerritoryDef = TERRITORY_DEFINITIONS[toTerritory];
  const toSector = toTerritoryDef?.sectors[0] ?? 1;
  
  // Set storm to a safe sector
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

  // Validate with explicit hasOrnithoptersOverride = false
  const result = validateMovement(
    initialState,
    Faction.ATREIDES,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    3,
    false // Explicitly no ornithopters
  );

  if (!result.valid && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => `${e.code}: ${e.message}`).join(", ");
    assert(
      false,
      `Validation should pass for adjacent territory movement, but got errors: ${errorMessages}`
    );
    return;
  }

  assert(
    result.valid,
    `Validation should pass for adjacent territory movement`
  );
  
  if (result.valid && result.context) {
    assert(
      result.context.movementRange === 1,
      `Validation context should show movementRange = 1, got ${result.context.movementRange}`
    );
    assert(
      result.context.hasOrnithopters === false,
      `Validation context should show hasOrnithopters = false`
    );
  }
}

function testOneAdjacent_CheckedAtPhaseStart(): void {
  section("Range Checked at Phase Start (Ornithopter Access Determined Then)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  // Set up: Forces in a territory (not Arrakeen/Carthag) at phase start
  const fromTerritory = TerritoryId.SIETCH_TABR;
  const fromSector = 5;
  
  const initialState = {
    ...state,
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

  // Check ornithopter access (simulating phase start check)
  const hasOrnithopters = checkOrnithopterAccess(initialState, Faction.ATREIDES);
  assert(
    !hasOrnithopters,
    `Should not have ornithopters at phase start when forces are not in Arrakeen/Carthag`
  );
  
  // Range should be 1 based on phase start check
  const range = getMovementRangeForFaction(Faction.ATREIDES, hasOrnithopters);
  assert(
    range === 1,
    `Range should be 1 when no ornithopters at phase start, got ${range}`
  );
}

function testOneAdjacent_AppliesToAllNonFremenFactions(): void {
  section("Rule Applies to All Non-Fremen Factions");

  // Test that all standard factions get range 1 without ornithopters
  // (Fremen get 2, which is rule 2.04.06, not this rule)
  const nonFremenFactions = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.BENE_GESSERIT,
    Faction.SPACING_GUILD,
  ];
  
  for (const faction of nonFremenFactions) {
    const range = getMovementRangeForFaction(faction, false);
    assert(
      range === 1,
      `${faction} without ornithopters should have range 1, got ${range}`
    );
  }
  
  // Verify Fremen is different (2 territories, not 1)
  const fremenRange = getMovementRangeForFaction(Faction.FREMEN, false);
  assert(
    fremenRange === 2,
    `Fremen without ornithopters should have range 2 (Rule 2.04.06), got ${fremenRange}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.05.03: ONE ADJACENT TERRITORY");
  console.log("=".repeat(80));

  testOneAdjacent_RangeIsOne();
  testOneAdjacent_NoOrnithoptersWhenNoForcesInArrakeenCarthag();
  testOneAdjacent_CanMoveToAdjacentTerritory();
  testOneAdjacent_CannotMoveTwoStepsAway();
  testOneAdjacent_PathfindingRespectsRange();
  testOneAdjacent_ValidationUsesCorrectRange();
  testOneAdjacent_CheckedAtPhaseStart();
  testOneAdjacent_AppliesToAllNonFremenFactions();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

