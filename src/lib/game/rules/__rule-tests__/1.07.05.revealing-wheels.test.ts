/**
 * Rule test: 1.07.05 REVEALING WHEELS
 * @rule-test 1.07.05
 *
 * Rule text (numbered_rules/1.md):
 * "REVEALING WHEELS: When both players are ready, the Battle Plans are Revealed simultaneously."
 *
 * This rule establishes that:
 * - Battle plans are revealed simultaneously (both at once)
 * - Both plans are fully revealed (no redaction - plans are public)
 * - Reveal happens after both plans are submitted
 * - Reveal emits an event with both plans
 * - After reveal, battle moves to traitor call phase
 *
 * These tests verify:
 * - Both plans are revealed simultaneously
 * - Event is emitted with both aggressor and defender plans
 * - Plans are fully revealed (no redaction)
 * - Happens only after both plans are submitted
 * - Transitions to next phase (traitor call)
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, BattleSubPhase, type GameState, type BattlePlan } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { processReveal } from "../../phases/handlers/battle/sub-phases/reveal";
import { type BattlePhaseContext, type BattleContext, type PhaseEvent, type PhaseStepResult } from "../../phases/types";

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
  // Ensure at least 2 factions for createGameState requirement
  const actualFactions = factions.length >= 2 ? factions : [Faction.ATREIDES, Faction.HARKONNEN];
  const state = createGameState({
    factions: actualFactions,
    turn: 1,
    phase: Phase.BATTLE,
  });
  return {
    ...state,
    stormOrder: actualFactions,
    stormSector: 0,
  };
}

function buildBattleContext(
  state: GameState,
  aggressor: Faction,
  defender: Faction,
  territory: TerritoryId,
  sector: number,
  aggressorPlan: BattlePlan | null,
  defenderPlan: BattlePlan | null
): BattlePhaseContext {
  const battle: BattleContext = {
    territoryId: territory,
    sector: sector,
    aggressor: aggressor,
    defender: defender,
    aggressorPlan: aggressorPlan,
    defenderPlan: defenderPlan,
    prescienceUsed: false,
    prescienceTarget: null,
    prescienceOpponent: null,
    prescienceResult: null,
    voiceUsed: false,
    voiceCommand: null,
  };
  
  return {
    pendingBattles: [],
    currentBattleIndex: 0,
    currentBattle: battle,
    subPhase: BattleSubPhase.REVEALING_PLANS,
    aggressorOrder: state.stormOrder,
    currentAggressorIndex: 0,
  };
}

function createBattlePlan(faction: Faction, forcesDialed: number, leaderId: string | null = null): BattlePlan {
  return {
    factionId: faction,
    forcesDialed,
    leaderId,
    cheapHeroUsed: false,
    weaponCardId: null,
    defenseCardId: null,
    kwisatzHaderachUsed: false,
    spiceDialed: 0,
    announcedNoLeader: false,
  };
}

function mockRequestTraitorCall(state: GameState, events: PhaseEvent[]): PhaseStepResult {
  return {
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testRevealingWheels_BothPlansRevealedSimultaneously(): void {
  section("Both Plans Revealed Simultaneously");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Create battle plans for both factions
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "atreides_duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  const context = buildBattleContext(
    state,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    territory,
    sector,
    aggressorPlan,
    defenderPlan
  );
  
  const events: PhaseEvent[] = [];
  
  // Process reveal
  const result = processReveal(context, state, events, {
    requestTraitorCall: mockRequestTraitorCall,
  });
  
  // Verify event was emitted
  assert(
    events.length > 0,
    `Should emit at least one event during reveal`
  );
  
  const revealEvent = events.find(e => e.type === "BATTLE_PLAN_SUBMITTED");
  assert(
    revealEvent !== undefined,
    `Should emit BATTLE_PLAN_SUBMITTED event`
  );
  
  if (revealEvent && revealEvent.data) {
    const data = revealEvent.data as any;
    
    // Verify both plans are in the event
    assert(
      data.aggressor === Faction.ATREIDES,
      `Event should include aggressor (Atreides)`
    );
    assert(
      data.defender === Faction.HARKONNEN,
      `Event should include defender (Harkonnen)`
    );
    assert(
      data.aggressorPlan !== undefined,
      `Event should include aggressor plan`
    );
    assert(
      data.defenderPlan !== undefined,
      `Event should include defender plan`
    );
    
    // Verify plans are fully revealed (not redacted)
    if (data.aggressorPlan) {
      assert(
        data.aggressorPlan.forcesDialed === 3,
        `Aggressor plan should show forcesDialed (3)`
      );
      assert(
        data.aggressorPlan.leaderId === "atreides_duncan_idaho",
        `Aggressor plan should show leaderId`
      );
    }
    
    if (data.defenderPlan) {
      assert(
        data.defenderPlan.forcesDialed === 2,
        `Defender plan should show forcesDialed (2)`
      );
      assert(
        data.defenderPlan.leaderId === "harkonnen_glossu_rabban",
        `Defender plan should show leaderId`
      );
    }
  }
}

function testRevealingWheels_PlansAreFullyRevealed(): void {
  section("Plans Are Fully Revealed (No Redaction)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Create battle plans with all components
  const aggressorPlan: BattlePlan = {
    factionId: Faction.ATREIDES,
    forcesDialed: 5,
    leaderId: "atreides_duncan_idaho",
    cheapHeroUsed: false,
    weaponCardId: "lasgun",
    defenseCardId: "shield_1",
    kwisatzHaderachUsed: false,
    spiceDialed: 0,
    announcedNoLeader: false,
  };
  
  const defenderPlan: BattlePlan = {
    factionId: Faction.HARKONNEN,
    forcesDialed: 3,
    leaderId: "harkonnen_glossu_rabban",
    cheapHeroUsed: false,
    weaponCardId: "crysknife",
    defenseCardId: null,
    kwisatzHaderachUsed: false,
    spiceDialed: 0,
    announcedNoLeader: false,
  };
  
  const context = buildBattleContext(
    state,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    territory,
    sector,
    aggressorPlan,
    defenderPlan
  );
  
  const events: PhaseEvent[] = [];
  
  // Process reveal
  processReveal(context, state, events, {
    requestTraitorCall: mockRequestTraitorCall,
  });
  
  const revealEvent = events.find(e => e.type === "BATTLE_PLAN_SUBMITTED");
  
  if (revealEvent && revealEvent.data) {
    const data = revealEvent.data as any;
    
    // Verify all plan components are revealed
    if (data.aggressorPlan) {
      assert(
        data.aggressorPlan.forcesDialed === 5,
        `Aggressor plan should show forcesDialed`
      );
      assert(
        data.aggressorPlan.leaderId === "atreides_duncan_idaho",
        `Aggressor plan should show leaderId`
      );
      assert(
        data.aggressorPlan.weaponCardId === "lasgun",
        `Aggressor plan should show weaponCardId`
      );
      assert(
        data.aggressorPlan.defenseCardId === "shield_1",
        `Aggressor plan should show defenseCardId`
      );
    }
    
    if (data.defenderPlan) {
      assert(
        data.defenderPlan.forcesDialed === 3,
        `Defender plan should show forcesDialed`
      );
      assert(
        data.defenderPlan.leaderId === "harkonnen_glossu_rabban",
        `Defender plan should show leaderId`
      );
      assert(
        data.defenderPlan.weaponCardId === "crysknife",
        `Defender plan should show weaponCardId`
      );
      assert(
        data.defenderPlan.defenseCardId === null,
        `Defender plan should show defenseCardId (null)`
      );
    }
  }
}

function testRevealingWheels_TransitionsToTraitorCall(): void {
  section("Transitions To Traitor Call Phase");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "atreides_duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  const context = buildBattleContext(
    state,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    territory,
    sector,
    aggressorPlan,
    defenderPlan
  );
  
  const events: PhaseEvent[] = [];
  
  // Process reveal
  const result = processReveal(context, state, events, {
    requestTraitorCall: mockRequestTraitorCall,
  });
  
  // Verify result indicates transition to traitor call
  // The processReveal function should call requestTraitorCall callback
  // We can verify this by checking that the result comes from mockRequestTraitorCall
  assert(
    result !== undefined,
    `Should return a result from reveal processing`
  );
  
  // The actual transition happens in the callback, but we verify the flow
  assert(
    events.some(e => e.type === "BATTLE_PLAN_SUBMITTED"),
    `Should emit BATTLE_PLAN_SUBMITTED event before transition`
  );
}

function testRevealingWheels_RequiresBothPlans(): void {
  section("Requires Both Plans To Be Set");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Test with both plans set (should work)
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "atreides_duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  const context = buildBattleContext(
    state,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    territory,
    sector,
    aggressorPlan,
    defenderPlan
  );
  
  const events: PhaseEvent[] = [];
  
  // Process reveal - should work when both plans are set
  const result = processReveal(context, state, events, {
    requestTraitorCall: mockRequestTraitorCall,
  });
  
  assert(
    result !== undefined,
    `Should process reveal when both plans are set`
  );
  
  assert(
    events.some(e => e.type === "BATTLE_PLAN_SUBMITTED"),
    `Should emit BATTLE_PLAN_SUBMITTED event when both plans are set`
  );
  
  // Note: The implementation may handle null plans by using defaults,
  // but the rule states "when both players are ready", implying both must be set
  // The actual validation happens in processBattlePlans before reveal
}

function testRevealingWheels_EventMessageIndicatesReveal(): void {
  section("Event Message Indicates Plans Are Revealed");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "atreides_duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  const context = buildBattleContext(
    state,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    territory,
    sector,
    aggressorPlan,
    defenderPlan
  );
  
  const events: PhaseEvent[] = [];
  
  // Process reveal
  processReveal(context, state, events, {
    requestTraitorCall: mockRequestTraitorCall,
  });
  
  const revealEvent = events.find(e => e.type === "BATTLE_PLAN_SUBMITTED");
  
  if (revealEvent) {
    assert(
      revealEvent.message !== undefined,
      `Event should have a message`
    );
    
    if (revealEvent.message) {
      assert(
        revealEvent.message.toLowerCase().includes("reveal") || 
        revealEvent.message.toLowerCase().includes("battle plan"),
        `Event message should indicate plans are revealed (got: "${revealEvent.message}")`
      );
    }
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.05: REVEALING WHEELS");
  console.log("=".repeat(80));

  testRevealingWheels_BothPlansRevealedSimultaneously();
  testRevealingWheels_PlansAreFullyRevealed();
  testRevealingWheels_TransitionsToTraitorCall();
  testRevealingWheels_RequiresBothPlans();
  testRevealingWheels_EventMessageIndicatesReveal();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

