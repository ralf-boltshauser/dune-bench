/**
 * Rule tests: 1.08.01–1.08.03 (Spice Collection Phase)
 *
 * @rule-test 1.08.01
 * @rule-test 1.08.02
 * @rule-test 1.08.03
 *
 * Rule text (numbered_rules/1.md):
 * 1.08.01 HARVESTING SPICE: Any player whose Forces Occupy a Sector of a Territory in which there is spice may now collect that spice. This is done by taking the spice tokens you are entitled to from the Territory and Putting them behind your shield.
 * 1.08.02 COLLECTION RATE: The collection rate of spice for each Force is 2 spice per Force. If the player occupies Carthag and/or Arrakeen their collection rate is now 3 spice per Force.
 * 1.08.03 UNCLAIMED SPICE: Uncollected spice remains where it is for future turns.
 *
 * These tests verify:
 * - Forces in a territory with spice collect automatically
 * - Collection rate is 2 per fighter by default
 * - Collection rate becomes 3 per fighter when the faction occupies Arrakeen or Carthag (fighters, not advisors)
 * - Advisors do not collect spice
 * - Storm separation (via areSectorsSeparatedByStorm) prevents collection across a storm sector
 * - Uncollected spice remains in the territory (Math.min limit)
 */

import { Faction, Phase, TerritoryId, TerritoryType, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { SpiceCollectionPhaseHandler } from "../../phases/handlers/spice-collection";

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

function buildBaseState(): GameState {
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    turn: 1,
    phase: Phase.SPICE_COLLECTION,
    advancedRules: false,
  });

  // Normalize starting spice so tests can assert exact collection amounts
  const atreides = getFactionState(state, Faction.ATREIDES);
  const harkonnen = getFactionState(state, Faction.HARKONNEN);

  const factions = new Map(state.factions)
    .set(Faction.ATREIDES, { ...atreides, spice: 0 })
    .set(Faction.HARKONNEN, { ...harkonnen, spice: 0 });

  return {
    ...state,
    factions,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN],
    stormSector: 0,
  };
}

// =============================================================================
// Tests for 1.08.01–1.08.03
// =============================================================================

function testSpiceCollection_basicTwoPerForce(): void {
  section("1.08.01/02 - basic collection at 2 spice per fighter");

  const state = buildBaseState();

  // Put 3 Atreides fighters in Imperial Basin sector 1
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const newAtreides = {
    ...atreidesState,
    forces: {
      ...atreidesState.forces,
      onBoard: [
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.IMPERIAL_BASIN,
          sector: 1,
          forces: { regular: 3, elite: 0 },
        },
      ],
    },
  };

  // Put 10 spice in Imperial Basin sector 2 (same territory, different sector)
  const initialState: GameState = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, newAtreides),
    spiceOnBoard: [
      {
        territoryId: TerritoryId.IMPERIAL_BASIN,
        sector: 2,
        amount: 10,
      },
    ],
  };

  const handler = new SpiceCollectionPhaseHandler();
  const result = handler.initialize(initialState);
  const finalState = result.state;

  const atreidesAfter = getFactionState(finalState, Faction.ATREIDES);

  // 3 fighters × 2 spice = 6, limited by 10 available
  assert(
    atreidesAfter.spice === 6,
    `Atreides should collect 6 spice (3 fighters × 2), got ${atreidesAfter.spice}`
  );

  const remainingSpice = finalState.spiceOnBoard.find(
    (s) => s.territoryId === TerritoryId.IMPERIAL_BASIN && s.sector === 2
  )?.amount ?? 0;

  assert(
    remainingSpice === 4,
    `Remaining spice should be 4 (10 - 6), got ${remainingSpice}`
  );
}

function testSpiceCollection_ornithopterBonusThreePerForce(): void {
  section("1.08.02 - collection at 3 per fighter when occupying Arrakeen");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const newAtreides = {
    ...atreidesState,
    forces: {
      ...atreidesState.forces,
      onBoard: [
        // Fighters in Arrakeen (grant ornithopters)
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.ARRAKEEN,
          sector: 1,
          forces: { regular: 1, elite: 0 },
        },
        // Fighters in Imperial Basin collecting spice
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.IMPERIAL_BASIN,
          sector: 3,
          forces: { regular: 2, elite: 0 },
        },
      ],
    },
  };

  const initialState: GameState = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, newAtreides),
    spiceOnBoard: [
      {
        territoryId: TerritoryId.IMPERIAL_BASIN,
        sector: 2,
        amount: 20,
      },
    ],
  };

  const handler = new SpiceCollectionPhaseHandler();
  const result = handler.initialize(initialState);
  const finalState = result.state;

  const atreidesAfter = getFactionState(finalState, Faction.ATREIDES);

  // Ornithopter bonus: 3 spice per fighter everywhere
  // 2 fighters in Imperial Basin × 3 = 6 spice
  assert(
    atreidesAfter.spice === 6,
    `Atreides should collect 6 spice (2 fighters × 3 with Arrakeen bonus), got ${atreidesAfter.spice}`
  );
}

function testSpiceCollection_advisorsDoNotCollect(): void {
  section("1.08.01/02 - advisors do not collect spice");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const newAtreides = {
    ...atreidesState,
    forces: {
      ...atreidesState.forces,
      onBoard: [
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.IMPERIAL_BASIN,
          sector: 1,
          forces: { regular: 0, elite: 0 },
          advisors: 3,
        } as any,
      ],
    },
  };

  const initialState: GameState = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, newAtreides),
    spiceOnBoard: [
      {
        territoryId: TerritoryId.IMPERIAL_BASIN,
        sector: 2,
        amount: 10,
      },
    ],
  };

  const handler = new SpiceCollectionPhaseHandler();
  const result = handler.initialize(initialState);
  const finalState = result.state;

  const atreidesAfter = getFactionState(finalState, Faction.ATREIDES);
  const remainingSpice = finalState.spiceOnBoard.find(
    (s) => s.territoryId === TerritoryId.IMPERIAL_BASIN && s.sector === 2
  )?.amount ?? 0;

  assert(
    atreidesAfter.spice === 0,
    `Advisors alone should not collect spice, got ${atreidesAfter.spice}`
  );
  assert(
    remainingSpice === 10,
    `Spice should remain uncollected when only advisors are present, got ${remainingSpice}`
  );
}

function testSpiceCollection_stormSeparationPreventsCollection(): void {
  section("1.08.01 + 1.01.04 - storm separation blocks collection across storm");

  const state = buildBaseState();

  // For simplicity, rely on areSectorsSeparatedByStorm via stormSector positioning
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const newAtreides = {
    ...atreidesState,
    forces: {
      ...atreidesState.forces,
      onBoard: [
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.IMPERIAL_BASIN,
          sector: 1,
          forces: { regular: 2, elite: 0 },
        },
      ],
    },
  };

  const initialState: GameState = {
    ...state,
    stormSector: 1, // put storm between sector 1 and 2 (implementation-specific, but ensures separation)
    factions: new Map(state.factions).set(Faction.ATREIDES, newAtreides),
    spiceOnBoard: [
      {
        territoryId: TerritoryId.IMPERIAL_BASIN,
        sector: 2,
        amount: 10,
      },
    ],
  };

  const handler = new SpiceCollectionPhaseHandler();
  const result = handler.initialize(initialState);
  const finalState = result.state;

  const atreidesAfter = getFactionState(finalState, Faction.ATREIDES);
  const remainingSpice = finalState.spiceOnBoard.find(
    (s) => s.territoryId === TerritoryId.IMPERIAL_BASIN && s.sector === 2
  )?.amount ?? 0;

  assert(
    atreidesAfter.spice === 0,
    `Forces separated from spice by storm should not collect, got ${atreidesAfter.spice}`
  );
  assert(
    remainingSpice === 10,
    `Spice should remain when separated by storm, got ${remainingSpice}`
  );
}

function testSpiceCollection_uncollectedSpiceRemains(): void {
  section("1.08.03 - uncollected spice remains in territory");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const newAtreides = {
    ...atreidesState,
    forces: {
      ...atreidesState.forces,
      onBoard: [
        {
          factionId: Faction.ATREIDES,
          territoryId: TerritoryId.IMPERIAL_BASIN,
          sector: 1,
          forces: { regular: 1, elite: 0 },
        },
      ],
    },
  };

  const initialState: GameState = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, newAtreides),
    spiceOnBoard: [
      {
        territoryId: TerritoryId.IMPERIAL_BASIN,
        sector: 2,
        amount: 1, // Only 1 spice here
      },
    ],
  };

  const handler = new SpiceCollectionPhaseHandler();
  const result = handler.initialize(initialState);
  const finalState = result.state;

  const atreidesAfter = getFactionState(finalState, Faction.ATREIDES);

  // 1 fighter × 2 = 2 max, but only 1 spice is present → collect 1
  assert(
    atreidesAfter.spice === 1,
    `Atreides should collect only 1 spice (limited by available), got ${atreidesAfter.spice}`
  );

  const remainingSpice = finalState.spiceOnBoard.find(
    (s) => s.territoryId === TerritoryId.IMPERIAL_BASIN && s.sector === 2
  )?.amount ?? 0;

  assert(
    remainingSpice === 0,
    `No spice should remain in this simple case (all collected), got ${remainingSpice}`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rules 1.08.01–1.08.03: SPICE COLLECTION");
  console.log("=".repeat(80));

  testSpiceCollection_basicTwoPerForce();
  testSpiceCollection_ornithopterBonusThreePerForce();
  testSpiceCollection_advisorsDoNotCollect();
  testSpiceCollection_stormSeparationPreventsCollection();
  testSpiceCollection_uncollectedSpiceRemains();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
