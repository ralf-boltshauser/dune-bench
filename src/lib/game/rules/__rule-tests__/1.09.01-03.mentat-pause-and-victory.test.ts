/**
 * Rule tests: 1.09.01–1.09.03 (Mentat Pause & Stronghold Victory)
 *
 * @rule-test 1.09.01
 * @rule-test 1.09.02
 * @rule-test 1.09.02.02
 * @rule-test 1.09.02.03
 * @rule-test 1.09.03
 *
 * Rule text (numbered_rules/1.md):
 * 1.09.01 COLLECT BRIBE SPICE: Add any spice from in front of your shield to your spice reserves.
 * 1.09.02 Stronghold Victory.
 * 1.09.02.02 Unallied Stronghold Victory: The requirement for an Unallied player to win is to Control three or more Strongholds with at least one of their Forces during the Mentat Pause Phase.
 * 1.09.02.03 Allied Stronghold Victory: The requirement for an Alliance to win is to Control, between the Allied players, a total of four or more Strongholds with at least one or more Forces during the Mentat Pause Phase.
 * 1.09.03 MULTIPLE WINNERS: When multiple player(s) and/or alliance(s) meet the requirements for a stronghold victory only the player or alliance first in Storm Order wins the game.
 */

import { Faction, Phase, TerritoryId, AllianceStatus, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { MentatPausePhaseHandler } from "../../phases/handlers/mentat-pause";
import { checkVictoryConditions } from "../../rules/victory";

// =============================================================================
// Minimal test harness
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

function buildBaseState(): GameState {
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    turn: 5,
    phase: Phase.MENTAT_PAUSE,
    advancedRules: false,
  });

  return {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  };
}

// =============================================================================
// Tests
// =============================================================================

function testCollectBribeSpice(): void {
  section("1.09.01 - Collect bribe spice into reserves");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const updatedAtreides = {
    ...atreidesState,
    spice: 5,
    spiceBribes: 7,
  };

  const initialState: GameState = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, updatedAtreides),
  };

  const handler = new MentatPausePhaseHandler();
  const result = handler.initialize(initialState);
  const finalState = result.state;
  const finalAtreides = getFactionState(finalState, Faction.ATREIDES);

  assert(
    finalAtreides.spice === 12,
    `Bribes should be added to reserves (5 + 7), got ${finalAtreides.spice}`
  );
  assert(
    finalAtreides.spiceBribes === 0,
    `spiceBribes should be reset to 0 after collection, got ${finalAtreides.spiceBribes}`
  );
}

function testStrongholdVictory_soloThreeStrongholds(): void {
  section("1.09.02.02 - Solo stronghold victory at 3 strongholds");

  const state = buildBaseState();

  // Give Atreides uncontested control of 3 strongholds
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);

  const updatedState: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            {
              factionId: Faction.ATREIDES,
              territoryId: TerritoryId.ARRAKEEN,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
            {
              factionId: Faction.ATREIDES,
              territoryId: TerritoryId.CARTHAG,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
            {
              factionId: Faction.ATREIDES,
              territoryId: TerritoryId.SIETCH_TABR,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
          ],
        },
      })
      // Ensure other factions have no forces in those strongholds so control is clear
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [],
        },
      }),
  };

  const result = checkVictoryConditions(updatedState);

  assert(!!result, "Solo stronghold victory should be detected");
  if (result) {
    assert(
      result.winners.length === 1 && result.winners[0] === Faction.ATREIDES,
      `Winner should be Atreides, got ${result.winners.join(", ")}`
    );
  }
}

function testStrongholdVictory_alliedFourStrongholds(): void {
  section("1.09.02.03 - Allied stronghold victory at 4 combined strongholds");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);

  const atreidesAllied: typeof atreidesState = {
    ...atreidesState,
    allianceStatus: AllianceStatus.ALLIED,
    allyId: Faction.HARKONNEN,
  };
  const harkonnenAllied: typeof harkonnenState = {
    ...harkonnenState,
    allianceStatus: AllianceStatus.ALLIED,
    allyId: Faction.ATREIDES,
  };

  const updatedState: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesAllied,
        forces: {
          ...atreidesAllied.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: TerritoryId.ARRAKEEN, sector: 1, forces: { regular: 1, elite: 0 } },
            { factionId: Faction.ATREIDES, territoryId: TerritoryId.CARTHAG, sector: 1, forces: { regular: 1, elite: 0 } },
          ],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenAllied,
        forces: {
          ...harkonnenAllied.forces,
          onBoard: [
            { factionId: Faction.HARKONNEN, territoryId: TerritoryId.SIETCH_TABR, sector: 1, forces: { regular: 1, elite: 0 } },
            { factionId: Faction.HARKONNEN, territoryId: TerritoryId.HABBANYA_SIETCH, sector: 1, forces: { regular: 1, elite: 0 } },
          ],
        },
      }),
  };

  const result = checkVictoryConditions(updatedState);

  assert(!!result, "Allied stronghold victory should be detected");
  if (result) {
    const winners = result.winners.slice().sort();
    const expected = [Faction.ATREIDES, Faction.HARKONNEN].sort();
    assert(
      winners.length === 2 && winners[0] === expected[0] && winners[1] === expected[1],
      `Winners should be Atreides & Harkonnen, got ${winners.join(" & ")}`
    );
  }
}

function testStrongholdVictory_multipleWinnersStormOrder(): void {
  section("1.09.03 - Multiple winners resolved by storm order");

  const state = buildBaseState();

  // Give Atreides and Harkonnen each 3 strongholds
  let newState: GameState = state;

  const atreidesState = getFactionState(newState, Faction.ATREIDES);
  newState = {
    ...newState,
    factions: new Map(newState.factions).set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [
          { factionId: Faction.ATREIDES, territoryId: TerritoryId.ARRAKEEN, sector: 1, forces: { regular: 1, elite: 0 } },
          { factionId: Faction.ATREIDES, territoryId: TerritoryId.CARTHAG, sector: 1, forces: { regular: 1, elite: 0 } },
          { factionId: Faction.ATREIDES, territoryId: TerritoryId.SIETCH_TABR, sector: 1, forces: { regular: 1, elite: 0 } },
        ],
      },
    }),
  };

  const harkonnenState2 = getFactionState(newState, Faction.HARKONNEN);
  newState = {
    ...newState,
    factions: new Map(newState.factions).set(Faction.HARKONNEN, {
      ...harkonnenState2,
      forces: {
        ...harkonnenState2.forces,
        onBoard: [
          { factionId: Faction.HARKONNEN, territoryId: TerritoryId.HABBANYA_SIETCH, sector: 1, forces: { regular: 1, elite: 0 } },
          { factionId: Faction.HARKONNEN, territoryId: TerritoryId.TUEKS_SIETCH, sector: 1, forces: { regular: 1, elite: 0 } },
          { factionId: Faction.HARKONNEN, territoryId: TerritoryId.IMPERIAL_BASIN, sector: 1, forces: { regular: 1, elite: 0 } },
        ],
      },
    }),
  };

  // Storm order: [ATREIDES, HARKONNEN, EMPEROR] from buildBaseState
  const result = checkVictoryConditions(newState);

  assert(!!result, "Stronghold victory should be detected");
  if (result) {
    assert(
      result.winners.length === 1 && result.winners[0] === Faction.ATREIDES,
      `Atreides should win as first in storm order among tied stronghold winners, got ${result.winners.join(", ")}`
    );
  }
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rules 1.09.01–1.09.03: MENTAT PAUSE & STRONGHOLD VICTORY");
  console.log("=".repeat(80));

  testCollectBribeSpice();
  testStrongholdVictory_soloThreeStrongholds();
  testStrongholdVictory_alliedFourStrongholds();
  testStrongholdVictory_multipleWinnersStormOrder();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
