/**
 * Rule test: 1.07.02 FIRST PLAYER (Aggressor Selection)
 * @rule-test 1.07.02
 *
 * Rule text (numbered_rules/1.md):
 * "FIRST PLAYER: When resolving battles, the First Player is named the Aggressor until all their battles, if any, have been fought. The Aggressor chooses the order in which they wish to fight their battles. Then the player next in Storm Order becomes the Aggressor and so on, until all battles are resolved."
 *
 * This rule establishes aggressor selection and battle order:
 * - First Player (first in storm order) is named Aggressor first
 * - Aggressor must fight all their battles before next aggressor
 * - Aggressor chooses the order in which to fight their battles
 * - After aggressor finishes all battles, next player in storm order becomes aggressor
 * - Continues until all battles are resolved
 *
 * These tests verify:
 * - First player in storm order is first aggressor
 * - Aggressor is asked to choose battle order
 * - Aggressor must fight all their battles before next aggressor
 * - Next player in storm order becomes aggressor after first finishes
 * - Aggressor order follows storm order
 * - Aggressor only sees battles they're involved in
 * - Phase ends when all battles resolved
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { requestBattleChoice, processChooseBattle } from "../../phases/handlers/battle/aggressor-selection";
import { identifyBattles } from "../../phases/handlers/battle/identification";
import { type BattlePhaseContext, type AgentResponse, type PhaseStepResult } from "../../phases/types";
import { BattleSubPhase } from "../../types";

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
    phase: Phase.BATTLE,
  });
  return {
    ...state,
    stormOrder: factions,
    stormSector: 0,
  };
}

function buildBattleContext(state: GameState): BattlePhaseContext {
  const battles = identifyBattles(state);
  return {
    pendingBattles: battles,
    currentBattleIndex: 0,
    currentBattle: null,
    subPhase: BattleSubPhase.AGGRESSOR_CHOOSING,
    aggressorOrder: [...state.stormOrder],
    currentAggressorIndex: 0,
  };
}

function mockEndBattlePhase(state: GameState, events: any[]): PhaseStepResult {
  return {
    state,
    phaseComplete: true,
    pendingRequests: [],
    actions: [],
    events,
  };
}

function mockProcessReveal(state: GameState, events: any[]): PhaseStepResult {
  return {
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  };
}

function mockProcessResolution(state: GameState, events: any[]): PhaseStepResult {
  return {
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  };
}

function mockRequestBattlePlans(state: GameState, events: any[]): PhaseStepResult {
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

function testFirstPlayer_FirstPlayerIsFirstAggressor(): void {
  section("First Player in Storm Order is First Aggressor");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN], // Atreides is first
    stormSector: 0,
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

  const context = buildBattleContext(initialState);
  
  // Request battle choice - should ask first player (Atreides)
  const result = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result.pendingRequests.length > 0,
    `Should request battle choice from aggressor`
  );
  
  const request = result.pendingRequests[0];
  assert(
    request.factionId === Faction.ATREIDES,
    `First aggressor should be Atreides (first in storm order), got ${request.factionId}`
  );
  assert(
    request.requestType === "CHOOSE_BATTLE",
    `Request type should be CHOOSE_BATTLE, got ${request.requestType}`
  );
  assert(
    context.currentAggressorIndex === 0,
    `Current aggressor index should be 0, got ${context.currentAggressorIndex}`
  );
}

function testFirstPlayer_AggressorChoosesBattleOrder(): void {
  section("Aggressor Chooses Battle Order");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up two battles: Atreides vs Harkonnen, Atreides vs Emperor
  const territory1 = TerritoryId.ARRAKEEN;
  const territory2 = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    stormSector: 0,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { 
              factionId: Faction.ATREIDES, 
              territoryId: territory1, 
              sector: sector, 
              forces: { regular: 5, elite: 0 } 
            },
            { 
              factionId: Faction.ATREIDES, 
              territoryId: territory2, 
              sector: sector, 
              forces: { regular: 3, elite: 0 } 
            },
          ],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory1, 
            sector: sector, 
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
            territoryId: territory2, 
            sector: sector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  const context = buildBattleContext(initialState);
  
  // Request battle choice - should show Atreides both battles
  const result = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result.pendingRequests.length > 0,
    `Should request battle choice from aggressor`
  );
  
  const request = result.pendingRequests[0];
  assert(
    request.factionId === Faction.ATREIDES,
    `Aggressor should be Atreides, got ${request.factionId}`
  );
  
  if (request.context && request.context.availableBattles) {
    const availableBattles = request.context.availableBattles;
    assert(
      availableBattles.length === 2,
      `Aggressor should see 2 available battles, got ${availableBattles.length}`
    );
    
    // Verify both battles are shown
    const hasBattle1 = availableBattles.some(b => b.territory === territory1);
    const hasBattle2 = availableBattles.some(b => b.territory === territory2);
    assert(
      hasBattle1 && hasBattle2,
      `Aggressor should see both battles (Arrakeen and Imperial Basin)`
    );
  } else {
    assert(
      false,
      `Request should have availableBattles in context`
    );
  }
}

function testFirstPlayer_AggressorMustFightAllBattles(): void {
  section("Aggressor Must Fight All Battles Before Next Aggressor");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN],
    stormSector: 0,
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

  const context = buildBattleContext(initialState);
  
  // First request - should ask Atreides
  const result1 = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result1.pendingRequests.length > 0,
    `Should request battle choice from first aggressor`
  );
  assert(
    result1.pendingRequests[0].factionId === Faction.ATREIDES,
    `First aggressor should be Atreides`
  );
  assert(
    context.currentAggressorIndex === 0,
    `Current aggressor index should be 0 before battle choice`
  );
  
  // Process battle choice - Atreides chooses battle
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    requestType: "CHOOSE_BATTLE",
    data: {
      territoryId: territory,
      sector: sector,
      defender: Faction.HARKONNEN,
    },
    passed: false,
  };
  
  const result2 = processChooseBattle(
    context,
    initialState,
    [response],
    [],
    () => requestBattleChoice(
      context,
      initialState,
      [],
      mockEndBattlePhase,
      mockProcessReveal,
      mockProcessResolution,
      mockRequestBattlePlans
    ),
    mockProcessReveal,
    mockRequestBattlePlans
  );
  
  // After battle is chosen, context should be updated
  assert(
    context.currentBattle !== null,
    `Current battle should be set after battle choice`
  );
  if (context.currentBattle) {
    assert(
      context.currentBattle.aggressor === Faction.ATREIDES,
      `Battle aggressor should be Atreides`
    );
    assert(
      context.currentBattle.defender === Faction.HARKONNEN,
      `Battle defender should be Harkonnen`
    );
  }
}

function testFirstPlayer_NextPlayerBecomesAggressor(): void {
  section("Next Player in Storm Order Becomes Aggressor After First Finishes");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up battles: Atreides vs Harkonnen, Harkonnen vs Emperor
  const territory1 = TerritoryId.ARRAKEEN;
  const territory2 = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    stormSector: 0,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory1, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [
            { 
              factionId: Faction.HARKONNEN, 
              territoryId: territory1, 
              sector: sector, 
              forces: { regular: 3, elite: 0 } 
            },
            { 
              factionId: Faction.HARKONNEN, 
              territoryId: territory2, 
              sector: sector, 
              forces: { regular: 2, elite: 0 } 
            },
          ],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: territory2, 
            sector: sector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  const context = buildBattleContext(initialState);
  
  // First request - should ask Atreides (first in storm order)
  const result1 = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result1.pendingRequests.length > 0,
    `Should request battle choice from first aggressor`
  );
  assert(
    result1.pendingRequests[0].factionId === Faction.ATREIDES,
    `First aggressor should be Atreides`
  );
  assert(
    context.currentAggressorIndex === 0,
    `Current aggressor index should be 0`
  );
  
  // Simulate Atreides finishing all battles (remove battle from pending)
  // In real flow, this would happen after battle resolution
  context.pendingBattles = context.pendingBattles.filter(
    b => !(b.territoryId === territory1 && b.factions.includes(Faction.ATREIDES))
  );
  context.currentAggressorIndex = 1; // Move to next aggressor
  
  // Next request - should ask Harkonnen (next in storm order)
  const result2 = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result2.pendingRequests.length > 0,
    `Should request battle choice from next aggressor`
  );
  assert(
    result2.pendingRequests[0].factionId === Faction.HARKONNEN,
    `Next aggressor should be Harkonnen (second in storm order), got ${result2.pendingRequests[0].factionId}`
  );
  assert(
    context.currentAggressorIndex === 1,
    `Current aggressor index should be 1`
  );
}

function testFirstPlayer_AggressorOrderFollowsStormOrder(): void {
  section("Aggressor Order Follows Storm Order");

  const state = buildBaseState([Faction.EMPEROR, Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  const territory = TerritoryId.IMPERIAL_BASIN; // Non-stronghold (has sectors 8, 9, 10)
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.EMPEROR, Faction.ATREIDES, Faction.HARKONNEN], // Emperor is first
    stormSector: 0,
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
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  const context = buildBattleContext(initialState);
  
  // Verify aggressor order matches storm order
  assert(
    context.aggressorOrder.length === 3,
    `Aggressor order should have 3 factions, got ${context.aggressorOrder.length}`
  );
  assert(
    context.aggressorOrder[0] === Faction.EMPEROR,
    `First aggressor should be Emperor (first in storm order), got ${context.aggressorOrder[0]}`
  );
  assert(
    context.aggressorOrder[1] === Faction.ATREIDES,
    `Second aggressor should be Atreides (second in storm order), got ${context.aggressorOrder[1]}`
  );
  assert(
    context.aggressorOrder[2] === Faction.HARKONNEN,
    `Third aggressor should be Harkonnen (third in storm order), got ${context.aggressorOrder[2]}`
  );
  
  // Request battle choice - should ask Emperor (first in storm order)
  const result = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result.pendingRequests.length > 0,
    `Should request battle choice from aggressor`
  );
  assert(
    result.pendingRequests[0].factionId === Faction.EMPEROR,
    `First aggressor should be Emperor (first in storm order), got ${result.pendingRequests[0].factionId}`
  );
}

function testFirstPlayer_AggressorOnlySeesOwnBattles(): void {
  section("Aggressor Only Sees Battles They're Involved In");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up battles: Atreides vs Harkonnen, Harkonnen vs Emperor
  const territory1 = TerritoryId.ARRAKEEN;
  const territory2 = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    stormSector: 0,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory1, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [
            { 
              factionId: Faction.HARKONNEN, 
              territoryId: territory1, 
              sector: sector, 
              forces: { regular: 3, elite: 0 } 
            },
            { 
              factionId: Faction.HARKONNEN, 
              territoryId: territory2, 
              sector: sector, 
              forces: { regular: 2, elite: 0 } 
            },
          ],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: territory2, 
            sector: sector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  const context = buildBattleContext(initialState);
  
  // Request battle choice - Atreides should only see battle with Harkonnen
  const result = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result.pendingRequests.length > 0,
    `Should request battle choice from aggressor`
  );
  
  const request = result.pendingRequests[0];
  assert(
    request.factionId === Faction.ATREIDES,
    `Aggressor should be Atreides`
  );
  
  if (request.context && request.context.availableBattles) {
    const availableBattles = request.context.availableBattles;
    assert(
      availableBattles.length === 1,
      `Atreides should see 1 battle (only their own), got ${availableBattles.length}`
    );
    
    const battle = availableBattles[0];
    assert(
      battle.territory === territory1,
      `Atreides should see battle in Arrakeen (their battle), got ${battle.territory}`
    );
    assert(
      battle.enemies.includes(Faction.HARKONNEN),
      `Atreides should see Harkonnen as enemy`
    );
    assert(
      !battle.enemies.includes(Faction.EMPEROR),
      `Atreides should NOT see Emperor (not in their battle)`
    );
  } else {
    assert(
      false,
      `Request should have availableBattles in context`
    );
  }
}

function testFirstPlayer_PhaseEndsWhenAllBattlesResolved(): void {
  section("Phase Ends When All Battles Resolved");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN],
    stormSector: 0,
  };

  const context: BattlePhaseContext = {
    pendingBattles: [], // No pending battles
    currentBattleIndex: 0,
    currentBattle: null,
    subPhase: BattleSubPhase.AGGRESSOR_CHOOSING,
    aggressorOrder: [...initialState.stormOrder],
    currentAggressorIndex: 0,
  };
  
  // Request battle choice with no pending battles - should end phase
  const result = requestBattleChoice(
    context,
    initialState,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  assert(
    result.phaseComplete === true,
    `Phase should be complete when no pending battles, got ${result.phaseComplete}`
  );
  assert(
    result.pendingRequests.length === 0,
    `Should not request battle choice when no battles, got ${result.pendingRequests.length} requests`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.02: FIRST PLAYER (Aggressor Selection)");
  console.log("=".repeat(80));

  testFirstPlayer_FirstPlayerIsFirstAggressor();
  testFirstPlayer_AggressorChoosesBattleOrder();
  testFirstPlayer_AggressorMustFightAllBattles();
  testFirstPlayer_NextPlayerBecomesAggressor();
  testFirstPlayer_AggressorOrderFollowsStormOrder();
  testFirstPlayer_AggressorOnlySeesOwnBattles();
  testFirstPlayer_PhaseEndsWhenAllBattlesResolved();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

