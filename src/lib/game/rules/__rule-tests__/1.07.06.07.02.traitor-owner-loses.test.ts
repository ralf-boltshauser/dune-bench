/**
 * Rule test: 1.07.06.07.02 Traitor Owner Loses
 * @rule-test 1.07.06.07.02
 *
 * Rule text (numbered_rules/1.md):
 * "The Player Whose Traitor Was Revealed: loses all their Forces in the Territory and discards all of the cards they played."
 *
 * This rule establishes what happens to the player whose traitor was revealed:
 * - Loses ALL forces in the territory
 * - Discards ALL cards they played (weapon, defense)
 * - Forces are sent to Tleilaxu Tanks
 * - Cards are moved from hand to discard pile
 *
 * These tests verify:
 * - Loser loses all forces in territory
 * - All forces sent to tanks
 * - Loser discards all cards played
 * - Cards moved from hand to discard
 * - Works for both regular and elite forces
 * - Works when multiple cards are played
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, CardLocation, type GameState, type BattlePlan, type TreacheryCard } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { resolveTraitorBattle } from "../../rules/combat/resolution/resolve-traitor";
import { applyBattleResult } from "../../phases/handlers/battle/resolution/apply-results";
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

function createTreacheryCard(definitionId: string, ownerId: Faction): TreacheryCard {
  return {
    definitionId,
    type: "weapon", // Simplified for testing
    location: CardLocation.HAND,
    ownerId,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testTraitorOwnerLoses_LosesAllForcesInTerritory(): void {
  section("Loser Loses All Forces in Territory");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Harkonnen has 10 regular forces in territory
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
            forces: { regular: 10, elite: 0 } 
          }],
        },
      })
    ),
  };

  // Atreides calls traitor on Harkonnen's leader
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  const result = resolveTraitorBattle(
    initialState,
    territory,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan,
    Faction.ATREIDES, // traitorCalledBy
    "beast_rabban" // traitorLeaderId
  );
  
  // Verify loser loses all forces
  assert(
    result.defenderResult.forcesLost === 10,
    `Loser should lose all 10 forces, got ${result.defenderResult.forcesLost}`
  );
  
  // Apply battle results
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
    traitorCalled: true,
    traitorCalledBy: Faction.ATREIDES,
    traitorCallsByBothSides: false,
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyBattleResult(initialState, battle, result, events);
  
  // Check that loser has no forces on board
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const forcesOnBoard = harkonnenStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    forcesOnBoard === undefined || (forcesOnBoard.forces.regular === 0 && forcesOnBoard.forces.elite === 0),
    `Loser should have no forces on board, got ${forcesOnBoard ? `${forcesOnBoard.forces.regular} regular, ${forcesOnBoard.forces.elite} elite` : 'undefined'}`
  );
  
  // Check that forces are in tanks
  assert(
    (harkonnenStateAfter.forces.tanks?.regular ?? 0) >= 10,
    `Loser should have at least 10 forces in tanks, got ${harkonnenStateAfter.forces.tanks?.regular ?? 0}`
  );
}

function testTraitorOwnerLoses_LosesAllForcesIncludingElite(): void {
  section("Loser Loses All Forces Including Elite");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Harkonnen has both regular and elite forces
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
            forces: { regular: 8, elite: 3 } 
          }],
        },
      })
    ),
  };

  // Atreides calls traitor
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  const result = resolveTraitorBattle(
    initialState,
    territory,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan,
    Faction.ATREIDES,
    "beast_rabban"
  );
  
  // Verify loser loses all forces (regular + elite)
  const totalForces = 8 + 3; // 11 total
  assert(
    result.defenderResult.forcesLost === totalForces,
    `Loser should lose all ${totalForces} forces (8 regular + 3 elite), got ${result.defenderResult.forcesLost}`
  );
  
  // Apply battle results
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
    traitorCalled: true,
    traitorCalledBy: Faction.ATREIDES,
    traitorCallsByBothSides: false,
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyBattleResult(initialState, battle, result, events);
  
  // Check that loser has no forces on board
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const forcesOnBoard = harkonnenStateAfter.forces.onBoard.find(
    f => f.territoryId === territory && f.sector === sector
  );
  
  assert(
    forcesOnBoard === undefined || (forcesOnBoard.forces.regular === 0 && forcesOnBoard.forces.elite === 0),
    `Loser should have no forces on board (regular and elite), got ${forcesOnBoard ? `${forcesOnBoard.forces.regular} regular, ${forcesOnBoard.forces.elite} elite` : 'undefined'}`
  );
  
  // Check that all forces are in tanks
  const regularInTanks = harkonnenStateAfter.forces.tanks?.regular ?? 0;
  const eliteInTanks = harkonnenStateAfter.forces.tanks?.elite ?? 0;
  assert(
    regularInTanks >= 8 && eliteInTanks >= 3,
    `Loser should have all forces in tanks (8+ regular, 3+ elite), got ${regularInTanks} regular, ${eliteInTanks} elite`
  );
}

function testTraitorOwnerLoses_DiscardsAllCardsPlayed(): void {
  section("Loser Discards All Cards Played");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces and cards in hand
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
        hand: [
          createTreacheryCard("crysknife", Faction.HARKONNEN),
          createTreacheryCard("shield_1", Faction.HARKONNEN),
          createTreacheryCard("poison_tooth", Faction.HARKONNEN), // Not played
        ],
      })
    ),
  };

  // Harkonnen plays weapon and defense
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban", "crysknife", "shield_1");
  
  const result = resolveTraitorBattle(
    initialState,
    territory,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan,
    Faction.ATREIDES,
    "beast_rabban"
  );
  
  // Verify loser must discard all cards played
  assert(
    result.defenderResult.cardsToDiscard.includes("crysknife"),
    `Loser should discard weapon card (crysknife)`
  );
  assert(
    result.defenderResult.cardsToDiscard.includes("shield_1"),
    `Loser should discard defense card (shield_1)`
  );
  assert(
    result.defenderResult.cardsToDiscard.length === 2,
    `Loser should discard exactly 2 cards, got ${result.defenderResult.cardsToDiscard.length}`
  );
  assert(
    result.defenderResult.cardsToKeep.length === 0,
    `Loser should keep no cards, got ${result.defenderResult.cardsToKeep.length}`
  );
  
  // Apply battle results and card discarding
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
    traitorCalled: true,
    traitorCalledBy: Faction.ATREIDES,
    traitorCallsByBothSides: false,
  };
  
  const events: PhaseEvent[] = [];
  let newState = applyBattleResult(initialState, battle, result, events);
  newState = finishCardDiscarding(newState, battle, result, events);
  
  // Check that cards are removed from hand
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const weaponInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "crysknife");
  const defenseInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "shield_1");
  const otherCardInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "poison_tooth");
  
  assert(
    weaponInHand === undefined,
    `Weapon card (crysknife) should be removed from hand`
  );
  assert(
    defenseInHand === undefined,
    `Defense card (shield_1) should be removed from hand`
  );
  assert(
    otherCardInHand !== undefined,
    `Other card (poison_tooth) should remain in hand (not played)`
  );
  
  // Check that cards are in discard pile
  const weaponInDiscard = newState.treacheryDiscard.find(c => c.definitionId === "crysknife");
  const defenseInDiscard = newState.treacheryDiscard.find(c => c.definitionId === "shield_1");
  
  assert(
    weaponInDiscard !== undefined,
    `Weapon card (crysknife) should be in discard pile`
  );
  assert(
    defenseInDiscard !== undefined,
    `Defense card (shield_1) should be in discard pile`
  );
}

function testTraitorOwnerLoses_DiscardsOnlyPlayedCards(): void {
  section("Loser Discards Only Cards Played (Not All Cards)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces and multiple cards in hand
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
        hand: [
          createTreacheryCard("crysknife", Faction.HARKONNEN), // Played
          createTreacheryCard("shield_1", Faction.HARKONNEN), // Played
          createTreacheryCard("poison_tooth", Faction.HARKONNEN), // Not played
          createTreacheryCard("lasgun", Faction.HARKONNEN), // Not played
        ],
      })
    ),
  };

  // Harkonnen plays only weapon (no defense)
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban", "crysknife", null);
  
  const result = resolveTraitorBattle(
    initialState,
    territory,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan,
    Faction.ATREIDES,
    "beast_rabban"
  );
  
  // Verify loser discards only the card played
  assert(
    result.defenderResult.cardsToDiscard.includes("crysknife"),
    `Loser should discard weapon card (crysknife)`
  );
  assert(
    result.defenderResult.cardsToDiscard.length === 1,
    `Loser should discard exactly 1 card (only weapon played), got ${result.defenderResult.cardsToDiscard.length}`
  );
  
  // Apply battle results and card discarding
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
    traitorCalled: true,
    traitorCalledBy: Faction.ATREIDES,
    traitorCallsByBothSides: false,
  };
  
  const events: PhaseEvent[] = [];
  let newState = applyBattleResult(initialState, battle, result, events);
  newState = finishCardDiscarding(newState, battle, result, events);
  
  // Check that only played card is removed from hand
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const weaponInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "crysknife");
  const shieldInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "shield_1");
  const poisonInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "poison_tooth");
  const lasgunInHand = harkonnenStateAfter.hand.find(c => c.definitionId === "lasgun");
  
  assert(
    weaponInHand === undefined,
    `Played weapon card (crysknife) should be removed from hand`
  );
  assert(
    shieldInHand !== undefined,
    `Unplayed defense card (shield_1) should remain in hand`
  );
  assert(
    poisonInHand !== undefined,
    `Unplayed card (poison_tooth) should remain in hand`
  );
  assert(
    lasgunInHand !== undefined,
    `Unplayed card (lasgun) should remain in hand`
  );
}

function testTraitorOwnerLoses_ForcesSentToTanks(): void {
  section("Forces Sent to Tleilaxu Tanks");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up forces - Harkonnen starts with some forces in tanks
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
            forces: { regular: 7, elite: 2 } 
          }],
          tanks: {
            regular: 3,
            elite: 1,
          },
        },
      })
    ),
  };

  // Atreides calls traitor
  const aggressorPlan = createBattlePlan(Faction.ATREIDES, 5, "duncan_idaho");
  const defenderPlan = createBattlePlan(Faction.HARKONNEN, 2, "beast_rabban");
  
  const result = resolveTraitorBattle(
    initialState,
    territory,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    aggressorPlan,
    defenderPlan,
    Faction.ATREIDES,
    "beast_rabban"
  );
  
  // Apply battle results
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
    traitorCalled: true,
    traitorCalledBy: Faction.ATREIDES,
    traitorCallsByBothSides: false,
  };
  
  const events: PhaseEvent[] = [];
  const newState = applyBattleResult(initialState, battle, result, events);
  
  // Check that forces are added to tanks
  const harkonnenStateAfter = getFactionState(newState, Faction.HARKONNEN);
  const regularInTanks = harkonnenStateAfter.forces.tanks?.regular ?? 0;
  const eliteInTanks = harkonnenStateAfter.forces.tanks?.elite ?? 0;
  
  // Should have original 3+1 plus the 7+2 lost
  assert(
    regularInTanks >= 10, // 3 original + 7 lost
    `Regular forces in tanks should be at least 10 (3 original + 7 lost), got ${regularInTanks}`
  );
  assert(
    eliteInTanks >= 3, // 1 original + 2 lost
    `Elite forces in tanks should be at least 3 (1 original + 2 lost), got ${eliteInTanks}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.06.07.02: Traitor Owner Loses");
  console.log("=".repeat(80));

  testTraitorOwnerLoses_LosesAllForcesInTerritory();
  testTraitorOwnerLoses_LosesAllForcesIncludingElite();
  testTraitorOwnerLoses_DiscardsAllCardsPlayed();
  testTraitorOwnerLoses_DiscardsOnlyPlayedCards();
  testTraitorOwnerLoses_ForcesSentToTanks();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

