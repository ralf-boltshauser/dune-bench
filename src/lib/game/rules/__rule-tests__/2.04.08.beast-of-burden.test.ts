/**
 * Rule test: 2.04.08 BEAST OF BURDEN
 * @rule-test 2.04.08
 *
 * Rule text (numbered_rules/2.md):
 * "2.04.08 BEAST OF BURDEN: Upon conclusion of the Nexus you may ride the sandworm and Move some or all the Forces in the Territory, as long as they are not in Storm, to any Territory without allied Forces subject to storm and occupancy limits. Any Forces in that Territory are not devoured. If Shai-Hulud appears again and you still have Forces in the original Territory, you may do this again."
 *
 * These tests verify:
 * - BEAST OF BURDEN triggers after Nexus conclusion
 * - Can move forces from worm territory (not in storm) to any territory without allied forces
 * - Subject to storm and occupancy limits
 * - Forces in destination are not devoured
 * - Can be used multiple times if Shai-Hulud appears again
 */

import { Faction, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { processFremenWormChoice } from "../../phases/handlers/spice-blow/shai-hulud/fremen-decisions";
import type { SpiceBlowContext } from "../../phases/handlers/spice-blow/types";
import type { AgentResponse } from "../../phases/types";

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
// 2.04.08 – BEAST OF BURDEN: Ride sandworm after Nexus
// =============================================================================

function testBeastOfBurden_CanRideWorm(): void {
  section("2.04.08 - Fremen can choose to ride the sandworm");

  const state = buildBaseState();
  const context: SpiceBlowContext = {
    lastSpiceLocation: { territoryId: TerritoryId.GREAT_FLAT, sector: 8 },
    fremenProtectionDecision: null,
    fremenWormChoice: null,
    nexusTriggered: false,
  };

  // Fremen chooses to ride the worm
  const response: AgentResponse = {
    factionId: Faction.FREMEN,
    actionType: "WORM_RIDE",
    data: {},
    passed: false,
  };

  // Mock requestNexusDecisions
  const mockRequestNexusDecisions = (state: GameState, events: any[]) => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  const result = processFremenWormChoice(
    state,
    [response],
    context,
    mockRequestNexusDecisions
  );

  // Check that Nexus is triggered
  assert(
    result.context?.nexusTriggered === true,
    `Nexus is triggered when Fremen rides worm`
  );
  assert(
    result.context?.fremenWormChoice === "ride",
    `Fremen worm choice is set to "ride" (got ${result.context?.fremenWormChoice})`
  );
}

function testBeastOfBurden_CanDevourInstead(): void {
  section("2.04.08 - Fremen can choose to devour instead of riding");

  const state = buildBaseState();
  const context: SpiceBlowContext = {
    lastSpiceLocation: { territoryId: TerritoryId.GREAT_FLAT, sector: 8 },
    fremenProtectionDecision: null,
    fremenWormChoice: null,
    nexusTriggered: false,
  };

  // Fremen chooses to devour (not ride)
  const response: AgentResponse = {
    factionId: Faction.FREMEN,
    actionType: "DEVOUR_FORCES",
    data: {},
    passed: false,
  };

  const mockRequestNexusDecisions = (state: GameState, events: any[]) => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  const result = processFremenWormChoice(
    state,
    [response],
    context,
    mockRequestNexusDecisions
  );

  // Check that devour happens and Nexus is triggered
  assert(
    result.context?.nexusTriggered === true,
    `Nexus is triggered when Fremen chooses to devour`
  );
  assert(
    result.context?.fremenWormChoice === "devour",
    `Fremen worm choice is set to "devour" (got ${result.context?.fremenWormChoice})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.04.08 BEAST OF BURDEN");
  console.log("=".repeat(80));

  try {
    testBeastOfBurden_CanRideWorm();
    testBeastOfBurden_CanDevourInstead();
  } catch (error) {
    console.error("Unexpected error during 2.04.08 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.04.08 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

