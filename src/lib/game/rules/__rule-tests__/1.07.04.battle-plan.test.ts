/**
 * Rule test: 1.07.04 BATTLE PLAN
 * @rule-test 1.07.04
 * @rule-test 1.07.04.01
 * @rule-test 1.07.04.02
 * @rule-test 1.07.04.03
 * @rule-test 1.07.04.04
 * @rule-test 1.07.04.05
 * @rule-test 1.07.04.06
 * @rule-test 1.07.04.07
 *
 * Rule text (numbered_rules/1.md):
 * "Battle Plan: To resolve a battle, each player secretly formulates a Battle Plan."
 * 
 * Sub-rules:
 * - 1.07.04.01: A Battle Plan always includes the number of Forces dialed on the Battle Wheel. When possible, it must include a player's leader or a Cheap Hero. It may include Treachery Cards at the player's discretion.
 * - 1.07.04.02: BATTLE WHEEL: Each player picks up a Battle Wheel and secretly dials a number from zero to the number of Forces they have in the disputed Territory. Both players will lose the number of Forces dialed on their Battle Wheel.
 * - 1.07.04.03: LEADERS: One Leader Disc is selected and put face up in the slot on the wheel. A Cheap Hero Card may be played in lieu of a Leader Disc.
 * - 1.07.04.04: DEDICATED LEADER: Leaders that survive battles may fight more than once in a single Territory if needed, but no leader may fight in more than one Territory during the same Phase.
 * - 1.07.04.05: LEADER ANNOUNCEMENT: A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible. When it is not possible, a player must announce that they can not play a leader or Cheap Hero.
 * - 1.07.04.06: NO TREACHERY: A player with no leader or Cheap Hero must still battle, but they can not play any Treachery Cards as part of their Battle Plan.
 * - 1.07.04.07: TREACHERY CARDS: Players with a leader or Cheap Hero may play a Weapon Treachery Card, Defense Treachery Card, or both by holding them against the wheel. They may choose not to play Treachery Cards as well.
 *
 * These tests verify:
 * - Battle plans are requested from both players simultaneously
 * - Forces dialed must be 0 to max forces in territory
 * - Leader or Cheap Hero must be played when available
 * - Leader announcement required when no leader/hero available
 * - Leaders can fight multiple times in same territory
 * - Leaders cannot fight in different territories in same phase
 * - Treachery cards require leader or Cheap Hero
 * - Treachery cards are optional (can play weapon, defense, both, or neither)
 * - Validation correctly rejects invalid plans
 * - Validation correctly accepts valid plans
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, LeaderLocation, type GameState, type BattlePlan } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, getAvailableLeaders, hasCheapHero, getWeaponCards, getDefenseCards } from "../../state";
import { validateBattlePlan } from "../../rules/combat/validation/validate-battle-plan";
import { requestBattlePlans } from "../../phases/handlers/battle/sub-phases/battle-plans";
import { type BattlePhaseContext, type BattleContext } from "../../phases/types";
import { BattleSubPhase } from "../../types";
import { getLeaderDefinition } from "../../data";

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

function buildBattleContext(state: GameState, aggressor: Faction, defender: Faction, territory: TerritoryId, sector: number): BattlePhaseContext {
  const battle: BattleContext = {
    territoryId: territory,
    sector: sector,
    aggressor: aggressor,
    defender: defender,
    aggressorPlan: null,
    defenderPlan: null,
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
    subPhase: BattleSubPhase.BATTLE_PLANS,
    aggressorOrder: state.stormOrder,
    currentAggressorIndex: 0,
  };
}

function createValidBattlePlan(faction: Faction, forcesDialed: number, leaderId: string | null = null, cheapHeroUsed: boolean = false): BattlePlan {
  return {
    factionId: faction,
    forcesDialed,
    leaderId,
    cheapHeroUsed,
    weaponCardId: null,
    defenseCardId: null,
    kwisatzHaderachUsed: false,
    spiceDialed: 0,
    announcedNoLeader: false,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testBattlePlan_RequestedFromBothPlayers(): void {
  section("1.07.04 - Battle Plan Requested From Both Players");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  // Set up forces in same territory
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
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

  const context = buildBattleContext(initialState, Faction.ATREIDES, Faction.HARKONNEN, territory, sector);
  
  // Request battle plans
  const result = requestBattlePlans(context, initialState, []);
  
  assert(
    result.pendingRequests.length === 2,
    `Should request battle plans from both players, got ${result.pendingRequests.length}`
  );
  
  assert(
    result.simultaneousRequests === true,
    `Battle plans should be requested simultaneously (secret)`
  );
  
  const atreidesRequest = result.pendingRequests.find(r => r.factionId === Faction.ATREIDES);
  const harkonnenRequest = result.pendingRequests.find(r => r.factionId === Faction.HARKONNEN);
  
  assert(
    atreidesRequest !== undefined,
    `Should request battle plan from Atreides`
  );
  assert(
    harkonnenRequest !== undefined,
    `Should request battle plan from Harkonnen`
  );
  
  if (atreidesRequest) {
    assert(
      atreidesRequest.requestType === "CREATE_BATTLE_PLAN",
      `Atreides request should be CREATE_BATTLE_PLAN`
    );
    if (atreidesRequest.context) {
      assert(
        atreidesRequest.context.forcesAvailable === 5,
        `Atreides should see 5 available forces`
      );
    }
  }
  
  if (harkonnenRequest) {
    assert(
      harkonnenRequest.requestType === "CREATE_BATTLE_PLAN",
      `Harkonnen request should be CREATE_BATTLE_PLAN`
    );
    if (harkonnenRequest.context) {
      assert(
        harkonnenRequest.context.forcesAvailable === 3,
        `Harkonnen should see 3 available forces`
      );
    }
  }
}

function testBattleWheel_ForcesDialedRange(): void {
  section("1.07.04.02 - BATTLE WHEEL: Forces Dialed Range (0 to Max)");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  const maxForces = 5;
  const leaderId = "atreides_duncan_idaho";
  
  // Set up with leader available
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [{
        definitionId: leaderId,
        faction: Faction.ATREIDES,
        strength: 5,
        location: LeaderLocation.LEADER_POOL,
        hasBeenKilled: false,
        usedThisTurn: false,
        usedInTerritoryId: null,
        originalFaction: Faction.ATREIDES,
        capturedBy: null,
      }],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: maxForces, elite: 0 } 
        }],
      },
    })),
  };

  // Test: Valid - dial 0 forces (with leader)
  const plan0 = createValidBattlePlan(Faction.ATREIDES, 0, leaderId);
  const result0 = validateBattlePlan(initialState, Faction.ATREIDES, territory, plan0, sector);
  assert(
    result0.valid === true,
    `Should allow dialing 0 forces (valid minimum)`
  );
  
  // Test: Valid - dial max forces (with leader)
  const planMax = createValidBattlePlan(Faction.ATREIDES, maxForces, leaderId);
  const resultMax = validateBattlePlan(initialState, Faction.ATREIDES, territory, planMax, sector);
  assert(
    resultMax.valid === true,
    `Should allow dialing ${maxForces} forces (max available)`
  );
  
  // Test: Valid - dial middle value (with leader)
  const planMid = createValidBattlePlan(Faction.ATREIDES, 3, leaderId);
  const resultMid = validateBattlePlan(initialState, Faction.ATREIDES, territory, planMid, sector);
  assert(
    resultMid.valid === true,
    `Should allow dialing 3 forces (middle value)`
  );
  
  // Test: Invalid - dial more than max
  const planTooMany = createValidBattlePlan(Faction.ATREIDES, maxForces + 1);
  const resultTooMany = validateBattlePlan(initialState, Faction.ATREIDES, territory, planTooMany, sector);
  assert(
    resultTooMany.valid === false,
    `Should reject dialing ${maxForces + 1} forces (exceeds max)`
  );
  assert(
    resultTooMany.errors.some(e => e.code === "FORCES_DIALED_EXCEEDS_AVAILABLE"),
    `Should have FORCES_DIALED_EXCEEDS_AVAILABLE error`
  );
  
  // Test: Invalid - dial negative
  const planNegative = createValidBattlePlan(Faction.ATREIDES, -1);
  const resultNegative = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNegative, sector);
  assert(
    resultNegative.valid === false,
    `Should reject dialing -1 forces (negative)`
  );
  assert(
    resultNegative.errors.some(e => e.code === "FORCES_DIALED_EXCEEDS_AVAILABLE"),
    `Should have FORCES_DIALED_EXCEEDS_AVAILABLE error for negative`
  );
}

function testLeaders_MustPlayWhenAvailable(): void {
  section("1.07.04.03 & 1.07.04.05 - LEADERS: Must Play When Available");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up with available leaders
  const availableLeaders = getAvailableLeaders(state, Faction.ATREIDES);
  const hasLeaders = availableLeaders.length > 0;
  
  if (!hasLeaders) {
    // If no leaders available, set one up
    const leaderId = "atreides_duncan_idaho";
    const initialState = {
      ...state,
      factions: new Map(state.factions.set(Faction.ATREIDES, {
        ...atreidesState,
        leaders: [{
          definitionId: leaderId,
          faction: Faction.ATREIDES,
          strength: 5,
          location: LeaderLocation.LEADER_POOL,
          hasBeenKilled: false,
          usedThisTurn: false,
          usedInTerritoryId: null,
          originalFaction: Faction.ATREIDES,
          capturedBy: null,
        }],
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })),
    };
    
    // Test: Invalid - no leader when available
    const planNoLeader = createValidBattlePlan(Faction.ATREIDES, 3);
    const resultNoLeader = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNoLeader, sector);
    assert(
      resultNoLeader.valid === false,
      `Should reject plan without leader when leaders available`
    );
    assert(
      resultNoLeader.errors.some(e => e.code === "MUST_PLAY_LEADER" || e.code === "MUST_PLAY_LEADER_OR_CHEAP_HERO"),
      `Should have MUST_PLAY_LEADER error`
    );
    
    // Test: Valid - with leader
    const planWithLeader = createValidBattlePlan(Faction.ATREIDES, 3, leaderId);
    const resultWithLeader = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWithLeader, sector);
    assert(
      resultWithLeader.valid === true,
      `Should accept plan with leader when leaders available`
    );
  } else {
    // Test with existing leaders
    const leaderId = availableLeaders[0].definitionId;
    
    const initialState = {
      ...state,
      factions: new Map(state.factions.set(Faction.ATREIDES, {
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
      })),
    };
    
    // Test: Invalid - no leader when available
    const planNoLeader = createValidBattlePlan(Faction.ATREIDES, 3);
    const resultNoLeader = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNoLeader, sector);
    assert(
      resultNoLeader.valid === false,
      `Should reject plan without leader when leaders available`
    );
    
    // Test: Valid - with leader
    const planWithLeader = createValidBattlePlan(Faction.ATREIDES, 3, leaderId);
    const resultWithLeader = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWithLeader, sector);
    assert(
      resultWithLeader.valid === true,
      `Should accept plan with leader when leaders available`
    );
  }
}

function testCheapHero_CanPlayInLieuOfLeader(): void {
  section("1.07.04.03 - LEADERS: Cheap Hero Can Be Played In Lieu Of Leader");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up with Cheap Hero card but no leaders
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [], // No leaders available
      hand: [{
        definitionId: "cheap_hero_1",
        type: "SPECIAL" as any,
        location: "hand" as any,
        ownerId: Faction.ATREIDES,
      }],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Invalid - no Cheap Hero when no leaders available
  const planNoHero = createValidBattlePlan(Faction.ATREIDES, 3);
  const resultNoHero = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNoHero, sector);
  assert(
    resultNoHero.valid === false,
    `Should reject plan without Cheap Hero when no leaders available`
  );
  assert(
    resultNoHero.errors.some(e => e.code === "MUST_PLAY_CHEAP_HERO"),
    `Should have MUST_PLAY_CHEAP_HERO error`
  );
  
  // Test: Valid - with Cheap Hero
  const planWithHero = createValidBattlePlan(Faction.ATREIDES, 3, null, true);
  const resultWithHero = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWithHero, sector);
  assert(
    resultWithHero.valid === true,
    `Should accept plan with Cheap Hero when no leaders available`
  );
}

function testLeaderAnnouncement_RequiredWhenNoLeaderOrHero(): void {
  section("1.07.04.05 - LEADER ANNOUNCEMENT: Required When No Leader Or Hero");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up with no leaders and no Cheap Hero
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [], // No leaders
      hand: [], // No Cheap Hero
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Invalid - no announcement
  const planNoAnnouncement = createValidBattlePlan(Faction.ATREIDES, 3);
  const resultNoAnnouncement = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNoAnnouncement, sector);
  assert(
    resultNoAnnouncement.valid === false,
    `Should reject plan without announcement when no leader/hero available`
  );
  assert(
    resultNoAnnouncement.errors.some(e => e.code === "MUST_ANNOUNCE_NO_LEADER"),
    `Should have MUST_ANNOUNCE_NO_LEADER error`
  );
  
  // Test: Valid - with announcement
  const planWithAnnouncement = {
    ...createValidBattlePlan(Faction.ATREIDES, 3),
    announcedNoLeader: true,
  };
  const resultWithAnnouncement = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWithAnnouncement, sector);
  assert(
    resultWithAnnouncement.valid === true,
    `Should accept plan with announcement when no leader/hero available`
  );
}

function testDedicatedLeader_CanFightMultipleTimesInSameTerritory(): void {
  section("1.07.04.04 - DEDICATED LEADER: Can Fight Multiple Times In Same Territory");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  const leaderId = "atreides_duncan_idaho";
  
  // Set up leader that already fought in same territory this turn
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [{
        definitionId: leaderId,
        faction: Faction.ATREIDES,
        strength: 5,
        location: LeaderLocation.ON_BOARD, // Survived previous battle
        hasBeenKilled: false,
        usedThisTurn: true, // Already used this turn
        usedInTerritoryId: territory, // In same territory
        originalFaction: Faction.ATREIDES,
        capturedBy: null,
      }],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Valid - can fight again in same territory
  const plan = createValidBattlePlan(Faction.ATREIDES, 3, leaderId);
  const result = validateBattlePlan(initialState, Faction.ATREIDES, territory, plan, sector);
  assert(
    result.valid === true,
    `Should allow leader to fight again in same territory (multiple battles rule)`
  );
}

function testDedicatedLeader_CannotFightInDifferentTerritories(): void {
  section("1.07.04.04 - DEDICATED LEADER: Cannot Fight In Different Territories");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory1 = TerritoryId.IMPERIAL_BASIN;
  const territory2 = TerritoryId.ARRAKEEN;
  const sector = 9;
  const leaderId = "atreides_duncan_idaho";
  
  // Set up leader that already fought in different territory this turn
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [{
        definitionId: leaderId,
        faction: Faction.ATREIDES,
        strength: 5,
        location: LeaderLocation.ON_BOARD, // Survived previous battle
        hasBeenKilled: false,
        usedThisTurn: true, // Already used this turn
        usedInTerritoryId: territory1, // In different territory
        originalFaction: Faction.ATREIDES,
        capturedBy: null,
      }],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory2, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Invalid - cannot fight in different territory
  const plan = createValidBattlePlan(Faction.ATREIDES, 3, leaderId);
  const result = validateBattlePlan(initialState, Faction.ATREIDES, territory2, plan, sector);
  assert(
    result.valid === false,
    `Should reject leader fighting in different territory`
  );
  assert(
    result.errors.some(e => e.code === "LEADER_ALREADY_USED"),
    `Should have LEADER_ALREADY_USED error`
  );
}

function testNoTreachery_CannotPlayTreacheryWithoutLeaderOrHero(): void {
  section("1.07.04.06 - NO TREACHERY: Cannot Play Treachery Without Leader Or Hero");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  
  // Set up with no leaders, no Cheap Hero, but has weapon card
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [], // No leaders
      hand: [{
        definitionId: "lasgun",
        type: "WEAPON_SPECIAL" as any,
        location: "hand" as any,
        ownerId: Faction.ATREIDES,
      }],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Invalid - weapon card without leader/hero
  const planWithWeapon = {
    ...createValidBattlePlan(Faction.ATREIDES, 3),
    announcedNoLeader: true,
    weaponCardId: "lasgun",
  };
  const resultWithWeapon = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWithWeapon, sector);
  assert(
    resultWithWeapon.valid === false,
    `Should reject plan with weapon card without leader/hero`
  );
  assert(
    resultWithWeapon.errors.some(e => e.code === "CANNOT_PLAY_TREACHERY_WITHOUT_LEADER"),
    `Should have CANNOT_PLAY_TREACHERY_WITHOUT_LEADER error`
  );
  
  // Test: Invalid - defense card without leader/hero
  const planWithDefense = {
    ...createValidBattlePlan(Faction.ATREIDES, 3),
    announcedNoLeader: true,
    defenseCardId: "shield_1",
  };
  const resultWithDefense = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWithDefense, sector);
  assert(
    resultWithDefense.valid === false,
    `Should reject plan with defense card without leader/hero`
  );
  assert(
    resultWithDefense.errors.some(e => e.code === "CANNOT_PLAY_TREACHERY_WITHOUT_LEADER"),
    `Should have CANNOT_PLAY_TREACHERY_WITHOUT_LEADER error for defense`
  );
  
  // Test: Valid - no treachery cards (announcement only)
  const planNoTreachery = {
    ...createValidBattlePlan(Faction.ATREIDES, 3),
    announcedNoLeader: true,
  };
  const resultNoTreachery = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNoTreachery, sector);
  assert(
    resultNoTreachery.valid === true,
    `Should accept plan without treachery cards when no leader/hero (must still battle)`
  );
}

function testTreacheryCards_OptionalWhenLeaderOrHeroPresent(): void {
  section("1.07.04.07 - TREACHERY CARDS: Optional When Leader Or Hero Present");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  const leaderId = "atreides_duncan_idaho";
  
  // Set up with leader and weapon/defense cards
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [{
        definitionId: leaderId,
        faction: Faction.ATREIDES,
        strength: 5,
        location: LeaderLocation.LEADER_POOL,
        hasBeenKilled: false,
        usedThisTurn: false,
        usedInTerritoryId: null,
        originalFaction: Faction.ATREIDES,
        capturedBy: null,
      }],
      hand: [
        {
          definitionId: "lasgun",
          type: "WEAPON_SPECIAL" as any,
          location: "hand" as any,
          ownerId: Faction.ATREIDES,
        },
        {
          definitionId: "shield_1",
          type: "DEFENSE" as any,
          location: "hand" as any,
          ownerId: Faction.ATREIDES,
        },
      ],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Valid - no treachery cards (optional)
  const planNoCards = createValidBattlePlan(Faction.ATREIDES, 3, leaderId);
  const resultNoCards = validateBattlePlan(initialState, Faction.ATREIDES, territory, planNoCards, sector);
  assert(
    resultNoCards.valid === true,
    `Should accept plan with leader but no treachery cards (optional)`
  );
  
  // Test: Valid - weapon card only
  const planWeapon = {
    ...createValidBattlePlan(Faction.ATREIDES, 3, leaderId),
    weaponCardId: "lasgun",
  };
  const resultWeapon = validateBattlePlan(initialState, Faction.ATREIDES, territory, planWeapon, sector);
  assert(
    resultWeapon.valid === true,
    `Should accept plan with weapon card`
  );
  
  // Test: Valid - defense card only
  const planDefense = {
    ...createValidBattlePlan(Faction.ATREIDES, 3, leaderId),
    defenseCardId: "shield_1",
  };
  const resultDefense = validateBattlePlan(initialState, Faction.ATREIDES, territory, planDefense, sector);
  assert(
    resultDefense.valid === true,
    `Should accept plan with defense card`
  );
  
  // Test: Valid - both weapon and defense
  const planBoth = {
    ...createValidBattlePlan(Faction.ATREIDES, 3, leaderId),
    weaponCardId: "lasgun",
    defenseCardId: "shield_1",
  };
  const resultBoth = validateBattlePlan(initialState, Faction.ATREIDES, territory, planBoth, sector);
  assert(
    resultBoth.valid === true,
    `Should accept plan with both weapon and defense cards`
  );
}

function testLeaderHeroExclusivity_CannotPlayBoth(): void {
  section("1.07.04.03 - LEADERS: Cannot Play Both Leader And Cheap Hero");

  const state = buildBaseState([Faction.ATREIDES]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 9;
  const leaderId = "atreides_duncan_idaho";
  
  // Set up with both leader and Cheap Hero
  const initialState = {
    ...state,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      leaders: [{
        definitionId: leaderId,
        faction: Faction.ATREIDES,
        strength: 5,
        location: LeaderLocation.LEADER_POOL,
        hasBeenKilled: false,
        usedThisTurn: false,
        usedInTerritoryId: null,
        originalFaction: Faction.ATREIDES,
        capturedBy: null,
      }],
      hand: [{
        definitionId: "cheap_hero_1",
        type: "SPECIAL" as any,
        location: "hand" as any,
        ownerId: Faction.ATREIDES,
      }],
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };
  
  // Test: Invalid - both leader and Cheap Hero
  const planBoth = createValidBattlePlan(Faction.ATREIDES, 3, leaderId, true);
  const resultBoth = validateBattlePlan(initialState, Faction.ATREIDES, territory, planBoth, sector);
  assert(
    resultBoth.valid === false,
    `Should reject plan with both leader and Cheap Hero`
  );
  assert(
    resultBoth.errors.some(e => e.code === "MUST_PLAY_LEADER_OR_CHEAP_HERO"),
    `Should have MUST_PLAY_LEADER_OR_CHEAP_HERO error (exclusivity)`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.04: BATTLE PLAN");
  console.log("=".repeat(80));

  testBattlePlan_RequestedFromBothPlayers();
  testBattleWheel_ForcesDialedRange();
  testLeaders_MustPlayWhenAvailable();
  testCheapHero_CanPlayInLieuOfLeader();
  testLeaderAnnouncement_RequiredWhenNoLeaderOrHero();
  testDedicatedLeader_CanFightMultipleTimesInSameTerritory();
  testDedicatedLeader_CannotFightInDifferentTerritories();
  testNoTreachery_CannotPlayTreacheryWithoutLeaderOrHero();
  testTreacheryCards_OptionalWhenLeaderOrHeroPresent();
  testLeaderHeroExclusivity_CannotPlayBoth();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

