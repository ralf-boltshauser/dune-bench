/**
 * Rule test: 1.06.04 RESTRICTION
 * @rule-test 1.06.04
 *
 * Rule text (numbered_rules/1.md):
 * "Restriction: No player may ship Forces from the board back to their reserves."
 *
 * This rule prevents normal shipment from board to reserves.
 * Exception: Guild has special ability (2.06.05.03) to ship from board to reserves.
 *
 * These tests verify:
 * - Normal shipment only works from reserves to board
 * - Cannot use normal shipment to move forces from board to reserves
 * - The shipForces function only moves from reserves to board
 * - Validation enforces this restriction
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { shipForces, getFactionState, sendForcesToReserves } from "../../state";
import { validateShipment } from "../../rules/movement/shipment/validate-shipment";

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
  };
}

function getNonStrongholdTerritory(): TerritoryId {
  return TerritoryId.CIELAGO_NORTH;
}

// =============================================================================
// Tests
// =============================================================================

function testNoShipmentFromBoard_ShipForcesOnlyFromReserves(): void {
  section("shipForces Only Works From Reserves to Board");

  const state = buildBaseState();
  const faction = Faction.ATREIDES;
  const factionState = getFactionState(state, faction);
  
  // Set up: forces on board, forces in reserves
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(faction, {
      ...factionState,
      forces: {
        ...factionState.forces,
        reserves: { regular: 10, elite: 0 },
        onBoard: [{ 
          factionId: faction, 
          territoryId: TerritoryId.ARRAKEEN, 
          sector: 9, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  const territoryId = getNonStrongholdTerritory();
  const sector = 1;
  const count = 3;

  // shipForces should move from reserves to board
  const newState = shipForces(initialState, faction, territoryId, sector, count);
  const newFactionState = getFactionState(newState, faction);

  // Reserves should decrease
  assert(
    newFactionState.forces.reserves.regular === 7,
    `Reserves should decrease by ${count}, got ${newFactionState.forces.reserves.regular} (expected 7)`
  );

  // Forces on board at original location should remain
  const originalStack = newFactionState.forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 9
  );
  assert(
    originalStack !== undefined,
    `Forces at original location should remain`
  );
  assert(
    originalStack?.forces.regular === 5,
    `Forces at original location should remain 5, got ${originalStack?.forces.regular}`
  );

  // New forces should be added to target territory
  const newStack = newFactionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  assert(
    newStack !== undefined,
    `Should have new force stack at ${territoryId} sector ${sector}`
  );
  assert(
    newStack?.forces.regular === count,
    `New stack should have ${count} forces, got ${newStack?.forces.regular}`
  );
}

function testNoShipmentFromBoard_SendForcesToReservesIsSeparateFunction(): void {
  section("sendForcesToReserves Is Separate (Guild Only)");

  const state = buildBaseState();
  const faction = Faction.ATREIDES;
  const factionState = getFactionState(state, faction);
  
  // Set up: forces on board
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(faction, {
      ...factionState,
      forces: {
        ...factionState.forces,
        onBoard: [{ 
          factionId: faction, 
          territoryId: TerritoryId.ARRAKEEN, 
          sector: 9, 
          forces: { regular: 5, elite: 0 } 
        }],
        reserves: { regular: 0, elite: 0 },
      },
    })),
  };

  const territoryId = TerritoryId.ARRAKEEN;
  const sector = 9;
  const count = 3;

  // sendForcesToReserves is a separate function (used by Guild's special ability)
  // This demonstrates that normal shipment (shipForces) cannot do this
  const newState = sendForcesToReserves(initialState, faction, territoryId, sector, count);
  const newFactionState = getFactionState(newState, faction);

  // Forces should be removed from board
  const boardStack = newFactionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  assert(
    boardStack === undefined || boardStack.forces.regular === 2,
    `Forces should be removed from board (or reduced to 2 if partial)`
  );

  // Forces should be added to reserves
  assert(
    newFactionState.forces.reserves.regular === count,
    `Reserves should increase by ${count}, got ${newFactionState.forces.reserves.regular}`
  );

  // This function exists but is NOT part of normal shipment validation
  // Normal shipment (validateShipment) only validates reserves -> board
}

function testNoShipmentFromBoard_ValidationOnlyAllowsReservesToBoard(): void {
  section("Validation Only Allows Reserves to Board");

  const state = buildBaseState();
  const faction = Faction.ATREIDES;
  const factionState = getFactionState(state, faction);
  
  // Set up: forces in reserves (can ship)
  const stateWithReserves = {
    ...state,
    factions: new Map(state.factions.set(faction, {
      ...factionState,
      forces: {
        ...factionState.forces,
        reserves: { regular: 10, elite: 0 },
        onBoard: [],
      },
      spice: 20,
    })),
  };

  const territoryId = getNonStrongholdTerritory();
  const sector = 1;
  const forceCount = 3;

  // Validation should pass when shipping from reserves
  const validation = validateShipment(stateWithReserves, faction, territoryId, sector, forceCount);
  
  assert(
    validation.valid === true,
    `Validation should pass when shipping from reserves, got valid=${validation.valid}`
  );
}

function testNoShipmentFromBoard_ArchitectureEnforcesRestriction(): void {
  section("Architecture Enforces Restriction");

  const state = buildBaseState();
  const faction = Faction.ATREIDES;
  const factionState = getFactionState(state, faction);
  
  // Set up: forces on board, NO forces in reserves
  const stateWithOnlyBoardForces = {
    ...state,
    factions: new Map(state.factions.set(faction, {
      ...factionState,
      forces: {
        ...factionState.forces,
        reserves: { regular: 0, elite: 0 }, // No reserves
        onBoard: [{ 
          factionId: faction, 
          territoryId: TerritoryId.ARRAKEEN, 
          sector: 9, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
      spice: 20,
    })),
  };

  const territoryId = getNonStrongholdTerritory();
  const sector = 1;
  const forceCount = 3;

  // Validation should fail - no forces in reserves
  const validation = validateShipment(stateWithOnlyBoardForces, faction, territoryId, sector, forceCount);
  
  assert(
    validation.valid === false,
    `Validation should fail when no forces in reserves, got valid=${validation.valid}`
  );
  assert(
    validation.errors.some(e => e.code === 'INSUFFICIENT_RESERVES'),
    `Should have INSUFFICIENT_RESERVES error, got errors: ${validation.errors.map(e => e.code).join(', ')}`
  );
}

function testNoShipmentFromBoard_ShipForcesCannotMoveFromBoard(): void {
  section("shipForces Cannot Move Forces From Board");

  const state = buildBaseState();
  const faction = Faction.ATREIDES;
  const factionState = getFactionState(state, faction);
  
  // Set up: forces on board, no reserves
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(faction, {
      ...factionState,
      forces: {
        ...factionState.forces,
        reserves: { regular: 0, elite: 0 },
        onBoard: [{ 
          factionId: faction, 
          territoryId: TerritoryId.ARRAKEEN, 
          sector: 9, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  const territoryId = getNonStrongholdTerritory();
  const sector = 1;
  const count = 3;

  // shipForces should not be able to move forces from board
  // It only moves from reserves, so this should not create a new stack
  // (or if it does, it would be an error - but the function signature doesn't allow it)
  
  // The function only takes reserves, so if reserves are 0, it can't ship
  // This is enforced by the function implementation (subtracts from reserves)
  const originalReserves = getFactionState(initialState, faction).forces.reserves.regular;
  
  // Attempting to ship when reserves are 0 should not work
  // The function will subtract 0 from reserves (no change)
  // But it won't move forces from board
  const newState = shipForces(initialState, faction, territoryId, sector, count);
  const newFactionState = getFactionState(newState, faction);

  // Reserves should remain 0 (can't subtract from 0)
  assert(
    newFactionState.forces.reserves.regular === 0,
    `Reserves should remain 0 (cannot ship from board), got ${newFactionState.forces.reserves.regular}`
  );

  // Forces on board at original location should remain unchanged
  const originalStack = newFactionState.forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 9
  );
  assert(
    originalStack !== undefined,
    `Forces at original location should remain`
  );
  assert(
    originalStack?.forces.regular === 5,
    `Forces at original location should remain 5, got ${originalStack?.forces.regular}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.04: RESTRICTION (No Shipment From Board)");
  console.log("=".repeat(80));

  testNoShipmentFromBoard_ShipForcesOnlyFromReserves();
  testNoShipmentFromBoard_SendForcesToReservesIsSeparateFunction();
  testNoShipmentFromBoard_ValidationOnlyAllowsReservesToBoard();
  testNoShipmentFromBoard_ArchitectureEnforcesRestriction();
  testNoShipmentFromBoard_ShipForcesCannotMoveFromBoard();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

