/**
 * Rule test: 1.07.03 MULTIPLE BATTLES
 * @rule-test 1.07.03
 *
 * Rule text (numbered_rules/1.md):
 * "MULTIPLE BATTLES: When there are three or more players in the same Territory, the Aggressor picks who they will battle first, second, etc. for as long as they have Forces in that Territory."
 *
 * This rule establishes how multiple battles work when 3+ players are in the same territory:
 * - When 3+ players in same territory, aggressor picks battle order
 * - Aggressor can continue fighting in same territory as long as they have forces
 * - After each battle, pending battles are updated
 * - Aggressor can fight multiple battles in the same territory sequentially
 * - Battle continues until aggressor has no forces or only one enemy remains
 *
 * These tests verify:
 * - Aggressor sees multiple enemies in same territory when 3+ players
 * - Aggressor can choose which enemy to battle first
 * - After first battle, aggressor can continue if forces remain
 * - Pending battles are updated after each battle
 * - Aggressor can fight multiple battles in same territory
 * - Battle stops when aggressor has no forces
 * - Battle stops when only one enemy remains
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { requestBattleChoice, processChooseBattle } from "../../phases/handlers/battle/aggressor-selection";
import { identifyBattles } from "../../phases/handlers/battle/identification";
import { updatePendingBattlesAfterBattle } from "../../phases/handlers/battle/pending-battles";
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

function buildBaseState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]): GameState {
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

function testMultipleBattles_AggressorSeesMultipleEnemiesInSameTerritory(): void {
  section("Aggressor Sees Multiple Enemies in Same Territory (3+ Players)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up 3 players in same territory (non-stronghold)
  const territory = TerritoryId.IMPERIAL_BASIN; // Non-stronghold (has sectors 8, 9, 10)
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR], // Atreides is first aggressor
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
  
  // Verify one battle identified with 3 factions
  assert(
    context.pendingBattles.length === 1,
    `Should identify 1 battle with 3 factions, got ${context.pendingBattles.length}`
  );
  
  const battle = context.pendingBattles[0];
  assert(
    battle.factions.length === 3,
    `Battle should have 3 factions, got ${battle.factions.length}`
  );
  
  // Request battle choice - Atreides should see multiple enemies
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
    `Aggressor should be Atreides (first in storm order), got ${request.factionId}`
  );
  
  if (request.context && request.context.availableBattles) {
    const availableBattles = request.context.availableBattles;
    assert(
      availableBattles.length === 1,
      `Aggressor should see 1 battle (same territory), got ${availableBattles.length}`
    );
    
    const battle = availableBattles[0];
    assert(
      battle.enemies.length === 2,
      `Aggressor should see 2 enemies (Harkonnen and Emperor), got ${battle.enemies.length}`
    );
    assert(
      battle.enemies.includes(Faction.HARKONNEN),
      `Aggressor should see Harkonnen as enemy`
    );
    assert(
      battle.enemies.includes(Faction.EMPEROR),
      `Aggressor should see Emperor as enemy`
    );
  } else {
    assert(
      false,
      `Request should have availableBattles in context`
    );
  }
}

function testMultipleBattles_AggressorCanChooseWhichEnemyToBattleFirst(): void {
  section("Aggressor Can Choose Which Enemy to Battle First");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up 3 players in same territory
  const territory = TerritoryId.IMPERIAL_BASIN;
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
  
  // Request battle choice - Atreides should be able to choose defender
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
    `Should request battle choice from aggressor`
  );
  
  const request = result1.pendingRequests[0];
  if (request.context && request.context.availableBattles) {
    const battle = request.context.availableBattles[0];
    assert(
      battle.enemies.length === 2,
      `Aggressor should see 2 enemies to choose from, got ${battle.enemies.length}`
    );
  }
  
  // Process battle choice - Atreides chooses to battle Harkonnen first
  const response: AgentResponse = {
    factionId: Faction.ATREIDES,
    requestType: "CHOOSE_BATTLE",
    data: {
      territoryId: territory,
      sector: sector,
      defender: Faction.HARKONNEN, // Chooses Harkonnen first
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
  
  // Verify battle is set up with chosen defender
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
      `Battle defender should be Harkonnen (chosen first)`
    );
    assert(
      context.currentBattle.territoryId === territory,
      `Battle should be in ${territory}`
    );
  }
}

function testMultipleBattles_PendingBattlesUpdatedAfterBattle(): void {
  section("Pending Battles Updated After Battle (Aggressor Can Continue)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up 3 players in same territory
  const territory = TerritoryId.IMPERIAL_BASIN;
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
  
  // Initial state: 1 battle with 3 factions
  assert(
    context.pendingBattles.length === 1,
    `Initial: Should have 1 battle with 3 factions, got ${context.pendingBattles.length}`
  );
  
  const initialBattle = context.pendingBattles[0];
  assert(
    initialBattle.factions.length === 3,
    `Initial battle should have 3 factions, got ${initialBattle.factions.length}`
  );
  
  // Simulate battle resolution: Atreides defeats Harkonnen (Harkonnen loses all forces)
  // In real flow, this would happen in resolveBattle()
  const afterBattleState = {
    ...initialState,
    factions: new Map(initialState.factions.set(Faction.HARKONNEN, {
      ...harkonnenState,
      forces: {
        ...harkonnenState.forces,
        onBoard: [], // Harkonnen loses all forces
        tanks: { regular: 3, elite: 0 }, // Forces go to tanks
      },
    })),
  };
  
  // Update pending battles after battle
  const updatedBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    afterBattleState,
    territory,
    sector
  );
  
  // After battle, should still have a battle (Atreides vs Emperor)
  // But only if Atreides still has forces
  const atreidesStateAfter = getFactionState(afterBattleState, Faction.ATREIDES);
  const hasForces = atreidesStateAfter.forces.onBoard.some(
    f => f.territoryId === territory && f.sector === sector
  );
  
  if (hasForces) {
    // Atreides still has forces, so should be able to continue
    const battlesWithAtreides = updatedBattles.filter(b => 
      b.territoryId === territory && 
      b.sector === sector && 
      b.factions.includes(Faction.ATREIDES)
    );
    
    assert(
      battlesWithAtreides.length > 0,
      `After battle, should still have battle with Atreides if they have forces`
    );
    
    const remainingBattle = battlesWithAtreides[0];
    assert(
      remainingBattle.factions.includes(Faction.ATREIDES),
      `Remaining battle should include Atreides`
    );
    assert(
      remainingBattle.factions.includes(Faction.EMPEROR),
      `Remaining battle should include Emperor`
    );
    assert(
      !remainingBattle.factions.includes(Faction.HARKONNEN),
      `Remaining battle should NOT include Harkonnen (defeated)`
    );
    assert(
      remainingBattle.factions.length === 2,
      `Remaining battle should have 2 factions (Atreides vs Emperor), got ${remainingBattle.factions.length}`
    );
  }
}

function testMultipleBattles_AggressorCanContinueFightingAsLongAsForcesRemain(): void {
  section("Aggressor Can Continue Fighting As Long As Forces Remain");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up 3 players in same territory
  const territory = TerritoryId.IMPERIAL_BASIN;
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
  
  // First battle: Atreides vs Harkonnen
  // Simulate Harkonnen defeated (all forces lost)
  const afterFirstBattle = {
    ...initialState,
    factions: new Map(initialState.factions.set(Faction.HARKONNEN, {
      ...harkonnenState,
      forces: {
        ...harkonnenState.forces,
        onBoard: [], // Harkonnen loses all forces
        tanks: { regular: 3, elite: 0 },
      },
    })),
  };
  
  // Update pending battles
  context.pendingBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    afterFirstBattle,
    territory,
    sector
  );
  
  // Atreides still has forces, so should be able to continue
  const atreidesStateAfter = getFactionState(afterFirstBattle, Faction.ATREIDES);
  const hasForces = atreidesStateAfter.forces.onBoard.some(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    hasForces,
    `Atreides should still have forces after first battle`
  );
  
  // Request next battle choice - Atreides should still be aggressor
  const result = requestBattleChoice(
    context,
    afterFirstBattle,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  // Should still request battle choice from Atreides (same aggressor)
  assert(
    result.pendingRequests.length > 0,
    `Should request battle choice from aggressor for remaining battle`
  );
  
  const request = result.pendingRequests[0];
  assert(
    request.factionId === Faction.ATREIDES,
    `Aggressor should still be Atreides (can continue fighting), got ${request.factionId}`
  );
  
  if (request.context && request.context.availableBattles) {
    const availableBattles = request.context.availableBattles;
    const battleWithEmperor = availableBattles.find(b => 
      b.enemies.includes(Faction.EMPEROR)
    );
    
    assert(
      battleWithEmperor !== undefined,
      `Aggressor should see battle with remaining enemy (Emperor)`
    );
  }
}

function testMultipleBattles_BattleStopsWhenAggressorHasNoForces(): void {
  section("Battle Stops When Aggressor Has No Forces");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up 3 players in same territory
  const territory = TerritoryId.IMPERIAL_BASIN;
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
  
  // Simulate first battle: Atreides loses all forces (defeated)
  const afterFirstBattle = {
    ...initialState,
    factions: new Map(initialState.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [], // Atreides loses all forces
        tanks: { regular: 5, elite: 0 },
      },
    })),
  };
  
  // Update pending battles
  context.pendingBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    afterFirstBattle,
    territory,
    sector
  );
  
  // Atreides has no forces, so should not be able to continue
  const atreidesStateAfter = getFactionState(afterFirstBattle, Faction.ATREIDES);
  const hasForces = atreidesStateAfter.forces.onBoard.some(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    !hasForces,
    `Atreides should have no forces after losing battle`
  );
  
  // Request battle choice - should move to next aggressor (not Atreides)
  context.currentAggressorIndex = 0; // Reset to check progression
  const result = requestBattleChoice(
    context,
    afterFirstBattle,
    [],
    mockEndBattlePhase,
    mockProcessReveal,
    mockProcessResolution,
    mockRequestBattlePlans
  );
  
  // Should move to next aggressor (Harkonnen) since Atreides has no forces
  // The requestBattleChoice function should skip Atreides and move to next
  if (result.pendingRequests.length > 0) {
    const request = result.pendingRequests[0];
    assert(
      request.factionId !== Faction.ATREIDES,
      `Should NOT request battle choice from Atreides (no forces), got ${request.factionId}`
    );
  } else {
    // Or phase might end if no valid battles
    assert(
      result.phaseComplete === true || context.currentAggressorIndex > 0,
      `Should either end phase or move to next aggressor when aggressor has no forces`
    );
  }
}

function testMultipleBattles_BattleStopsWhenOnlyOneEnemyRemains(): void {
  section("Battle Stops When Only One Enemy Remains");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  // Set up 3 players in same territory
  const territory = TerritoryId.IMPERIAL_BASIN;
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
  
  // Simulate first battle: Atreides defeats Harkonnen
  const afterFirstBattle = {
    ...initialState,
    factions: new Map(initialState.factions.set(Faction.HARKONNEN, {
      ...harkonnenState,
      forces: {
        ...harkonnenState.forces,
        onBoard: [], // Harkonnen loses all forces
        tanks: { regular: 3, elite: 0 },
      },
    })),
  };
  
  // Update pending battles
  context.pendingBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    afterFirstBattle,
    territory,
    sector
  );
  
  // After first battle, only Atreides and Emperor remain
  // This is now a 2-player battle, not a multiple battle scenario
  const remainingBattles = context.pendingBattles.filter(b => 
    b.territoryId === territory && b.sector === sector
  );
  
  if (remainingBattles.length > 0) {
    const remainingBattle = remainingBattles[0];
    assert(
      remainingBattle.factions.length === 2,
      `After first battle, remaining battle should have 2 factions (not multiple), got ${remainingBattle.factions.length}`
    );
    assert(
      remainingBattle.factions.includes(Faction.ATREIDES),
      `Remaining battle should include Atreides`
    );
    assert(
      remainingBattle.factions.includes(Faction.EMPEROR),
      `Remaining battle should include Emperor`
    );
    assert(
      !remainingBattle.factions.includes(Faction.HARKONNEN),
      `Remaining battle should NOT include Harkonnen (defeated)`
    );
  }
}

function testMultipleBattles_FourPlayersInSameTerritory(): void {
  section("Four Players in Same Territory (Extended Multiple Battles)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  const fremenState = getFactionState(state, Faction.FREMEN);
  
  // Set up 4 players in same territory (non-stronghold)
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN],
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
      .set(Faction.FREMEN, {
        ...fremenState,
        forces: {
          ...fremenState.forces,
          onBoard: [{ 
            factionId: Faction.FREMEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 4, elite: 0 } 
          }],
        },
      })
    ),
  };

  const context = buildBattleContext(initialState);
  
  // Verify one battle identified with 4 factions
  assert(
    context.pendingBattles.length === 1,
    `Should identify 1 battle with 4 factions, got ${context.pendingBattles.length}`
  );
  
  const battle = context.pendingBattles[0];
  assert(
    battle.factions.length === 4,
    `Battle should have 4 factions, got ${battle.factions.length}`
  );
  
  // Request battle choice - Atreides should see 3 enemies
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
    `Aggressor should be Atreides (first in storm order), got ${request.factionId}`
  );
  
  if (request.context && request.context.availableBattles) {
    const availableBattles = request.context.availableBattles;
    assert(
      availableBattles.length === 1,
      `Aggressor should see 1 battle (same territory), got ${availableBattles.length}`
    );
    
    const battle = availableBattles[0];
    assert(
      battle.enemies.length === 3,
      `Aggressor should see 3 enemies (Harkonnen, Emperor, Fremen), got ${battle.enemies.length}`
    );
    assert(
      battle.enemies.includes(Faction.HARKONNEN),
      `Aggressor should see Harkonnen as enemy`
    );
    assert(
      battle.enemies.includes(Faction.EMPEROR),
      `Aggressor should see Emperor as enemy`
    );
    assert(
      battle.enemies.includes(Faction.FREMEN),
      `Aggressor should see Fremen as enemy`
    );
  } else {
    assert(
      false,
      `Request should have availableBattles in context`
    );
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.03: MULTIPLE BATTLES");
  console.log("=".repeat(80));

  testMultipleBattles_AggressorSeesMultipleEnemiesInSameTerritory();
  testMultipleBattles_AggressorCanChooseWhichEnemyToBattleFirst();
  testMultipleBattles_PendingBattlesUpdatedAfterBattle();
  testMultipleBattles_AggressorCanContinueFightingAsLongAsForcesRemain();
  testMultipleBattles_BattleStopsWhenAggressorHasNoForces();
  testMultipleBattles_BattleStopsWhenOnlyOneEnemyRemains();
  testMultipleBattles_FourPlayersInSameTerritory();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

