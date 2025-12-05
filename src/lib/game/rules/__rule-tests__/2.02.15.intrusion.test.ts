/**
 * Rule test: 2.02.15 INTRUSION
 * @rule-test 2.02.15
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.15 INTRUSION: When a Force of another faction that you are not allied to enters a Territory where you have fighters, you may flip them to advisors.✷"
 *
 * These tests verify:
 * - INTRUSION triggers when non-ally enters territory with BG fighters
 * - INTRUSION does NOT trigger for allies
 * - INTRUSION does NOT trigger if BG only has advisors (no fighters)
 * - INTRUSION is optional (BG may choose to flip or not)
 * - INTRUSION only works in advanced rules
 */

import { Faction, TerritoryId, type GameState, type AgentResponse } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, areAllied, getBGFightersInSector, formAlliance } from "../../state";
import { BGIntrusionHandler } from "../../phases/handlers/shipment-movement/handlers/bg-abilities/bg-intrusion";
import { convertBGFightersToAdvisors } from "../../state";

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
// 2.02.15 – INTRUSION: Trigger conditions
// =============================================================================

function testIntrusion_ShouldTriggerForNonAlly(): void {
  section("2.02.15 - INTRUSION triggers when non-ally enters territory with BG fighters");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up BG with fighters in territory
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: territory, sector, forces: { regular: 3, elite: 0 } },
        ],
      },
    }),
  };

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(state, Faction.ATREIDES, territory, sector);

  assert(
    shouldTrigger === true,
    `INTRUSION should trigger when non-ally (Atreides) enters territory with BG fighters`
  );
  assert(
    !areAllied(state, Faction.BENE_GESSERIT, Faction.ATREIDES),
    `BG and Atreides are not allied (required for INTRUSION)`
  );
}

function testIntrusion_ShouldNotTriggerForAlly(): void {
  section("2.02.15 - INTRUSION does NOT trigger for allies");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Form alliance between BG and Atreides
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);

  // Set up BG with fighters in territory
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: territory, sector, forces: { regular: 3, elite: 0 } },
        ],
      },
    }),
  };

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(state, Faction.ATREIDES, territory, sector);

  assert(
    shouldTrigger === false,
    `INTRUSION should NOT trigger when ally (Atreides) enters territory`
  );
  assert(
    areAllied(state, Faction.BENE_GESSERIT, Faction.ATREIDES),
    `BG and Atreides are allied (prevents INTRUSION)`
  );
}

function testIntrusion_ShouldNotTriggerIfOnlyAdvisors(): void {
  section("2.02.15 - INTRUSION does NOT trigger if BG only has advisors (no fighters)");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up BG with ONLY advisors (no fighters) in territory
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: territory, sector, forces: { regular: 0, elite: 0 }, advisors: 3 },
        ],
      },
    }),
  };

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(state, Faction.ATREIDES, territory, sector);

  assert(
    shouldTrigger === false,
    `INTRUSION should NOT trigger when BG only has advisors (no fighters)`
  );
  assert(
    getBGFightersInSector(state, territory, sector) === 0,
    `BG has 0 fighters in territory (only advisors)`
  );
}

function testIntrusion_RequiresAdvancedRules(): void {
  section("2.02.15 - INTRUSION only works in advanced rules");

  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: false, // Basic rules
  });

  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up BG with fighters
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: territory, sector, forces: { regular: 3, elite: 0 } },
        ],
      },
    }),
  };

  const handler = new BGIntrusionHandler();
  const shouldTrigger = handler.shouldTrigger(state, Faction.ATREIDES, territory, sector);

  assert(
    shouldTrigger === false,
    `INTRUSION should NOT trigger in basic rules (advanced rules required)`
  );
}

// =============================================================================
// 2.02.15 – INTRUSION: Request creation
// =============================================================================

function testIntrusion_CreatesRequestWhenTriggered(): void {
  section("2.02.15 - INTRUSION creates request when triggered");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  // Set up BG with fighters
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: territory, sector, forces: { regular: 3, elite: 0 } },
        ],
      },
    }),
  };

  const handler = new BGIntrusionHandler();
  const trigger = {
    territory,
    sector,
    enteringFaction: Faction.ATREIDES,
  };

  const result = handler.requestDecision(state, [], trigger);

  assert(
    result.pendingRequests?.length === 1,
    `INTRUSION creates one request (got ${result.pendingRequests?.length})`
  );
  assert(
    result.pendingRequests?.[0]?.factionId === Faction.BENE_GESSERIT,
    `Request is sent to BG`
  );
  assert(
    result.pendingRequests?.[0]?.requestType === "BG_INTRUSION",
    `Request type is BG_INTRUSION`
  );
}

function testIntrusion_ProcessDecisionEmitsEventWhenFlipping(): void {
  section("2.02.15 - INTRUSION emits event when BG chooses to flip");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  const handler = new BGIntrusionHandler();
  const trigger = {
    territory,
    sector,
    enteringFaction: Faction.ATREIDES,
  };

  // BG chooses to flip fighters to advisors
  const response: AgentResponse = {
    factionId: Faction.BENE_GESSERIT,
    actionType: "BG_INTRUSION",
    data: { choice: "flip", count: 3 },
    passed: false,
  };

  const result = handler.processDecision(state, [response], trigger);

  assert(
    result.events.length === 1,
    `INTRUSION emits one event when flipping (got ${result.events.length})`
  );
  assert(
    result.events[0]?.type === "FORCES_CONVERTED",
    `Event type is FORCES_CONVERTED`
  );
  assert(
    (result.events[0]?.data as any)?.conversion === "fighters_to_advisors",
    `Event indicates fighters_to_advisors conversion`
  );
  assert(
    (result.events[0]?.data as any)?.reason === "intrusion",
    `Event reason is intrusion`
  );
}

function testIntrusion_ProcessDecisionNoEventWhenPassing(): void {
  section("2.02.15 - INTRUSION emits no event when BG passes");

  let state = buildBaseState();
  const territory = TerritoryId.ARRAKEEN;
  const sector = 0;

  const handler = new BGIntrusionHandler();
  const trigger = {
    territory,
    sector,
    enteringFaction: Faction.ATREIDES,
  };

  // BG passes (doesn't use INTRUSION)
  const response: AgentResponse = {
    factionId: Faction.BENE_GESSERIT,
    actionType: "BG_INTRUSION",
    data: {},
    passed: true,
  };

  const result = handler.processDecision(state, [response], trigger);

  assert(
    result.events.length === 0,
    `INTRUSION emits no events when BG passes (got ${result.events.length})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.15 INTRUSION");
  console.log("=".repeat(80));

  try {
    testIntrusion_ShouldTriggerForNonAlly();
    testIntrusion_ShouldNotTriggerForAlly();
    testIntrusion_ShouldNotTriggerIfOnlyAdvisors();
    testIntrusion_RequiresAdvancedRules();
    testIntrusion_CreatesRequestWhenTriggered();
    testIntrusion_ProcessDecisionEmitsEventWhenFlipping();
    testIntrusion_ProcessDecisionNoEventWhenPassing();
  } catch (error) {
    console.error("Unexpected error during 2.02.15 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.02.15 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

