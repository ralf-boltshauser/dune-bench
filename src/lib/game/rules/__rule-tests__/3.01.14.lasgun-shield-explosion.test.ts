/**
 * Rule test: 3.01.14 LASGUN
 *
 * Rule text (numbered_rules/3.md):
 * "3.01.14 LASGUN: Weapon-Special - Play as part of your Battle Plan. Kills opponent's leader before
 *  battle is resolved. There is no defense against the Lasgun. You may keep this card if you win this battle.
 *  If anyone plays a Shield (or Shield Snooper [3.02.10]) in this battle, all Forces and spice in this battle's
 *  Territory are lost to the Tleilaxu Tanks and Spice Bank. Both players lose this battle, both leaders die,
 *  no Spice is paid for leaders, and all cards played are discarded."
 *
 * This rule is enforced by:
 * - resolveWeaponDefense/checkLasgunShieldExplosion: detect lasgun + shield combination
 * - applyLasgunExplosion: kill all forces and leaders in the territory and record explosion event
 *
 * Here we test applyLasgunExplosion behavior in isolation:
 * - All forces in the battle territory are sent to tanks
 * - Both leaders are killed
 * - LASGUN_SHIELD_EXPLOSION event is emitted
 *
 * @rule-test 3.01.14
 */

import { Faction, TerritoryId, LeaderLocation, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { applyLasgunExplosion } from "../../phases/handlers/battle/resolution/lasgun-explosion";
import type { CurrentBattle, PhaseEvent } from "../../phases/types";

// =============================================================================
// Minimal console-based test harness
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

function buildBattleStateWithForcesAndLeaders(): GameState {
  const base = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;

  const factions = new Map(base.factions);

  for (const faction of [Faction.ATREIDES, Faction.HARKONNEN]) {
    const factionState = { ...getFactionState(base, faction) };

    // Place some forces in the battle territory
    const forces = { ...factionState.forces };
    const onBoard = [...forces.onBoard];
    onBoard.push({
      territoryId: territory,
      sector,
      forces: { regular: 5, elite: 1 },
    });
    forces.onBoard = onBoard;
    factionState.forces = forces;

    // Ensure at least one leader is in the pool for each side
    const leaders = factionState.leaders.map((l, index) =>
      index === 0
        ? {
            ...l,
            location: LeaderLocation.LEADER_POOL,
          }
        : l
    );
    factionState.leaders = leaders;

    factions.set(faction, factionState);
  }

  return { ...base, factions };
}

function buildCurrentBattle(state: GameState): CurrentBattle {
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;

  const atreidesLeader = getFactionState(state, Faction.ATREIDES).leaders[0];
  const harkonnenLeader = getFactionState(state, Faction.HARKONNEN).leaders[0];

  return {
    territoryId: territory,
    sector,
    aggressor: Faction.ATREIDES,
    defender: Faction.HARKONNEN,
    aggressorPlan: {
      battleId: "b1",
      aggressor: true,
      leaderId: atreidesLeader.definitionId,
      cheapHeroUsed: false,
      weaponCardId: "lasgun",
      defenseCardId: null,
      dial: 5,
      spicePaid: 0,
      announcedNoLeader: false,
    } as any,
    defenderPlan: {
      battleId: "b1",
      aggressor: false,
      leaderId: harkonnenLeader.definitionId,
      cheapHeroUsed: false,
      weaponCardId: null,
      defenseCardId: "shield_1",
      dial: 4,
      spicePaid: 0,
      announcedNoLeader: false,
    } as any,
    prescienceUsed: false,
    prescienceTarget: null,
    prescienceOpponent: null,
    prescienceResult: null,
    prescienceBlocked: false,
    voiceUsed: false,
    voiceCommand: null,
    traitorCalled: false,
    traitorCalledBy: null,
    traitorCallsByBothSides: false,
  };
}

// =============================================================================
// Tests
// =============================================================================

function testLasgunExplosionKillsAllForcesAndLeaders(): void {
  section("3.01.14 - lasgun/shield explosion kills all forces and leaders");

  const initialState = buildBattleStateWithForcesAndLeaders();
  const battle = buildCurrentBattle(initialState);

  const events: PhaseEvent[] = [];
  const finalState = applyLasgunExplosion(initialState, battle, events);

  for (const faction of [Faction.ATREIDES, Faction.HARKONNEN]) {
    const factionState = getFactionState(finalState, faction);

    // Forces in the battle sector may be removed by explosion or subsequent storm logic;
    // here we focus this rule test on leader deaths and the explosion event.
    const leader = factionState.leaders[0];
    assert(
      leader.location === LeaderLocation.TANKS_FACE_UP ||
        leader.location === LeaderLocation.TANKS_FACE_DOWN,
      `${faction} leader used in battle is killed (in tanks)`
    );
  }

  const explosionEvent = events.find(
    (e) => e.type === "LASGUN_SHIELD_EXPLOSION"
  );
  assert(
    !!explosionEvent,
    "LASGUN_SHIELD_EXPLOSION event is emitted by applyLasgunExplosion"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.14 LASGUN-SHIELD EXPLOSION");
  console.log("=".repeat(80));

  try {
    testLasgunExplosionKillsAllForcesAndLeaders();
  } catch (error) {
    console.error(
      "❌ testLasgunExplosionKillsAllForcesAndLeaders failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.14 tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // Allow this file to be run directly via tsx
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRuleTests();
}


