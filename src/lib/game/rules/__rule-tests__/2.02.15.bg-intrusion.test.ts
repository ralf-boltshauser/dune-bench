/**
 * Rule test: 2.02.15 BENE GESSERIT INTRUSION
 * @rule-test 2.02.15
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.15 INTRUSION: When a Force of another faction that you are not allied to enters a Territory
 * where you have fighters, you may flip them to advisors.✷"
 *
 * This rule allows BG to flip fighters to advisors when a non-ally enters a territory where BG has fighters.
 * Implemented in BGIntrusionHandler class.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.15.bg-intrusion.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState, formAlliance } from "../../state";
import { getBGFightersInSector, areAllied } from "../../state/queries";
import { BGIntrusionHandler } from "../../phases/handlers/shipment-movement/handlers/bg-abilities/bg-intrusion";
import { convertBGFightersToAdvisors } from "../../state/mutations/forces-bene-gesserit";

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
  return createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

function addBGFightersToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  fighterCount: number
): GameState {
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const existingStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + fighterCount;
    if (existingStack.advisors === undefined) {
      existingStack.advisors = 0;
    }
  } else {
    bgState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: fighterCount, elite: 0 },
      advisors: 0,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };
}

function addOtherFactionForces(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState {
  const factionState = getFactionState(state, faction);
  const existingStack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + count;
  } else {
    factionState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: count, elite: 0 },
      advisors: undefined,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(faction, factionState),
  };
}

// =============================================================================
// Tests for 2.02.15
// =============================================================================

function testIntrusion_shouldTriggerWhenConditionsMet(): void {
  section("2.02.15 - shouldTrigger returns true when all conditions are met");

  let state = buildBaseState();
  // Add BG fighters to Arrakeen
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);
  // Add Atreides forces (non-ally) to Arrakeen (simulating entry)
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9
  );

  assert(shouldTrigger === true, "shouldTrigger returns true when non-ally enters territory with BG fighters");
}

function testIntrusion_shouldNotTriggerInBasicRules(): void {
  section("2.02.15 - shouldTrigger returns false in basic rules");

  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: false, // Basic rules
  });
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9
  );

  assert(shouldTrigger === false, "shouldTrigger returns false in basic rules");
}

function testIntrusion_shouldNotTriggerWhenAllied(): void {
  section("2.02.15 - shouldTrigger returns false when entering faction is allied");

  let state = buildBaseState();
  // Form alliance between BG and Atreides
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9
  );

  assert(shouldTrigger === false, "shouldTrigger returns false when entering faction is allied");
  assert(
    areAllied(state, Faction.BENE_GESSERIT, Faction.ATREIDES),
    "BG and Atreides are allied"
  );
}

function testIntrusion_shouldNotTriggerWhenNoFighters(): void {
  section("2.02.15 - shouldTrigger returns false when BG has no fighters (only advisors)");

  let state = buildBaseState();
  // Add BG advisors (not fighters) to Arrakeen
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  bgState.forces.onBoard.push({
    territoryId: TerritoryId.ARRAKEEN,
    sector: 9,
    forces: { regular: 3, elite: 0 },
    advisors: 3, // All are advisors, no fighters
  });
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };
  state = addOtherFactionForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9
  );

  const fighters = getBGFightersInSector(state, TerritoryId.ARRAKEEN, 9);
  assert(fighters === 0, `BG has 0 fighters in sector (actual: ${fighters})`);
  assert(shouldTrigger === false, "shouldTrigger returns false when BG has no fighters");
}

function testIntrusion_shouldNotTriggerForBGOwnActions(): void {
  section("2.02.15 - shouldTrigger returns false for BG's own actions");

  let state = buildBaseState();
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(
    state,
    Faction.BENE_GESSERIT, // BG entering their own territory
    TerritoryId.ARRAKEEN,
    9
  );

  assert(shouldTrigger === false, "shouldTrigger returns false for BG's own actions");
}

function testIntrusion_requestDecisionCreatesRequest(): void {
  section("2.02.15 - requestDecision creates correct AgentRequest");

  let state = buildBaseState();
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);

  const handler = new BGIntrusionHandler();
  const result = handler.requestDecision(
    state,
    [],
    {
      territory: TerritoryId.ARRAKEEN,
      sector: 9,
      enteringFaction: Faction.ATREIDES,
    }
  );

  assert(result.pendingRequests.length === 1, "requestDecision creates one pending request");
  const req = result.pendingRequests[0];
  assert(req.factionId === Faction.BENE_GESSERIT, "request is for Bene Gesserit");
  assert(req.requestType === "BG_INTRUSION", `request type is BG_INTRUSION (actual: ${req.requestType})`);
  assert(
    req.context?.territory === TerritoryId.ARRAKEEN,
    `request context includes territory (actual: ${req.context?.territory})`
  );
  assert(
    req.context?.sector === 9,
    `request context includes sector (actual: ${req.context?.sector})`
  );
  assert(
    req.context?.enteringFaction === Faction.ATREIDES,
    `request context includes entering faction (actual: ${req.context?.enteringFaction})`
  );
  assert(
    req.context?.fightersInSector === 5,
    `request context includes fighters count (actual: ${req.context?.fightersInSector})`
  );
}

function testIntrusion_processDecisionHandlesFlip(): void {
  section("2.02.15 - processDecision handles flip decision correctly");

  let state = buildBaseState();
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);

  // Simulate BG choosing to flip 3 fighters
  const handler = new BGIntrusionHandler();
  
  // First, manually flip the fighters (simulating what the tool would do)
  state = convertBGFightersToAdvisors(state, TerritoryId.ARRAKEEN, 9, 3);

  const result = handler.processDecision(
    state,
    [
      {
        factionId: Faction.BENE_GESSERIT,
        actionType: "BG_INTRUSION",
        passed: false,
        data: {
          choice: "flip",
          count: 3,
        },
      },
    ],
    {
      territory: TerritoryId.ARRAKEEN,
      sector: 9,
      enteringFaction: Faction.ATREIDES,
    }
  );

  assert(result.events.length === 1, "processDecision emits one event");
  const event = result.events[0];
  assert(event.type === "FORCES_CONVERTED", `event type is FORCES_CONVERTED (actual: ${event.type})`);
  assert(
    event.data?.conversion === "fighters_to_advisors",
    `event conversion is fighters_to_advisors (actual: ${event.data?.conversion})`
  );
  assert(
    event.data?.reason === "intrusion",
    `event reason is intrusion (actual: ${event.data?.reason})`
  );
  assert(
    event.data?.count === 3,
    `event count is 3 (actual: ${event.data?.count})`
  );
  assert(
    event.data?.enteringFaction === Faction.ATREIDES,
    `event includes entering faction (actual: ${event.data?.enteringFaction})`
  );
}

function testIntrusion_processDecisionHandlesPass(): void {
  section("2.02.15 - processDecision handles pass decision correctly");

  let state = buildBaseState();
  state = addBGFightersToTerritory(state, TerritoryId.ARRAKEEN, 9, 5);

  const handler = new BGIntrusionHandler();
  const result = handler.processDecision(
    state,
    [
      {
        factionId: Faction.BENE_GESSERIT,
        actionType: "BG_INTRUSION",
        passed: true,
        data: {},
      },
    ],
    {
      territory: TerritoryId.ARRAKEEN,
      sector: 9,
      enteringFaction: Faction.ATREIDES,
    }
  );

  assert(result.events.length === 0, "processDecision emits no events when passed");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.15 BENE GESSERIT INTRUSION");
  console.log("=".repeat(80));

  try {
    testIntrusion_shouldTriggerWhenConditionsMet();
  } catch (error) {
    console.error("❌ testIntrusion_shouldTriggerWhenConditionsMet failed:", error);
    failCount++;
  }

  try {
    testIntrusion_shouldNotTriggerInBasicRules();
  } catch (error) {
    console.error("❌ testIntrusion_shouldNotTriggerInBasicRules failed:", error);
    failCount++;
  }

  try {
    testIntrusion_shouldNotTriggerWhenAllied();
  } catch (error) {
    console.error("❌ testIntrusion_shouldNotTriggerWhenAllied failed:", error);
    failCount++;
  }

  try {
    testIntrusion_shouldNotTriggerWhenNoFighters();
  } catch (error) {
    console.error("❌ testIntrusion_shouldNotTriggerWhenNoFighters failed:", error);
    failCount++;
  }

  try {
    testIntrusion_shouldNotTriggerForBGOwnActions();
  } catch (error) {
    console.error("❌ testIntrusion_shouldNotTriggerForBGOwnActions failed:", error);
    failCount++;
  }

  try {
    testIntrusion_requestDecisionCreatesRequest();
  } catch (error) {
    console.error("❌ testIntrusion_requestDecisionCreatesRequest failed:", error);
    failCount++;
  }

  try {
    testIntrusion_processDecisionHandlesFlip();
  } catch (error) {
    console.error("❌ testIntrusion_processDecisionHandlesFlip failed:", error);
    failCount++;
  }

  try {
    testIntrusion_processDecisionHandlesPass();
  } catch (error) {
    console.error("❌ testIntrusion_processDecisionHandlesPass failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.15 tests completed: ${passCount} passed, ${failCount} failed`
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

