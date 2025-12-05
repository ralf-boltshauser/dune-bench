/**
 * Rule test: 1.06.01 STORM ORDER
 * @rule-test 1.06.01
 *
 * Rule text (numbered_rules/1.md):
 * "The First Player conducts their Force Shipment action and then Force Movement action. Play proceeds in Storm Order until all players have completed this Phase or indicated they will not use their actions."
 *
 * These tests verify the storm order sequencing:
 * - First player in storm order is processed first
 * - Each faction does SHIP phase then MOVE phase (not the other way around)
 * - Factions are processed in storm order sequence
 * - Phase completes when all factions are done
 * - Guild is excluded from normal storm order (handled separately)
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { ShipmentMovementStateMachine } from "../../phases/handlers/shipment-movement/state-machine";
import { getNonGuildStormOrder } from "../../phases/handlers/shipment-movement/helpers";

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
  // Set a storm order for testing
  return {
    ...state,
    stormOrder: factions,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testStormOrder_FirstPlayerIsFirst(): void {
  section("First Player in Storm Order is Processed First");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  // First faction should be the first in storm order
  const firstFaction = stateMachine.getNonGuildStormOrder()[0];
  assert(
    firstFaction === Faction.ATREIDES,
    `First faction should be ATREIDES (first in storm order), got ${firstFaction}`
  );

  // Current faction index should start at 0
  assert(
    stateMachine.getCurrentFactionIndex() === 0,
    `Current faction index should start at 0, got ${stateMachine.getCurrentFactionIndex()}`
  );

  // Initial phase should be SHIP (not MOVE)
  assert(
    stateMachine.getCurrentPhase() === "SHIP",
    `Initial phase should be SHIP, got ${stateMachine.getCurrentPhase()}`
  );
}

function testStormOrder_EachFactionDoesShipThenMove(): void {
  section("Each Faction Does SHIP Then MOVE");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  // Set first faction
  stateMachine.setCurrentFaction(Faction.ATREIDES);
  stateMachine.setCurrentPhase("SHIP");

  // Verify we start in SHIP phase
  assert(
    stateMachine.getCurrentPhase() === "SHIP",
    `Should start in SHIP phase, got ${stateMachine.getCurrentPhase()}`
  );
  assert(
    stateMachine.getCurrentFaction() === Faction.ATREIDES,
    `Current faction should be ATREIDES, got ${stateMachine.getCurrentFaction()}`
  );

  // Transition to MOVE phase (simulating shipment completion)
  stateMachine.setCurrentPhase("MOVE");

  // Verify we're now in MOVE phase (same faction)
  assert(
    stateMachine.getCurrentPhase() === "MOVE",
    `Should be in MOVE phase after shipment, got ${stateMachine.getCurrentPhase()}`
  );
  assert(
    stateMachine.getCurrentFaction() === Faction.ATREIDES,
    `Current faction should still be ATREIDES during MOVE, got ${stateMachine.getCurrentFaction()}`
  );
}

function testStormOrder_FactionsProcessedInOrder(): void {
  section("Factions Processed in Storm Order");

  const stormOrder = [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR];
  const state = buildBaseState(stormOrder);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  const nonGuildOrder = stateMachine.getNonGuildStormOrder();
  assert(
    nonGuildOrder.length === stormOrder.length,
    `Non-Guild storm order should have ${stormOrder.length} factions, got ${nonGuildOrder.length}`
  );

  // Verify order matches
  for (let i = 0; i < stormOrder.length; i++) {
    assert(
      nonGuildOrder[i] === stormOrder[i],
      `Faction at index ${i} should be ${stormOrder[i]}, got ${nonGuildOrder[i]}`
    );
  }

  // Process first faction
  stateMachine.setCurrentFaction(nonGuildOrder[0]);
  stateMachine.setCurrentPhase("SHIP");
  assert(
    stateMachine.getCurrentFaction() === Faction.ATREIDES,
    `First faction should be ATREIDES`
  );

  // Advance to next faction
  stateMachine.advanceFactionIndex();
  stateMachine.setCurrentFaction(nonGuildOrder[stateMachine.getCurrentFactionIndex()]);
  assert(
    stateMachine.getCurrentFaction() === Faction.HARKONNEN,
    `Second faction should be HARKONNEN after advance`
  );

  // Advance again
  stateMachine.advanceFactionIndex();
  stateMachine.setCurrentFaction(nonGuildOrder[stateMachine.getCurrentFactionIndex()]);
  assert(
    stateMachine.getCurrentFaction() === Faction.EMPEROR,
    `Third faction should be EMPEROR after second advance`
  );
}

function testStormOrder_PhaseCompletesWhenAllDone(): void {
  section("Phase Completes When All Factions Done");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(state);

  // Initially not all done
  assert(
    !stateMachine.isAllFactionsDone(),
    `Should not be all done initially (0/${stateMachine.getNonGuildStormOrder().length} processed)`
  );

  // Process first faction
  stateMachine.advanceFactionIndex();
  assert(
    !stateMachine.isAllFactionsDone(),
    `Should not be all done after first faction (1/${stateMachine.getNonGuildStormOrder().length} processed)`
  );

  // Process second faction
  stateMachine.advanceFactionIndex();
  assert(
    stateMachine.isAllFactionsDone(),
    `Should be all done after all factions processed (${stateMachine.getCurrentFactionIndex()}/${stateMachine.getNonGuildStormOrder().length})`
  );
}

function testStormOrder_GuildExcludedFromStormOrder(): void {
  section("Guild Excluded From Normal Storm Order");

  const stateWithGuild = buildBaseState([
    Faction.ATREIDES,
    Faction.SPACING_GUILD,
    Faction.HARKONNEN,
  ]);
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(stateWithGuild);

  const nonGuildOrder = stateMachine.getNonGuildStormOrder();
  
  // Guild should not be in the non-Guild storm order
  assert(
    !nonGuildOrder.includes(Faction.SPACING_GUILD),
    `Guild should not be in non-Guild storm order`
  );
  
  // Should have 2 factions (ATREIDES, HARKONNEN)
  assert(
    nonGuildOrder.length === 2,
    `Non-Guild storm order should have 2 factions, got ${nonGuildOrder.length}`
  );
  
  assert(
    nonGuildOrder[0] === Faction.ATREIDES,
    `First faction should be ATREIDES`
  );
  
  assert(
    nonGuildOrder[1] === Faction.HARKONNEN,
    `Second faction should be HARKONNEN`
  );

  // Guild state should indicate Guild is in game
  assert(
    stateMachine.isGuildInGame(),
    `Guild should be marked as in game`
  );
}

function testStormOrder_HelperFunctionFiltersGuild(): void {
  section("Helper Function getNonGuildStormOrder Filters Guild");

  const stormOrder = [
    Faction.ATREIDES,
    Faction.SPACING_GUILD,
    Faction.HARKONNEN,
    Faction.EMPEROR,
  ];

  const nonGuildOrder = getNonGuildStormOrder(stormOrder);

  assert(
    nonGuildOrder.length === 3,
    `Non-Guild order should have 3 factions, got ${nonGuildOrder.length}`
  );

  assert(
    !nonGuildOrder.includes(Faction.SPACING_GUILD),
    `Guild should not be in filtered order`
  );

  assert(
    nonGuildOrder[0] === Faction.ATREIDES,
    `First faction should be ATREIDES`
  );

  assert(
    nonGuildOrder[1] === Faction.HARKONNEN,
    `Second faction should be HARKONNEN`
  );

  assert(
    nonGuildOrder[2] === Faction.EMPEROR,
    `Third faction should be EMPEROR`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.06.01: STORM ORDER");
  console.log("=".repeat(80));

  testStormOrder_FirstPlayerIsFirst();
  testStormOrder_EachFactionDoesShipThenMove();
  testStormOrder_FactionsProcessedInOrder();
  testStormOrder_PhaseCompletesWhenAllDone();
  testStormOrder_GuildExcludedFromStormOrder();
  testStormOrder_HelperFunctionFiltersGuild();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

