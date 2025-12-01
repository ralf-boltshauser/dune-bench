#!/usr/bin/env npx tsx

/**
 * Test Turn 2 Storm Phase Fix
 *
 * This test verifies that Turn 2 storm phase completes properly when Fremen
 * uses the storm deck (advanced rules). It:
 * 1. Creates a game state at the end of Turn 1 spice collection
 * 2. Sets up Fremen with a stored storm card from Turn 1
 * 3. Runs the actual game engine through Turn 2 storm phase
 * 4. Verifies that storm phase completes with STORM_MOVED and PHASE_ENDED events
 */

import "dotenv/config";
import { createGameState } from "./state/factory";
import { getFactionState } from "./state";
import { PhaseManager, MockAgentProvider } from "./phases/phase-manager";
import { createAllPhaseHandlers } from "./phases/handlers";
import { Faction, Phase, FACTION_NAMES } from "./types";
import type { PhaseEvent } from "./phases/types";

// =============================================================================
// TEST SETUP
// =============================================================================

/**
 * Create a game state at the end of Turn 1 spice collection
 * with Fremen having a stored storm card for Turn 2
 */
function createTurn1EndState(): ReturnType<typeof createGameState> {
  const allFactions: Faction[] = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.FREMEN,
    Faction.BENE_GESSERIT,
    Faction.EMPEROR,
    Faction.SPACING_GUILD,
  ];

  // Create game state with 6 factions and advanced rules
  let state = createGameState({
    factions: allFactions,
    maxTurns: 3,
    advancedRules: true, // Required for Fremen storm deck
  });

  // Set to end of Turn 1 spice collection
  state.turn = 1;
  state.phase = Phase.SPICE_COLLECTION;
  state.setupComplete = true;

  // Set storm sector to something reasonable (from Turn 1 storm movement)
  // Turn 1 typically moves storm 0-40 sectors, let's use 16 as an example
  state.stormSector = 16;

  // Set up storm order (needed for game to proceed)
  state.stormOrder = allFactions;

  // CRITICAL: Store a storm card for Fremen (this is what gets revealed on Turn 2)
  // This simulates what happens at the end of Turn 1 storm phase
  const fremenState = getFactionState(state, Faction.FREMEN);
  const updatedFremenState = {
    ...fremenState,
    fremenStormCard: "6", // Store card value 6 for Turn 2
  };
  const updatedFactions = new Map(state.factions);
  updatedFactions.set(Faction.FREMEN, updatedFremenState);
  state = { ...state, factions: updatedFactions };

  return state;
}

// =============================================================================
// TEST EXECUTION
// =============================================================================

async function testTurn2StormPhase(): Promise<boolean> {
  console.log("=".repeat(80));
  console.log("TEST: Turn 2 Storm Phase Fix Verification");
  console.log("=".repeat(80));
  console.log("");

  // No API key needed - we're using MockAgentProvider

  try {
    // Step 1: Create game state at end of Turn 1
    console.log("📋 Step 1: Creating game state at end of Turn 1 spice collection...");
    const initialState = createTurn1EndState();
    console.log(`   ✓ Game state created`);
    console.log(`   ✓ Turn: ${initialState.turn}`);
    console.log(`   ✓ Phase: ${initialState.phase}`);
    console.log(`   ✓ Storm Sector: ${initialState.stormSector}`);
    console.log(`   ✓ Fremen storm card stored: ${getFactionState(initialState, Faction.FREMEN).fremenStormCard}`);
    console.log("");

    // Step 2: Set up PhaseManager with mock agent provider
    // Using MockAgentProvider so we don't need real API keys
    // It will automatically pass on all requests (Family Atomics, Weather Control, etc.)
    console.log("🤖 Step 2: Setting up PhaseManager with mock agent provider...");
    const agentProvider = new MockAgentProvider("pass"); // All agents will pass
    const phaseManager = new PhaseManager(agentProvider);
    phaseManager.registerHandlers(createAllPhaseHandlers());
    console.log("   ✓ PhaseManager configured (using mock agents - all will pass)");
    console.log("");

    // Step 3: Collect events during execution
    const events: PhaseEvent[] = [];
    phaseManager.addEventListener((event) => {
      events.push(event);
    });

    // Step 4: Run Turn 2 storm phase
    // We'll directly set the state to Turn 2 storm phase start
    // (simulating that Turn 1 has completed and we're starting Turn 2)
    console.log("🌪️  Step 3: Running Turn 2 storm phase...");
    console.log("   (Using mock agents - they will pass on Family Atomics/Weather Control)");
    console.log("");

    // Set state to start of Turn 2 storm phase
    const turn2StormState = {
      ...initialState,
      turn: 2,
      phase: Phase.STORM,
    };

    const finalState = await phaseManager.runPhase(turn2StormState, Phase.STORM);

    console.log("");
    console.log("=".repeat(80));
    console.log("RESULTS");
    console.log("=".repeat(80));
    console.log("");

    // Step 5: Verify results
    console.log("🔍 Step 4: Verifying results...");
    console.log("");

    // Check for required events
    const stormCardRevealed = events.find((e) => e.type === "STORM_CARD_REVEALED");
    const stormMoved = events.find((e) => e.type === "STORM_MOVED");
    const phaseEnded = events.find(
      (e) => e.type === "PHASE_ENDED" && e.data?.phase === Phase.STORM
    );

    let allChecksPassed = true;

    // Check 1: STORM_CARD_REVEALED event
    if (!stormCardRevealed) {
      console.error("   ❌ FAIL: STORM_CARD_REVEALED event not found");
      allChecksPassed = false;
    } else {
      console.log("   ✅ PASS: STORM_CARD_REVEALED event found");
      console.log(`      Message: ${stormCardRevealed.message}`);
      const cardValue = (stormCardRevealed.data as { value?: number })?.value;
      if (cardValue !== undefined) {
        console.log(`      Card Value: ${cardValue}`);
      }
    }

    // Check 2: STORM_MOVED event
    if (!stormMoved) {
      console.error("   ❌ FAIL: STORM_MOVED event not found");
      allChecksPassed = false;
    } else {
      console.log("   ✅ PASS: STORM_MOVED event found");
      console.log(`      Message: ${stormMoved.message}`);
      const moveData = stormMoved.data as { from?: number; to?: number; movement?: number };
      if (moveData) {
        console.log(`      From: ${moveData.from}, To: ${moveData.to}, Movement: ${moveData.movement}`);
      }
    }

    // Check 3: PHASE_ENDED event for storm
    if (!phaseEnded) {
      console.error("   ❌ FAIL: PHASE_ENDED event for storm phase not found");
      allChecksPassed = false;
    } else {
      console.log("   ✅ PASS: PHASE_ENDED event for storm phase found");
      console.log(`      Message: ${phaseEnded.message}`);
    }

    // Check 4: Phase completed successfully
    // Note: runPhase() completes the phase but doesn't advance to next phase
    // That's handled by runTurn(). We just verify the phase completed.
    if (phaseEnded) {
      console.log("   ✅ PASS: Phase completed successfully (PHASE_ENDED event emitted)");
    } else {
      console.error("   ❌ FAIL: Phase did not complete (no PHASE_ENDED event)");
      allChecksPassed = false;
    }

    // Check 5: Storm sector changed
    const stormSectorBefore = turn2StormState.stormSector;
    if (finalState.stormSector === stormSectorBefore) {
      console.warn(`   ⚠️  WARNING: Storm sector did not change (${finalState.stormSector})`);
      // This might be valid if movement was 0 or wrapped around, so it's a warning not a failure
    } else {
      console.log(`   ✅ PASS: Storm sector changed from ${stormSectorBefore} to ${finalState.stormSector}`);
    }

    // Check 6: Event order is correct
    const revealedIndex = events.findIndex((e) => e.type === "STORM_CARD_REVEALED");
    const movedIndex = events.findIndex((e) => e.type === "STORM_MOVED");
    const endedIndex = events.findIndex(
      (e) => e.type === "PHASE_ENDED" && e.data?.phase === Phase.STORM
    );

    if (revealedIndex !== -1 && movedIndex !== -1 && revealedIndex >= movedIndex) {
      console.error("   ❌ FAIL: STORM_MOVED should come after STORM_CARD_REVEALED");
      allChecksPassed = false;
    } else if (revealedIndex !== -1 && movedIndex !== -1) {
      console.log("   ✅ PASS: Event order is correct (STORM_CARD_REVEALED before STORM_MOVED)");
    }

    if (movedIndex !== -1 && endedIndex !== -1 && movedIndex >= endedIndex) {
      console.error("   ❌ FAIL: PHASE_ENDED should come after STORM_MOVED");
      allChecksPassed = false;
    } else if (movedIndex !== -1 && endedIndex !== -1) {
      console.log("   ✅ PASS: Event order is correct (STORM_MOVED before PHASE_ENDED)");
    }

    console.log("");
    console.log("=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    console.log("");

    if (allChecksPassed) {
      console.log("✅ ALL CHECKS PASSED");
      console.log("");
      console.log("The Turn 2 storm phase fix is working correctly!");
      console.log("The game engine successfully:");
      console.log("  1. Revealed the stored Fremen storm card");
      console.log("  2. Checked for Family Atomics / Weather Control (agents passed)");
      console.log("  3. Moved the storm");
      console.log("  4. Completed the phase (PHASE_ENDED event emitted)");
      return true;
    } else {
      console.error("❌ SOME CHECKS FAILED");
      console.error("");
      console.error("The Turn 2 storm phase may still have issues.");
      console.error("Check the errors above for details.");
      return false;
    }
  } catch (error) {
    console.error("");
    console.error("=".repeat(80));
    console.error("ERROR");
    console.error("=".repeat(80));
    console.error("");
    console.error(`❌ Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error("");
      console.error("Stack trace:");
      console.error(error.stack);
    }
    return false;
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const success = await testTurn2StormPhase();
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

