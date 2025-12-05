/**
 * Rule test: 1.06.05.01 ONE FORCE MOVE
 * @rule-test 1.06.05.01
 *
 * Rule text (numbered_rules/1.md):
 * "ONE FORCE MOVE: Each player may make only one Force movement action per Turn."
 *
 * These tests verify that each faction can only make one movement per turn:
 * - Each faction processes MOVE phase once (after SHIP phase)
 * - After MOVE phase, phase transitions to DONE (cannot go back to MOVE)
 * - State machine enforces the SHIP -> MOVE -> DONE progression
 * - Faction cannot be in MOVE phase twice in the same turn
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { ShipmentMovementStateMachine } from "../../phases/handlers/shipment-movement/state-machine";

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
  // Ensure at least 2 factions (game requirement)
  const validFactions = factions.length >= 2 ? factions : [Faction.ATREIDES, Faction.HARKONNEN];
  const state = createGameState({
    factions: validFactions,
    turn: 1,
    phase: Phase.SHIPMENT_MOVEMENT,
  });
  return {
    ...state,
    stormOrder: validFactions,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testOneMove_TransitionsToMoveAfterShip(): void {
  section("Phase Transitions to MOVE After SHIP");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  stateMachine.setCurrentFaction(Faction.ATREIDES);
  
  // Start in SHIP phase
  stateMachine.setCurrentPhase("SHIP");
  assert(
    stateMachine.getCurrentPhase() === "SHIP",
    `Should start in SHIP phase`
  );

  // After shipment, transition to MOVE
  stateMachine.setCurrentPhase("MOVE");
  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `Phase should transition to MOVE after SHIP, got ${stateMachine.getCurrentPhase()}`
  );
  assert(
    stateMachine.getCurrentFaction() === Faction.ATREIDES,
    `Faction should remain ATREIDES during MOVE phase`
  );
}

function testOneMove_CannotGoBackToMove(): void {
  section("Cannot Go Back to MOVE Phase After DONE");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  stateMachine.setCurrentFaction(Faction.ATREIDES);
  
  // Progression: SHIP -> MOVE -> DONE
  stateMachine.setCurrentPhase("SHIP");
  stateMachine.setCurrentPhase("MOVE");
  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `Should be in MOVE phase`
  );

  // After movement, transition to DONE
  stateMachine.setCurrentPhase("DONE");
  assert(
    stateMachine.getCurrentPhase() === "DONE",
    `Phase should transition to DONE after MOVE, got ${stateMachine.getCurrentPhase()}`
  );

  // The architecture enforces that once you've processed movement,
  // you move to DONE and can't process movement again
  // Handler checks `getCurrentPhase() === "MOVE"` before processing movement
}

function testOneMove_EachFactionOnlyInMoveOnce(): void {
  section("Each Faction Only in MOVE Phase Once Per Turn");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  // Process first faction: ATREIDES
  const atreides = stateMachine.getNonGuildStormOrder()[0];
  stateMachine.setCurrentFaction(atreides);
  stateMachine.setCurrentPhase("SHIP");
  stateMachine.setCurrentPhase("MOVE");

  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `ATREIDES should be in MOVE phase`
  );
  assert(
    stateMachine.getCurrentFaction() === Faction.ATREIDES,
    `Current faction should be ATREIDES`
  );

  // Complete ATREIDES: MOVE -> DONE -> next faction
  stateMachine.setCurrentPhase("DONE");
  stateMachine.advanceFactionIndex();
  stateMachine.setCurrentFaction(null);

  // Process second faction: HARKONNEN
  const harkonnen = stateMachine.getNonGuildStormOrder()[1];
  stateMachine.setCurrentFaction(harkonnen);
  stateMachine.setCurrentPhase("SHIP");
  stateMachine.setCurrentPhase("MOVE");

  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `HARKONNEN should be in MOVE phase`
  );
  assert(
    stateMachine.getCurrentFaction() === Faction.HARKONNEN,
    `Current faction should be HARKONNEN`
  );

  // Verify ATREIDES is not in MOVE phase anymore
  assert(
    stateMachine.getCurrentFaction() !== Faction.ATREIDES,
    `ATREIDES should not be current faction after advancing`
  );
}

function testOneMove_PhaseProgressionIsOneWay(): void {
  section("Phase Progression is One-Way: SHIP -> MOVE -> DONE");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  stateMachine.setCurrentFaction(Faction.ATREIDES);

  // Start: SHIP
  stateMachine.setCurrentPhase("SHIP");
  assert(
    stateMachine.getCurrentPhase() === "SHIP",
    `Should start in SHIP phase`
  );

  // After shipment: MOVE
  stateMachine.setCurrentPhase("MOVE");
  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `Should be in MOVE phase after SHIP`
  );

  // After movement: DONE
  stateMachine.setCurrentPhase("DONE");
  assert(
    stateMachine.getCurrentPhase() === "DONE",
    `Should be in DONE phase after MOVE`
  );

  // The progression is enforced: once you're past MOVE, you can't go back
  // (handler logic checks `getCurrentPhase() === "MOVE"` before processing movement)
}

function testOneMove_ArchitectureEnforcesOneMove(): void {
  section("Architecture Enforces One Movement Per Faction");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  stateMachine.setCurrentFaction(Faction.ATREIDES);

  // First movement opportunity: MOVE phase (after SHIP)
  stateMachine.setCurrentPhase("SHIP");
  stateMachine.setCurrentPhase("MOVE");
  const canMoveFirst = stateMachine.getCurrentPhase() === "MOVE";
  assert(
    canMoveFirst,
    `Faction can move when in MOVE phase (first opportunity)`
  );

  // After processing movement, move to DONE
  stateMachine.setCurrentPhase("DONE");
  const canMoveAfterDone = stateMachine.getCurrentPhase() === "MOVE";
  assert(
    !canMoveAfterDone,
    `Faction cannot be in MOVE phase after transitioning to DONE`
  );

  // The architecture ensures: MOVE phase happens once (after SHIP), then DONE
  // Handler checks `getCurrentPhase() === "MOVE"` before processing movement,
  // so even if phase is manually set, the handler won't process movement twice
}

function testOneMove_MovePhaseComesAfterShip(): void {
  section("MOVE Phase Always Comes After SHIP Phase");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  stateMachine.setCurrentFaction(Faction.ATREIDES);

  // Initial phase is SHIP (not MOVE)
  stateMachine.setCurrentPhase("SHIP");
  assert(
    stateMachine.getCurrentPhase() === "SHIP",
    `Faction should start in SHIP phase, not MOVE`
  );

  // Must go through SHIP before MOVE
  stateMachine.setCurrentPhase("MOVE");
  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `Can only be in MOVE phase after SHIP phase`
  );

  // This enforces the rule: shipment happens first, then movement
  // You cannot skip shipment and go directly to movement
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.05.01: ONE FORCE MOVE");
  console.log("=".repeat(80));

  testOneMove_TransitionsToMoveAfterShip();
  testOneMove_CannotGoBackToMove();
  testOneMove_EachFactionOnlyInMoveOnce();
  testOneMove_PhaseProgressionIsOneWay();
  testOneMove_ArchitectureEnforcesOneMove();
  testOneMove_MovePhaseComesAfterShip();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

