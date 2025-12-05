/**
 * Rule test: 2.02.17 BENE GESSERIT WARTIME
 * @rule-test 2.02.17
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.17 WARTIME: Before Shipment and Movement [1.06.00], in each Territory that you have advisors,
 * you may flip all of those advisors to fighters. This change must be publicly announced.✷"
 *
 * This rule allows BG to flip all advisors to fighters before the Shipment and Movement phase.
 * Implemented in BGWartimeHandler class.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.17.bg-wartime.test.ts
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { formAlliance } from "../../state/mutations/alliances";
import { BGWartimeHandler } from "../../phases/handlers/shipment-movement/handlers/bg-abilities/bg-wartime";
import { convertBGAdvisorsToFighters } from "../../state/mutations/forces-bene-gesserit";

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
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: true,
  });
}

function addBGAdvisorsToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  advisorCount: number
): GameState {
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const existingStack = bgState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existingStack) {
    existingStack.forces.regular = (existingStack.forces.regular || 0) + advisorCount;
    existingStack.advisors = (existingStack.advisors || 0) + advisorCount;
  } else {
    bgState.forces.onBoard.push({
      territoryId,
      sector,
      forces: { regular: advisorCount, elite: 0 },
      advisors: advisorCount,
    });
  }

  return {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };
}

// =============================================================================
// Tests for 2.02.17
// =============================================================================

function testWartime_checkAndRequestReturnsNullWhenNoAdvisors(): void {
  section("2.02.17 - checkAndRequest returns null when BG has no advisors");

  const state = buildBaseState();
  const handler = new BGWartimeHandler();
  const result = handler.checkAndRequest(state, []);

  assert(result === null, "checkAndRequest returns null when BG has no advisors");
}

function testWartime_checkAndRequestCreatesRequestWhenAdvisorsPresent(): void {
  section("2.02.17 - checkAndRequest creates request when advisors are present");

  let state = buildBaseState();
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGWartimeHandler();
  const result = handler.checkAndRequest(state, []);

  assert(result !== null, "checkAndRequest returns result when advisors are present");
  if (result) {
    assert(result.pendingRequests.length === 1, "checkAndRequest creates one pending request");
    const req = result.pendingRequests[0];
    assert(req.factionId === Faction.BENE_GESSERIT, "request is for Bene Gesserit");
    assert(req.requestType === "FLIP_ADVISORS", `request type is FLIP_ADVISORS (actual: ${req.requestType})`);
    assert(
      req.context?.territories !== undefined,
      "request context includes territories array"
    );
    assert(
      req.context?.territories.length === 1,
      `request context includes 1 territory (actual: ${req.context?.territories.length})`
    );
    const territory = req.context?.territories[0];
    assert(
      territory?.territoryId === TerritoryId.ARRAKEEN,
      `territory is Arrakeen (actual: ${territory?.territoryId})`
    );
    assert(
      territory?.advisorCount === 3,
      `territory has 3 advisors (actual: ${territory?.advisorCount})`
    );
  }
}

function testWartime_processDecisionHandlesFlip(): void {
  section("2.02.17 - processDecision handles flip decision correctly");

  let state = buildBaseState();
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGWartimeHandler();
  
  // First, manually flip the advisors (simulating what the tool would do)
  state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 3);

  const result = handler.processDecision(
    state,
    [
      {
        factionId: Faction.BENE_GESSERIT,
        actionType: "FLIP_ADVISORS",
        passed: false,
        data: {
          territories: [
            {
              territoryId: TerritoryId.ARRAKEEN,
              sector: 9,
            },
          ],
        },
      },
    ],
    [
      {
        territoryId: TerritoryId.ARRAKEEN,
        sector: 9,
        advisorCount: 3,
      },
    ]
  );

  assert(result.events.length === 1, "processDecision emits one event");
  const event = result.events[0];
  assert(event.type === "ADVISORS_FLIPPED", `event type is ADVISORS_FLIPPED (actual: ${event.type})`);
  assert(
    event.data?.reason === "WARTIME",
    `event reason is WARTIME (actual: ${event.data?.reason})`
  );
  assert(
    event.data?.advisorCount === 3,
    `event advisorCount is 3 (actual: ${event.data?.advisorCount})`
  );
}

function testWartime_processDecisionHandlesPass(): void {
  section("2.02.17 - processDecision handles pass decision correctly");

  let state = buildBaseState();
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);

  const handler = new BGWartimeHandler();
  const result = handler.processDecision(
    state,
    [
      {
        factionId: Faction.BENE_GESSERIT,
        actionType: "FLIP_ADVISORS",
        passed: true,
        data: {},
      },
    ],
    [
      {
        territoryId: TerritoryId.ARRAKEEN,
        sector: 9,
        advisorCount: 3,
      },
    ]
  );

  assert(result.events.length === 0, "processDecision emits no events when passed");
}

function testWartime_respectsPEACETIMERestriction(): void {
  section("2.02.17 - checkAndRequest respects PEACETIME restriction");

  let state = buildBaseState();
  // Form alliance
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  // Add BG advisors
  state = addBGAdvisorsToTerritory(state, TerritoryId.ARRAKEEN, 9, 3);
  // Add Atreides (ally) forces to same territory
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  atreidesState.forces.onBoard.push({
    territoryId: TerritoryId.ARRAKEEN,
    sector: 9,
    forces: { regular: 5, elite: 0 },
    advisors: undefined,
  });
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.ATREIDES, atreidesState),
  };

  const handler = new BGWartimeHandler();
  const result = handler.checkAndRequest(state, []);

  // Should return null because PEACETIME restriction prevents flipping
  assert(result === null, "checkAndRequest returns null when PEACETIME restriction applies");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.17 BENE GESSERIT WARTIME");
  console.log("=".repeat(80));

  try {
    testWartime_checkAndRequestReturnsNullWhenNoAdvisors();
  } catch (error) {
    console.error("❌ testWartime_checkAndRequestReturnsNullWhenNoAdvisors failed:", error);
    failCount++;
  }

  try {
    testWartime_checkAndRequestCreatesRequestWhenAdvisorsPresent();
  } catch (error) {
    console.error("❌ testWartime_checkAndRequestCreatesRequestWhenAdvisorsPresent failed:", error);
    failCount++;
  }

  try {
    testWartime_processDecisionHandlesFlip();
  } catch (error) {
    console.error("❌ testWartime_processDecisionHandlesFlip failed:", error);
    failCount++;
  }

  try {
    testWartime_processDecisionHandlesPass();
  } catch (error) {
    console.error("❌ testWartime_processDecisionHandlesPass failed:", error);
    failCount++;
  }

  try {
    testWartime_respectsPEACETIMERestriction();
  } catch (error) {
    console.error("❌ testWartime_respectsPEACETIMERestriction failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.17 tests completed: ${passCount} passed, ${failCount} failed`
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

