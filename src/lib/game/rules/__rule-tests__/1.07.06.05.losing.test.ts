/**
 * Rule test: 1.07.06.05 LOSING
 * @rule-test 1.07.06.05
 *
 * Rule text (numbered_rules/1.md):
 * "LOSING: The losing player loses all the Forces they had in the Territory to the Tleilaxu Tanks and must discard every Treachery Card they used in their Battle Plan. Note that the loser does not lose their leader as a result of losing the battle."
 *
 * This rule establishes what happens to the losing player:
 * - Loser loses ALL forces they had in the Territory
 * - Forces are sent to the Tleilaxu Tanks
 * - Loser must discard every Treachery Card they used in their Battle Plan
 * - Loser does NOT lose their leader (only weapons can kill leaders)
 *
 * These tests verify:
 * - Loser loses all forces in territory
 * - Forces are sent to Tleilaxu Tanks
 * - Both regular and elite forces are lost
 * - Forces are removed from board
 * - Forces are added to tanks
 * - Leader is NOT lost (only weapons kill leaders)
 * - All treachery cards from battle plan are discarded
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState, type BattlePlan } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { resolveBattle } from "../../rules/combat/resolution/resolve-battle";
import { applyForceLosses } from "../../phases/handlers/battle/resolution/force-losses";
import { finishCardDiscarding } from "../../phases/handlers/battle/resolution/card-discarding";
import type { CurrentBattle, PhaseEvent } from "../../../phases/types";
import type { BattleResult } from "../../types";

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

// =============================================================================
// Tests
// =============================================================================

function testLosing_LosesAllForcesInTerritory(): void {
  section("Loser Loses All Forces in Territory");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory - Harkonnen has 5 regular + 2 elite = 7 total
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
            forces: { regular: 3, elite: 0 } 
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
            forces: { regular: 5, elite: 2 } 
          }],
        },
      })
    ),
  };

  // Atreides wins (higher total)
  // Atreides: 5 forces + duncan strength (2) = 7
  // Harkonnen: 2 forces + beast_rabban strength (4) = 6
  // But wait, Harkonnen has 7 forces on board, so they can dial more
  // Let's make Atreides win by dialing more forces
  // Atreides: 5 forces + duncan strength (2) = 7
  // Harkonnen: 2 forces (no leader) = 2
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2);
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Verify Harkonnen loses
  assert(
    result.loser === Faction.HARKONNEN,
    `Harkonnen should lose the battle`
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
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
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyForceLosses(initialState, battle, result, events);
  
  // Check that ALL Harkonnen forces are removed from board
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const forcesOnBoard = harkonnenStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    forcesOnBoard === undefined || (forcesOnBoard.forces.regular === 0 && forcesOnBoard.forces.elite === 0),
    `All Harkonnen forces should be removed from board, got ${forcesOnBoard?.forces.regular ?? 0} regular, ${forcesOnBoard?.forces.elite ?? 0} elite`
  );
  
  // Check that forces are in tanks
  assert(
    harkonnenStateAfter.forces.tanks.regular >= 5,
    `Harkonnen should have at least 5 regular forces in tanks (had 5 on board), got ${harkonnenStateAfter.forces.tanks.regular}`
  );
  assert(
    harkonnenStateAfter.forces.tanks.elite >= 2,
    `Harkonnen should have at least 2 elite forces in tanks (had 2 on board), got ${harkonnenStateAfter.forces.tanks.elite}`
  );
}

function testLosing_BothRegularAndEliteForcesLost(): void {
  section("Loser Loses Both Regular and Elite Forces");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Harkonnen has mixed regular and elite
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 3 } 
          }],
        },
      })
    ),
  };

  // Atreides wins
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2);
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
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
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyForceLosses(initialState, battle, result, events);
  
  // Check that both regular and elite forces are lost
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const forcesOnBoard = harkonnenStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  // All forces should be removed
  const regularRemaining = forcesOnBoard?.forces.regular ?? 0;
  const eliteRemaining = forcesOnBoard?.forces.elite ?? 0;
  
  assert(
    regularRemaining === 0,
    `All regular forces should be removed, got ${regularRemaining} remaining`
  );
  assert(
    eliteRemaining === 0,
    `All elite forces should be removed, got ${eliteRemaining} remaining`
  );
  
  // Check that both types are in tanks
  const initialRegular = 3;
  const initialElite = 3;
  const regularInTanks = harkonnenStateAfter.forces.tanks.regular;
  const eliteInTanks = harkonnenStateAfter.forces.tanks.elite;
  
  assert(
    regularInTanks >= initialRegular,
    `At least ${initialRegular} regular forces should be in tanks, got ${regularInTanks}`
  );
  assert(
    eliteInTanks >= initialElite,
    `At least ${initialElite} elite forces should be in tanks, got ${eliteInTanks}`
  );
}

function testLosing_LeaderNotLost(): void {
  section("Loser Does Not Lose Leader");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory
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

  // Atreides wins, Harkonnen uses leader (no weapons, so leader survives)
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Verify Harkonnen loses and leader was not killed
  assert(
    result.loser === Faction.HARKONNEN,
    `Harkonnen should lose the battle`
  );
  assert(
    !result.defenderResult.leaderKilled,
    `Harkonnen's leader should NOT be killed (no weapons used)`
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
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
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyForceLosses(initialState, battle, result, events);
  
  // Check that leader still exists and is NOT killed
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const leader = harkonnenStateAfter.leaders.find(
    l => l.definitionId === "beast_rabban"
  );
  
  assert(
    leader !== undefined,
    `Harkonnen's leader should still exist`
  );
  
  if (leader) {
    assert(
      leader.hasBeenKilled === false,
      `Harkonnen's leader should NOT be killed (losing battle doesn't kill leader)`
    );
  }
}

function testLosing_AllTreacheryCardsDiscarded(): void {
  section("Loser Discards All Treachery Cards from Battle Plan");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces and add cards to hand
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
        hand: [
          { definitionId: "crysknife", type: "weapon", location: "hand", ownerId: Faction.ATREIDES },
          { definitionId: "shield_1", type: "defense", location: "hand", ownerId: Faction.ATREIDES },
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
        hand: [
          { definitionId: "maula_pistol", type: "weapon", location: "hand", ownerId: Faction.HARKONNEN },
          { definitionId: "snooper_1", type: "defense", location: "hand", ownerId: Faction.HARKONNEN },
        ],
      })
    ),
  };

  // Atreides wins, Harkonnen uses weapon and defense
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban", "maula_pistol", "snooper_1");
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Verify Harkonnen loses
  assert(
    result.loser === Faction.HARKONNEN,
    `Harkonnen should lose the battle`
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
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
  };
  
  const events: PhaseEvent[] = [];
  let newState = applyForceLosses(initialState, battle, result, events);
  
  // Apply card discarding
  newState = finishCardDiscarding(newState, battle, result, events);
  
  // Check that loser's cards are discarded
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const handAfter = harkonnenStateAfter.hand;
  
  // Loser must discard all cards from battle plan
  // Weapon and defense should be discarded
  const weaponInHand = handAfter.find(c => c.definitionId === "maula_pistol");
  const defenseInHand = handAfter.find(c => c.definitionId === "snooper_1");
  
  assert(
    weaponInHand === undefined,
    `Loser's weapon card (maula_pistol) should be discarded`
  );
  assert(
    defenseInHand === undefined,
    `Loser's defense card (snooper_1) should be discarded`
  );
  
  // Verify cardsToDiscard in result
  assert(
    result.defenderResult.cardsToDiscard.includes("maula_pistol"),
    `Result should indicate weapon card (maula_pistol) to be discarded`
  );
  assert(
    result.defenderResult.cardsToDiscard.includes("snooper_1"),
    `Result should indicate defense card (snooper_1) to be discarded`
  );
}

function testLosing_ForcesRemovedFromBoard(): void {
  section("Loser's Forces Removed from Board");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces in territory
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 4, elite: 1 } 
          }],
        },
      })
    ),
  };

  // Atreides wins
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2);
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
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
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyForceLosses(initialState, battle, result, events);
  
  // Check that forces are removed from board
  const harkonnenStateBefore = getFactionState(initialState, Faction.HARKONNEN);
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  
  const forcesBefore = harkonnenStateBefore.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  const forcesAfter = harkonnenStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    forcesBefore !== undefined,
    `Harkonnen should have forces on board before battle`
  );
  assert(
    forcesBefore.forces.regular === 4,
    `Harkonnen should have 4 regular forces before battle`
  );
  assert(
    forcesBefore.forces.elite === 1,
    `Harkonnen should have 1 elite force before battle`
  );
  
  // After battle, forces should be removed
  if (forcesAfter) {
    assert(
      forcesAfter.forces.regular === 0,
      `Harkonnen should have 0 regular forces after losing, got ${forcesAfter.forces.regular}`
    );
    assert(
      forcesAfter.forces.elite === 0,
      `Harkonnen should have 0 elite forces after losing, got ${forcesAfter.forces.elite}`
    );
  } else {
    // Forces entry might be removed entirely if all forces are gone
    assert(
      true,
      `Forces entry removed from board (all forces lost)`
    );
  }
}

function testLosing_ForcesAddedToTanks(): void {
  section("Loser's Forces Added to Tanks");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - track initial tank counts
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
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 6, elite: 2 } 
          }],
          tanks: {
            regular: 0,
            elite: 0,
          },
        },
      })
    ),
  };

  // Atreides wins
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2);
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
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
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyForceLosses(initialState, battle, result, events);
  
  // Check that forces are added to tanks
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  
  assert(
    harkonnenStateAfter.forces.tanks.regular >= 6,
    `Harkonnen should have at least 6 regular forces in tanks (lost 6), got ${harkonnenStateAfter.forces.tanks.regular}`
  );
  assert(
    harkonnenStateAfter.forces.tanks.elite >= 2,
    `Harkonnen should have at least 2 elite forces in tanks (lost 2), got ${harkonnenStateAfter.forces.tanks.elite}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.06.05: LOSING");
  console.log("=".repeat(80));

  testLosing_LosesAllForcesInTerritory();
  testLosing_BothRegularAndEliteForcesLost();
  testLosing_LeaderNotLost();
  testLosing_AllTreacheryCardsDiscarded();
  testLosing_ForcesRemovedFromBoard();
  testLosing_ForcesAddedToTanks();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

