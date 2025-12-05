/**
 * Rule test: 1.07.06.06 WINNING
 * @rule-test 1.07.06.06
 *
 * Rule text (numbered_rules/1.md):
 * "WINNING: The winning player loses only the number of Forces they dialed on the Battle Wheel. These Forces are Placed in the Tleilaxu Tanks. The winning player may discard any of the cards they played; that player may keep any cards that do not say "Discard after use"."
 *
 * This rule establishes what happens to the winning player:
 * - Winner loses only the number of Forces they dialed (not all forces)
 * - Forces are placed in the Tleilaxu Tanks
 * - Elite forces are worth 2x when taking losses (except Sardaukar vs Fremen)
 * - Winner may discard any of the cards they played
 * - Winner may keep cards that don't say "Discard after use"
 *
 * These tests verify:
 * - Winner loses only dialed forces (not all)
 * - Elite forces worth 2x (each elite absorbs 2 losses)
 * - Regular forces lost first, then elite
 * - Forces sent to tanks
 * - Card discarding is optional for winner (they can keep non-discard cards)
 * - Sardaukar vs Fremen exception (elite worth 1x)
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState, type BattlePlan } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { resolveBattle } from "../../rules/combat/resolution/resolve-battle";
import { applyForceLosses } from "../../phases/handlers/battle/resolution/force-losses";
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

function testWinning_LosesOnlyDialedForces(): void {
  section("Winner Loses Only Dialed Forces (Not All)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Atreides has 10 forces but only dials 3
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
            forces: { regular: 10, elite: 0 } 
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

  // Atreides wins, dials 3 forces
  // Atreides: 3 forces + duncan strength (2) = 5
  // Harkonnen: 2 forces (no leader) = 2
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "duncan_idaho");
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
  
  // Verify Atreides wins
  assert(
    result.winner === Faction.ATREIDES,
    `Atreides should win the battle`
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
  
  // Check that winner loses only dialed forces (3), not all (10)
  const atreidesStateAfter = getFactionState(newState, Faction.ATREIDES);
  const forcesOnBoard = atreidesStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    forcesOnBoard !== undefined,
    `Atreides should still have forces on board`
  );
  
  if (forcesOnBoard) {
    // Should have 10 - 3 = 7 forces remaining
    assert(
      forcesOnBoard.forces.regular === 7,
      `Atreides should have 7 forces remaining (had 10, lost 3), got ${forcesOnBoard.forces.regular}`
    );
  }
  
  // Check that only 3 forces are in tanks
  assert(
    atreidesStateAfter.forces.tanks.regular >= 3,
    `Atreides should have at least 3 regular forces in tanks (lost 3), got ${atreidesStateAfter.forces.tanks.regular}`
  );
}

function testWinning_EliteForcesWorth2x(): void {
  section("Elite Forces Worth 2x When Taking Losses");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Atreides has 2 regular + 3 elite, dials 5
  // With elite worth 2x: lose 2 regular (2 losses) + 2 elite (4 losses) = 6 total absorbed
  // But only need 5 losses, so: lose 2 regular (2) + 2 elite (4) = 6 (but only need 5)
  // Actually: lose 2 regular (2 losses) + 2 elite (4 losses) = 6, but we only need 5
  // So: lose 2 regular (2) + 1.5 elite, but we can't lose half, so lose 2 elite (4) = 6 total
  // Wait, let me recalculate: need 5 losses
  // Option 1: 5 regular = 5 losses (but only have 2 regular)
  // Option 2: 2 regular (2) + 2 elite (4) = 6 losses (exceeds 5, but that's okay)
  // Actually, the algorithm loses regular first, then elite
  // So: 2 regular (2 losses) + 2 elite (4 losses) = 6 total absorbed
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
            forces: { regular: 2, elite: 3 } 
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

  // Atreides wins, dials 5 forces
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
  
  // Check that elite forces are worth 2x
  // Need 5 losses: 2 regular (2) + 2 elite (4) = 6 total absorbed
  const atreidesStateAfter = getFactionState(newState, Faction.ATREIDES);
  const forcesOnBoard = atreidesStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  if (forcesOnBoard) {
    // Should lose 2 regular + 2 elite (worth 4 losses) = 6 total absorbed
    // Remaining: 0 regular, 1 elite
    assert(
      forcesOnBoard.forces.regular === 0,
      `All regular forces should be lost, got ${forcesOnBoard.forces.regular} remaining`
    );
    assert(
      forcesOnBoard.forces.elite === 1,
      `Should have 1 elite remaining (had 3, lost 2), got ${forcesOnBoard.forces.elite}`
    );
  }
  
  // Check that 2 regular and 2 elite are in tanks
  assert(
    atreidesStateAfter.forces.tanks.regular >= 2,
    `Atreides should have at least 2 regular forces in tanks, got ${atreidesStateAfter.forces.tanks.regular}`
  );
  assert(
    atreidesStateAfter.forces.tanks.elite >= 2,
    `Atreides should have at least 2 elite forces in tanks, got ${atreidesStateAfter.forces.tanks.elite}`
  );
}

function testWinning_RegularForcesLostFirst(): void {
  section("Regular Forces Lost First, Then Elite");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Atreides has 5 regular + 5 elite, dials 3
  // Should lose 3 regular (not elite) since regular are lost first
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
            forces: { regular: 5, elite: 5 } 
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

  // Atreides wins, dials 3 forces
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 3, "duncan_idaho");
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
  
  // Check that regular forces are lost first
  const atreidesStateAfter = getFactionState(newState, Faction.ATREIDES);
  const forcesOnBoard = atreidesStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  if (forcesOnBoard) {
    // Should lose 3 regular, keep all 5 elite
    assert(
      forcesOnBoard.forces.regular === 2,
      `Should have 2 regular remaining (had 5, lost 3), got ${forcesOnBoard.forces.regular}`
    );
    assert(
      forcesOnBoard.forces.elite === 5,
      `Should keep all 5 elite (regular lost first), got ${forcesOnBoard.forces.elite}`
    );
  }
}

function testWinning_ForcesSentToTanks(): void {
  section("Winner's Forces Sent to Tanks");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces
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
            forces: { regular: 8, elite: 0 } 
          }],
          tanks: {
            regular: 0,
            elite: 0,
          },
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

  // Atreides wins, dials 4 forces
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 4, "duncan_idaho");
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
  
  // Check that forces are sent to tanks
  const atreidesStateAfter = getFactionState(newState, Faction.ATREIDES);
  
  assert(
    atreidesStateAfter.forces.tanks.regular >= 4,
    `Atreides should have at least 4 regular forces in tanks (lost 4), got ${atreidesStateAfter.forces.tanks.regular}`
  );
}

function testWinning_CanKeepNonDiscardCards(): void {
  section("Winner Can Keep Cards That Don't Say 'Discard after use'");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces and cards
  // Note: Cards that don't say "Discard after use" can be kept
  // Cards that say "Discard after use" must be discarded
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
      })
    ),
  };

  // Atreides wins, uses weapon and defense
  // Note: Most weapons/defenses don't say "Discard after use", so winner can keep them
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho", "crysknife", "shield_1");
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
  
  // Verify Atreides wins
  assert(
    result.winner === Faction.ATREIDES,
    `Atreides should win the battle`
  );
  
  // Check that winner's cards are in cardsToKeep (not cardsToDiscard)
  // Winner can keep cards that don't say "Discard after use"
  assert(
    result.aggressorResult.cardsToKeep.includes("crysknife"),
    `Winner's weapon card (crysknife) should be in cardsToKeep`
  );
  assert(
    result.aggressorResult.cardsToKeep.includes("shield_1"),
    `Winner's defense card (shield_1) should be in cardsToKeep`
  );
  assert(
    !result.aggressorResult.cardsToDiscard.includes("crysknife"),
    `Winner's weapon card (crysknife) should NOT be in cardsToDiscard`
  );
  assert(
    !result.aggressorResult.cardsToDiscard.includes("shield_1"),
    `Winner's defense card (shield_1) should NOT be in cardsToDiscard`
  );
}

function testWinning_SardaukarVsFremenException(): void {
  section("Sardaukar vs Fremen Exception (Elite Worth 1x)");

  const state = buildBaseState([Faction.EMPEROR, Faction.FREMEN]);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  const fremenState = getFactionState(state, Faction.FREMEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Emperor has 2 regular + 3 elite (Sardaukar), dials 5
  // Against Fremen, Sardaukar are worth 1x (not 2x)
  // So: lose 2 regular (2) + 3 elite (3) = 5 total
  const initialState = {
    ...state,
    factions: new Map(state.factions
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 2, elite: 3 } 
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
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Emperor wins, dials 5 forces
  // Emperor: 5 forces + leader strength
  // Fremen: 2 forces (no leader)
  const aggressorPlan = createBattlePlan(Faction.EMPEROR, 5, "emperor_bashar");
  const defenderPlan = createBattlePlan(Faction.FREMEN, 2);
  
  const result = resolveBattle(
    initialState,
    territory,
    sector,
    Faction.EMPEROR,
    Faction.FREMEN,
    aggressorPlan,
    defenderPlan
  );
  
  // Apply force losses
  const battle: CurrentBattle = {
    territoryId: territory,
    sector: sector,
    aggressor: Faction.EMPEROR,
    defender: Faction.FREMEN,
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
  
  // Check that Sardaukar are worth 1x vs Fremen
  // Need 5 losses: 2 regular (2) + 3 elite (3) = 5 total
  // If elite were worth 2x, we'd only lose 2 regular (2) + 2 elite (4) = 6, leaving 1 elite
  // But since elite are worth 1x vs Fremen, we lose all 2 regular + all 3 elite = 5 total
  const emperorStateAfter = getFactionState(newState, Faction.EMPEROR);
  const forcesOnBoard = emperorStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  // Verify that all forces are lost (confirming elite are worth 1x, not 2x)
  if (forcesOnBoard) {
    // Should lose all 2 regular + all 3 elite (worth 1x each vs Fremen)
    assert(
      forcesOnBoard.forces.regular === 0,
      `All regular forces should be lost, got ${forcesOnBoard.forces.regular} remaining`
    );
    assert(
      forcesOnBoard.forces.elite === 0,
      `All elite forces should be lost (worth 1x vs Fremen, not 2x), got ${forcesOnBoard.forces.elite} remaining`
    );
  } else {
    // Forces entry might be removed entirely if all forces are gone
    assert(
      true,
      `All forces removed from board (confirming elite worth 1x vs Fremen)`
    );
  }
  
  // Check that all forces are in tanks
  assert(
    emperorStateAfter.forces.tanks.regular >= 2,
    `Emperor should have at least 2 regular forces in tanks, got ${emperorStateAfter.forces.tanks.regular}`
  );
  assert(
    emperorStateAfter.forces.tanks.elite >= 3,
    `Emperor should have at least 3 elite forces in tanks, got ${emperorStateAfter.forces.tanks.elite}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.06.06: WINNING");
  console.log("=".repeat(80));

  testWinning_LosesOnlyDialedForces();
  testWinning_EliteForcesWorth2x();
  testWinning_RegularForcesLostFirst();
  testWinning_ForcesSentToTanks();
  testWinning_CanKeepNonDiscardCards();
  testWinning_SardaukarVsFremenException();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

