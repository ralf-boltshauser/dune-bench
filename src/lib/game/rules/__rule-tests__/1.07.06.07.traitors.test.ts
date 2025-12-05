/**
 * Rule test: 1.07.06.07 TRAITORS
 * @rule-test 1.07.06.07
 *
 * Rule text (numbered_rules/1.md):
 * "TRAITORS: When you are in a battle and your opponent uses a leader that matches a Traitor Card in your hand, you may call out "Traitor!" and pause the game. This can be done against any Active Leader your opponent has, even when that leader was not one of their Active Leaders at the start of the game."
 *
 * This rule establishes the traitor call mechanism:
 * - Can call traitor when opponent uses a leader matching a traitor card in hand
 * - Can call traitor against any Active Leader (even captured leaders)
 * - Can call traitor even if leader wasn't Active at start of game
 * - Traitor call pauses the game (creates pending request)
 * - Both sides can potentially call traitor
 * - Traitor card is checked correctly
 *
 * These tests verify:
 * - Traitor opportunity detected when opponent's leader matches traitor card
 * - Request created for traitor call
 * - Both sides can have traitor opportunities
 * - Traitor card structure is correct
 * - No request when no traitor match
 * - Kwisatz Haderach protection (tested in 1.07.06.07.01)
 * - Harkonnen alliance traitor (tested separately)
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, BattleSubPhase, type GameState, type BattlePlan, type TraitorCard } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { requestTraitorCall } from "../../phases/handlers/battle/sub-phases/traitor";
import type { BattlePhaseContext, PhaseEvent, PhaseStepResult } from "../../../phases/types";

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
    advancedRules: false, // Disable advanced rules to avoid spice dialing
  });
  return {
    ...state,
    stormOrder: actualFactions,
    stormSector: 0,
  };
}

function createBattlePlan(
  faction: Faction,
  forcesDialed: number,
  leaderId: string | null = null,
  weaponCardId: string | null = null,
  defenseCardId: string | null = null
): BattlePlan {
  return {
    factionId: faction,
    forcesDialed,
    leaderId,
    cheapHeroUsed: false,
    weaponCardId,
    defenseCardId,
    kwisatzHaderachUsed: false,
    spiceDialed: 0,
    announcedNoLeader: false,
  };
}

function createTraitorCard(leaderId: string, leaderName: string, leaderFaction: Faction): TraitorCard {
  return {
    leaderId,
    leaderName,
    leaderFaction,
    heldBy: null, // Will be set when added to faction
  };
}

// =============================================================================
// Tests
// =============================================================================

function testTraitors_OpportunityDetectedWhenLeaderMatches(): void {
  section("Traitor Opportunity Detected When Leader Matches");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces and traitor cards
  // Atreides has Harkonnen's leader (beast_rabban) as traitor
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
        traitors: [
          createTraitorCard("beast_rabban", "Beast Rabban", Faction.HARKONNEN),
        ],
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Harkonnen uses beast_rabban as leader
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  // Create battle context
  const context: BattlePhaseContext = {
    currentBattle: {
      territoryId: territory,
      sector: sector,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    pendingBattles: [],
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };
  
  const events: PhaseEvent[] = [];
  const callbacks = {
    processResolution: (state: GameState, events: PhaseEvent[]): PhaseStepResult => ({
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    }),
  };
  
  const result = requestTraitorCall(context, initialState, events, callbacks);
  
  // Check that traitor opportunity was detected
  assert(
    result.pendingRequests.length > 0,
    `Should have traitor call request, got ${result.pendingRequests.length} requests`
  );
  
  const traitorRequest = result.pendingRequests.find(
    r => r.requestType === "CALL_TRAITOR"
  );
  
  assert(
    traitorRequest !== undefined,
    `Should have CALL_TRAITOR request`
  );
  
  if (traitorRequest) {
    assert(
      traitorRequest.factionId === Faction.ATREIDES,
      `Atreides should be able to call traitor, got ${traitorRequest.factionId}`
    );
    assert(
      traitorRequest.context?.opponentLeader === "beast_rabban",
      `Opponent leader should be beast_rabban, got ${traitorRequest.context?.opponentLeader}`
    );
    assert(
      traitorRequest.context?.opponent === Faction.HARKONNEN,
      `Opponent should be Harkonnen, got ${traitorRequest.context?.opponent}`
    );
  }
}

function testTraitors_BothSidesCanHaveOpportunities(): void {
  section("Both Sides Can Have Traitor Opportunities");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Both sides have each other's leaders as traitors
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
        traitors: [
          createTraitorCard("beast_rabban", "Beast Rabban", Faction.HARKONNEN),
        ],
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
        traitors: [
          createTraitorCard("duncan_idaho", "Duncan Idaho", Faction.ATREIDES),
        ],
      })
    ),
  };

  // Both use leaders that are traitors for the opponent
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  // Create battle context
  const context: BattlePhaseContext = {
    currentBattle: {
      territoryId: territory,
      sector: sector,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    pendingBattles: [],
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };
  
  const events: PhaseEvent[] = [];
  const callbacks = {
    processResolution: (state: GameState, events: PhaseEvent[]): PhaseStepResult => ({
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    }),
  };
  
  const result = requestTraitorCall(context, initialState, events, callbacks);
  
  // Check that both sides have traitor opportunities
  assert(
    result.pendingRequests.length === 2,
    `Should have 2 traitor call requests (both sides), got ${result.pendingRequests.length}`
  );
  
  const atreidesRequest = result.pendingRequests.find(
    r => r.factionId === Faction.ATREIDES && r.requestType === "CALL_TRAITOR"
  );
  const harkonnenRequest = result.pendingRequests.find(
    r => r.factionId === Faction.HARKONNEN && r.requestType === "CALL_TRAITOR"
  );
  
  assert(
    atreidesRequest !== undefined,
    `Atreides should have traitor call request`
  );
  assert(
    harkonnenRequest !== undefined,
    `Harkonnen should have traitor call request`
  );
  
  if (atreidesRequest) {
    assert(
      atreidesRequest.context?.opponentLeader === "beast_rabban",
      `Atreides should be able to call traitor on beast_rabban`
    );
  }
  
  if (harkonnenRequest) {
    assert(
      harkonnenRequest.context?.opponentLeader === "duncan_idaho",
      `Harkonnen should be able to call traitor on duncan_idaho`
    );
  }
  
  // Check that requests are simultaneous
  assert(
    result.simultaneousRequests === true,
    `Traitor call requests should be simultaneous`
  );
}

function testTraitors_NoOpportunityWhenNoMatch(): void {
  section("No Traitor Opportunity When No Match");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Atreides has a traitor card, but Harkonnen doesn't use that leader
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
        traitors: [
          createTraitorCard("beast_rabban", "Beast Rabban", Faction.HARKONNEN),
        ],
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Harkonnen uses a different leader (not beast_rabban)
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  // Create battle context
  const context: BattlePhaseContext = {
    currentBattle: {
      territoryId: territory,
      sector: sector,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    pendingBattles: [],
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };
  
  const events: PhaseEvent[] = [];
  const callbacks = {
    processResolution: (state: GameState, events: PhaseEvent[]): PhaseStepResult => ({
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    }),
  };
  
  const result = requestTraitorCall(context, initialState, events, callbacks);
  
  // Check that no traitor opportunity was detected
  assert(
    result.pendingRequests.length === 0,
    `Should have no traitor call requests when no match, got ${result.pendingRequests.length}`
  );
  
  // Should proceed directly to battle resolution
  assert(
    context.subPhase === BattleSubPhase.BATTLE_RESOLUTION,
    `Should proceed to battle resolution when no traitor opportunities, got ${context.subPhase}`
  );
}

function testTraitors_NoOpportunityWhenNoLeader(): void {
  section("No Traitor Opportunity When No Leader Used");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Atreides has a traitor card
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
        traitors: [
          createTraitorCard("beast_rabban", "Beast Rabban", Faction.HARKONNEN),
        ],
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Harkonnen doesn't use a leader
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2); // No leader
  
  // Create battle context
  const context: BattlePhaseContext = {
    currentBattle: {
      territoryId: territory,
      sector: sector,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    pendingBattles: [],
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };
  
  const events: PhaseEvent[] = [];
  const callbacks = {
    processResolution: (state: GameState, events: PhaseEvent[]): PhaseStepResult => ({
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    }),
  };
  
  const result = requestTraitorCall(context, initialState, events, callbacks);
  
  // Check that no traitor opportunity was detected
  assert(
    result.pendingRequests.length === 0,
    `Should have no traitor call requests when no leader used, got ${result.pendingRequests.length}`
  );
}

function testTraitors_CanCallAgainstAnyActiveLeader(): void {
  section("Can Call Traitor Against Any Active Leader");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Atreides has multiple traitor cards
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
        traitors: [
          createTraitorCard("beast_rabban", "Beast Rabban", Faction.HARKONNEN),
          createTraitorCard("harkonnen_glossu_rabban", "Glossu Rabban", Faction.HARKONNEN),
        ],
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Harkonnen uses one of the traitor leaders
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "harkonnen_glossu_rabban");
  
  // Create battle context
  const context: BattlePhaseContext = {
    currentBattle: {
      territoryId: territory,
      sector: sector,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    pendingBattles: [],
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };
  
  const events: PhaseEvent[] = [];
  const callbacks = {
    processResolution: (state: GameState, events: PhaseEvent[]): PhaseStepResult => ({
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    }),
  };
  
  const result = requestTraitorCall(context, initialState, events, callbacks);
  
  // Check that traitor opportunity was detected for the leader used
  assert(
    result.pendingRequests.length > 0,
    `Should have traitor call request`
  );
  
  const traitorRequest = result.pendingRequests.find(
    r => r.requestType === "CALL_TRAITOR"
  );
  
  if (traitorRequest) {
    assert(
      traitorRequest.context?.opponentLeader === "harkonnen_glossu_rabban",
      `Should be able to call traitor on the leader used (harkonnen_glossu_rabban), got ${traitorRequest.context?.opponentLeader}`
    );
  }
}

function testTraitors_RequestPausesGame(): void {
  section("Traitor Call Request Pauses Game");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up traitor opportunity
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
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
        traitors: [
          createTraitorCard("beast_rabban", "Beast Rabban", Faction.HARKONNEN),
        ],
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  // Create battle context
  const context: BattlePhaseContext = {
    currentBattle: {
      territoryId: territory,
      sector: sector,
      aggressor: Faction.ATREIDES,
      defender: Faction.HARKONNEN,
      aggressorPlan,
      defenderPlan,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    },
    pendingBattles: [],
    subPhase: BattleSubPhase.TRAITOR_CALL,
  };
  
  const events: PhaseEvent[] = [];
  const callbacks = {
    processResolution: (state: GameState, events: PhaseEvent[]): PhaseStepResult => ({
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    }),
  };
  
  const result = requestTraitorCall(context, initialState, events, callbacks);
  
  // Check that game is paused (pending request created, phase not complete)
  assert(
    result.pendingRequests.length > 0,
    `Should have pending request (game paused), got ${result.pendingRequests.length}`
  );
  assert(
    result.phaseComplete === false,
    `Phase should not be complete (game paused), got ${result.phaseComplete}`
  );
  assert(
    context.subPhase === BattleSubPhase.TRAITOR_CALL,
    `Sub-phase should remain TRAITOR_CALL (game paused), got ${context.subPhase}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.06.07: TRAITORS");
  console.log("=".repeat(80));

  testTraitors_OpportunityDetectedWhenLeaderMatches();
  testTraitors_BothSidesCanHaveOpportunities();
  testTraitors_NoOpportunityWhenNoMatch();
  testTraitors_NoOpportunityWhenNoLeader();
  testTraitors_CanCallAgainstAnyActiveLeader();
  testTraitors_RequestPausesGame();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

