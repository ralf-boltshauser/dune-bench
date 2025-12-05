/**
 * Rule test: 2.04.07 SHAI-HULUD
 * @rule-test 2.04.07
 *
 * Rule text (numbered_rules/2.md):
 * "2.04.07 SHAI-HULUD: When Shai-Hulud appears in a Territory where you have Forces, they are not devoured.✷"
 *
 * These tests verify:
 * - Fremen forces are not devoured when Shai-Hulud appears in their territory
 * - Other factions' forces ARE devoured
 * - This applies to all Fremen forces in the territory
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { executeDevour } from "../../phases/handlers/spice-blow/shai-hulud/devouring";
import type { SpiceBlowContext } from "../../phases/handlers/spice-blow/types";

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
  return createGameState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.04.07 – SHAI-HULUD: Fremen forces not devoured
// =============================================================================

function testShaiHulud_FremenForcesNotDevoured(): void {
  section("2.04.07 - Fremen forces are not devoured when Shai-Hulud appears");

  let state = buildBaseState();
  const territory = TerritoryId.GREAT_FLAT;
  const sector = 8;

  // Set up Fremen forces in territory
  const fremenState = getFactionState(state, Faction.FREMEN);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.FREMEN, {
      ...fremenState,
      forces: {
        ...fremenState.forces,
        onBoard: [
          { factionId: Faction.FREMEN, territoryId: territory, sector, forces: { regular: 5, elite: 0 } },
        ],
      },
    }),
  };

  const initialFremenForces = getFactionState(state, Faction.FREMEN).forces.onBoard.find(
    (s) => s.territoryId === territory && s.sector === sector
  )?.forces.regular ?? 0;

  // Execute devouring
  const context: SpiceBlowContext = {
    lastSpiceLocation: { territoryId: territory, sector },
    fremenProtectionDecision: null,
  };
  const events: any[] = [];
  const result = executeDevour(state, { territoryId: territory, sector }, events, context);
  const finalState = result.state;

  // Check that Fremen forces remain
  const finalFremenForces = getFactionState(finalState, Faction.FREMEN).forces.onBoard.find(
    (s) => s.territoryId === territory && s.sector === sector
  )?.forces.regular ?? 0;

  assert(
    finalFremenForces === initialFremenForces,
    `Fremen forces are not devoured: ${initialFremenForces} forces remain (got ${finalFremenForces})`
  );
}

function testShaiHulud_OtherFactionsDevoured(): void {
  section("2.04.07 - Other factions' forces ARE devoured when Shai-Hulud appears");

  let state = buildBaseState();
  const territory = TerritoryId.GREAT_FLAT;
  const sector = 8;

  // Set up Atreides forces in territory
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [
          { factionId: Faction.ATREIDES, territoryId: territory, sector, forces: { regular: 5, elite: 0 } },
        ],
      },
    }),
  };

  const initialAtreidesForces = getFactionState(state, Faction.ATREIDES).forces.onBoard.find(
    (s) => s.territoryId === territory && s.sector === sector
  )?.forces.regular ?? 0;

  // Execute devouring
  const context: SpiceBlowContext = {
    lastSpiceLocation: { territoryId: territory, sector },
    fremenProtectionDecision: null,
  };
  const events: any[] = [];
  const result = executeDevour(state, { territoryId: territory, sector }, events, context);
  const finalState = result.state;

  // Check that Atreides forces are devoured
  const finalAtreidesForces = getFactionState(finalState, Faction.ATREIDES).forces.onBoard.find(
    (s) => s.territoryId === territory && s.sector === sector
  )?.forces.regular ?? 0;

  assert(
    finalAtreidesForces === 0,
    `Other factions' forces are devoured: 0 forces remain (got ${finalAtreidesForces}, started with ${initialAtreidesForces})`
  );
}

function testShaiHulud_MixedForces(): void {
  section("2.04.07 - Only Fremen forces survive when mixed with other factions");

  let state = buildBaseState();
  const territory = TerritoryId.GREAT_FLAT;
  const sector = 8;

  // Set up both Fremen and Atreides forces in territory
  const fremenState = getFactionState(state, Faction.FREMEN);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.FREMEN, {
        ...fremenState,
        forces: {
          ...fremenState.forces,
          onBoard: [
            { factionId: Faction.FREMEN, territoryId: territory, sector, forces: { regular: 3, elite: 0 } },
          ],
        },
      })
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: territory, sector, forces: { regular: 5, elite: 0 } },
          ],
        },
      }),
  };

  const initialFremenForces = 3;
  const initialAtreidesForces = 5;

  // Execute devouring
  const context: SpiceBlowContext = {
    lastSpiceLocation: { territoryId: territory, sector },
    fremenProtectionDecision: null,
  };
  const events: any[] = [];
  const result = executeDevour(state, { territoryId: territory, sector }, events, context);
  const finalState = result.state;

  // Check results
  const finalFremenForces = getFactionState(finalState, Faction.FREMEN).forces.onBoard.find(
    (s) => s.territoryId === territory && s.sector === sector
  )?.forces.regular ?? 0;
  const finalAtreidesForces = getFactionState(finalState, Faction.ATREIDES).forces.onBoard.find(
    (s) => s.territoryId === territory && s.sector === sector
  )?.forces.regular ?? 0;

  assert(
    finalFremenForces === initialFremenForces,
    `Fremen forces survive: ${initialFremenForces} forces remain (got ${finalFremenForces})`
  );
  assert(
    finalAtreidesForces === 0,
    `Atreides forces are devoured: 0 forces remain (got ${finalAtreidesForces}, started with ${initialAtreidesForces})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.07 SHAI-HULUD");
  console.log("=".repeat(80));

  try {
    testShaiHulud_FremenForcesNotDevoured();
    testShaiHulud_OtherFactionsDevoured();
    testShaiHulud_MixedForces();
  } catch (error) {
    console.error("Unexpected error during 2.04.07 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.04.07 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

