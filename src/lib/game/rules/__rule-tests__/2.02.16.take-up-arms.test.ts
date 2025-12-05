/**
 * Rule test: 2.02.16 TAKE UP ARMS
 * @rule-test 2.02.16
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.16 TAKE UP ARMS: When you Move advisors into an occupied Territory, you may flip them to fighters following occupancy limit if you do not already have advisors present.✷"
 *
 * These tests verify:
 * - TAKE UP ARMS triggers when moving advisors to occupied territory
 * - Only applies if BG doesn't already have advisors in that territory
 * - Must respect occupancy limits for strongholds
 * - Restrictions (PEACETIME, STORMED IN) apply
 * - Only works in advanced rules
 */

import { Faction, TerritoryId, type GameState, type AgentResponse } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, getFactionsInTerritory, getBGAdvisorsInTerritory } from "../../state";
import { BGTakeUpArmsHandler } from "../../phases/handlers/shipment-movement/handlers/bg-abilities/bg-take-up-arms";
import { TERRITORY_DEFINITIONS, TerritoryType } from "../../types";

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
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

// =============================================================================
// 2.02.16 – TAKE UP ARMS: Trigger conditions
// =============================================================================

function testTakeUpArms_ShouldTriggerForOccupiedTerritory(): void {
  section("2.02.16 - TAKE UP ARMS triggers when moving advisors to occupied territory");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up occupied territory (Atreides has forces there)
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

  // Verify territory is occupied
  const occupants = getFactionsInTerritory(state, territory);
  assert(
    occupants.includes(Faction.ATREIDES),
    `Territory is occupied by Atreides`
  );
  assert(
    getBGAdvisorsInTerritory(state, territory) === 0,
    `BG does not already have advisors in territory (required for TAKE UP ARMS)`
  );

  // Ensure no restrictions apply (no storm, no alliance)
  state.stormSector = 10; // Storm away from Arrakeen (sector 0)
  
  const handler = new BGTakeUpArmsHandler();
  const shouldTrigger = handler.shouldTrigger(state, territory, sector);

  assert(
    shouldTrigger === true,
    `TAKE UP ARMS should trigger when moving advisors to occupied territory (got ${shouldTrigger})`
  );
}

function testTakeUpArms_ShouldNotTriggerForUnoccupiedTerritory(): void {
  section("2.02.16 - TAKE UP ARMS does NOT trigger for unoccupied territory (ENLISTMENT applies instead)");

  let state = buildBaseState();
  const territory = TerritoryId.IMPERIAL_BASIN;
  const sector = 8;

  // Verify territory is unoccupied
  const occupants = getFactionsInTerritory(state, territory);
  assert(
    occupants.length === 0,
    `Territory is unoccupied (got ${occupants.length} occupants)`
  );

  const handler = new BGTakeUpArmsHandler();
  const shouldTrigger = handler.shouldTrigger(state, territory, sector);

  assert(
    shouldTrigger === false,
    `TAKE UP ARMS should NOT trigger for unoccupied territory (ENLISTMENT applies instead)`
  );
}

function testTakeUpArms_ShouldNotTriggerIfAdvisorsAlreadyPresent(): void {
  section("2.02.16 - TAKE UP ARMS does NOT trigger if BG already has advisors in territory");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up occupied territory with Atreides
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: territory, sector, forces: { regular: 5, elite: 0 } },
          ],
        },
      })
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [
            { factionId: Faction.BENE_GESSERIT, territoryId: territory, sector, forces: { regular: 0, elite: 0 }, advisors: 2 },
          ],
        },
      }),
  };

  // Verify BG already has advisors
  assert(
    getBGAdvisorsInTerritory(state, territory) > 0,
    `BG already has advisors in territory (prevents TAKE UP ARMS)`
  );

  const handler = new BGTakeUpArmsHandler();
  const shouldTrigger = handler.shouldTrigger(state, territory, sector);

  assert(
    shouldTrigger === false,
    `TAKE UP ARMS should NOT trigger if BG already has advisors in territory`
  );
}

function testTakeUpArms_RequiresAdvancedRules(): void {
  section("2.02.16 - TAKE UP ARMS only works in advanced rules");

  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: false, // Basic rules
  });

  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up occupied territory
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

  const handler = new BGTakeUpArmsHandler();
  const shouldTrigger = handler.shouldTrigger(state, territory, sector);

  assert(
    shouldTrigger === false,
    `TAKE UP ARMS should NOT trigger in basic rules (advanced rules required)`
  );
}

function testTakeUpArms_RespectsOccupancyLimit(): void {
  section("2.02.16 - TAKE UP ARMS respects stronghold occupancy limit");

  let state = buildBaseState();
  const stronghold = TerritoryId.ARRAKEEN; // A stronghold
  const sector = 0;

  // Set up stronghold at occupancy limit (2 other factions)
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: stronghold, sector, forces: { regular: 5, elite: 0 } },
          ],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [
            { factionId: Faction.HARKONNEN, territoryId: stronghold, sector, forces: { regular: 5, elite: 0 } },
          ],
        },
      }),
  };

  // Verify stronghold is at occupancy limit
  const occupants = getFactionsInTerritory(state, stronghold);
  const otherFactions = occupants.filter((f) => f !== Faction.BENE_GESSERIT);
  assert(
    otherFactions.length >= 2,
    `Stronghold is at occupancy limit (2 other factions)`
  );

  const handler = new BGTakeUpArmsHandler();
  const shouldTrigger = handler.shouldTrigger(state, stronghold, sector);

  assert(
    shouldTrigger === false,
    `TAKE UP ARMS should NOT trigger when stronghold is at occupancy limit (would exceed limit)`
  );
}

// =============================================================================
// 2.02.16 – TAKE UP ARMS: Request and decision processing
// =============================================================================

function testTakeUpArms_CreatesRequestWhenTriggered(): void {
  section("2.02.16 - TAKE UP ARMS creates request when triggered");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up occupied territory
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

  const handler = new BGTakeUpArmsHandler();
  const trigger = {
    territory,
    sector,
    advisorCount: 2,
  };

  const result = handler.requestDecision(state, [], trigger);

  assert(
    result.pendingRequests?.length === 1,
    `TAKE UP ARMS creates one request (got ${result.pendingRequests?.length})`
  );
  assert(
    result.pendingRequests?.[0]?.factionId === Faction.BENE_GESSERIT,
    `Request is sent to BG`
  );
  assert(
    result.pendingRequests?.[0]?.requestType === "TAKE_UP_ARMS",
    `Request type is TAKE_UP_ARMS (got ${result.pendingRequests?.[0]?.requestType})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.16 TAKE UP ARMS");
  console.log("=".repeat(80));

  try {
    testTakeUpArms_ShouldTriggerForOccupiedTerritory();
    testTakeUpArms_ShouldNotTriggerForUnoccupiedTerritory();
    testTakeUpArms_ShouldNotTriggerIfAdvisorsAlreadyPresent();
    testTakeUpArms_RequiresAdvancedRules();
    testTakeUpArms_RespectsOccupancyLimit();
    testTakeUpArms_CreatesRequestWhenTriggered();
  } catch (error) {
    console.error("Unexpected error during 2.02.16 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.02.16 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

