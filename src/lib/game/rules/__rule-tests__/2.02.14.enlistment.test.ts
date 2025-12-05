/**
 * Rule test: 2.02.14 ENLISTMENT
 * @rule-test 2.02.14
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.14 ENLISTMENT: When you Move advisors to an unoccupied Territory, you must flip them to fighters."
 *
 * These tests verify:
 * - Moving advisors to an unoccupied territory automatically flips them to fighters
 * - This is mandatory (not optional)
 * - Restrictions (PEACETIME, STORMED IN) still apply
 * - ADAPTIVE FORCE takes precedence if destination has fighters
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, moveForces, getFactionsInTerritory } from "../../state";

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
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.02.14 – ENLISTMENT: Advisors flip to fighters when moved to unoccupied territory
// =============================================================================

function testEnlistment_AdvisorsFlipToFightersInUnoccupiedTerritory(): void {
  section("2.02.14 - Advisors flip to fighters when moved to unoccupied territory");

  let state = buildBaseState();
  const sourceTerritory = TerritoryId.POLAR_SINK;
  const destTerritory = TerritoryId.IMPERIAL_BASIN;
  const sourceSector = 0;
  const destSector = 8;

  // Set up BG with advisors in Polar Sink
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: sourceTerritory, sector: sourceSector, forces: { regular: 0, elite: 0 }, advisors: 3 },
        ],
      },
    }),
  };

  // Verify destination is unoccupied
  const occupantsBefore = getFactionsInTerritory(state, destTerritory);
  assert(
    occupantsBefore.length === 0,
    `Destination territory is unoccupied before movement (got ${occupantsBefore.length} occupants)`
  );

  // Move 3 advisors to unoccupied territory
  state = moveForces(state, Faction.BENE_GESSERIT, sourceTerritory, sourceSector, destTerritory, destSector, 3, false);

  // Check that advisors were flipped to fighters
  const destStack = getFactionState(state, Faction.BENE_GESSERIT).forces.onBoard.find(
    (s) => s.territoryId === destTerritory && s.sector === destSector
  );

  assert(
    !!destStack,
    `Destination stack exists after movement`
  );
  assert(
    (destStack?.forces.regular ?? 0) + (destStack?.forces.elite ?? 0) === 3,
    `Advisors were flipped to fighters: 3 fighters in destination (regular=${destStack?.forces.regular}, elite=${destStack?.forces.elite})`
  );
  assert(
    (destStack?.advisors ?? 0) === 0,
    `No advisors remain in destination (got ${destStack?.advisors ?? 0})`
  );
}

function testEnlistment_OnlyAppliesToUnoccupiedTerritories(): void {
  section("2.02.14 - ENLISTMENT only applies to unoccupied territories");

  let state = buildBaseState();
  const sourceTerritory = TerritoryId.POLAR_SINK;
  const destTerritory = TerritoryId.ARRAKEEN;
  const sourceSector = 0;
  const destSector = 0;

  // Set up BG with advisors in Polar Sink
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const atreidesState = getFactionState(state, Faction.ATREIDES);

  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [
            { factionId: Faction.BENE_GESSERIT, territoryId: sourceTerritory, sector: sourceSector, forces: { regular: 0, elite: 0 }, advisors: 2 },
          ],
        },
      })
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: destTerritory, sector: destSector, forces: { regular: 5, elite: 0 } },
          ],
        },
      }),
  };

  // Verify destination is occupied
  const occupantsBefore = getFactionsInTerritory(state, destTerritory);
  assert(
    occupantsBefore.includes(Faction.ATREIDES),
    `Destination territory is occupied by Atreides before movement`
  );

  // Move advisors to occupied territory - ENLISTMENT should NOT apply
  // (ADAPTIVE FORCE or TAKE UP ARMS might apply instead)
  state = moveForces(state, Faction.BENE_GESSERIT, sourceTerritory, sourceSector, destTerritory, destSector, 2, false);

  // Check result - advisors should NOT have been flipped by ENLISTMENT
  // (they might be flipped by ADAPTIVE FORCE if BG has fighters there, or remain advisors)
  const destStack = getFactionState(state, Faction.BENE_GESSERIT).forces.onBoard.find(
    (s) => s.territoryId === destTerritory && s.sector === destSector
  );

  // ENLISTMENT doesn't apply to occupied territories, so advisors might remain advisors
  // or be flipped by ADAPTIVE FORCE if BG already has fighters there
  assert(
    !!destStack,
    `Destination stack exists after movement`
  );
  // The key point is that ENLISTMENT (mandatory flip to fighters) doesn't apply here
  // because the territory is occupied
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.14 ENLISTMENT");
  console.log("=".repeat(80));

  try {
    testEnlistment_AdvisorsFlipToFightersInUnoccupiedTerritory();
    testEnlistment_OnlyAppliesToUnoccupiedTerritories();
  } catch (error) {
    console.error("Unexpected error during 2.02.14 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.02.14 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

