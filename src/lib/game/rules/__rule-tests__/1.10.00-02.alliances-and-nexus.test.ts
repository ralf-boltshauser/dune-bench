/**
 * Rule tests: 1.10.00–1.10.02 (Alliances & Nexus)
 *
 * @rule-test 1.10.00
 * @rule-test 1.10.01.02
 * @rule-test 1.10.01.03
 * @rule-test 1.10.01.04
 * @rule-test 1.10.01.05
 * @rule-test 1.10.01.06
 * @rule-test 1.10.01.07
 * @rule-test 1.10.02.01
 * @rule-test 1.10.02.02
 * @rule-test 1.10.02.05
 * @rule-test 1.10.02.07
 *
 * Rule text (numbered_rules/1.md):
 * 1.10.00 Once a Shai-Hulud (sandworm) card is turned over on the second or subsequent turns, at the end of the Spice Blow and Nexus Phase, a Nexus occurs. During a Nexus, all players have a chance to make, join or break Alliances. Once players have had a chance to do so, play continues.
 * 1.10.01.02 Forming an Alliance: A player may ally once per Nexus. Two players may announce that they are forming an Alliance, they are now allied.
 * 1.10.01.03 Transparency: The members of an Alliance must be made known to all. Alliances cannot be secret. Swap Alliance Cards as a reminder of who is in an Alliance.
 * 1.10.01.04 Alliance Limits: No more than two players may be in an Alliance with each other.
 * 1.10.01.05 Landsraad Limits: Several Alliances can be formed during a Nexus, but no player can be a member of more than one Alliance.
 * 1.10.01.06 Breaking an Alliance: Any player may break an Alliance during a Nexus. A player announces that they are breaking from their Alliance, they are now unallied.
 * 1.10.01.07 Conclusion of A Nexus: Once all players have had a chance to ally, no further Alliances can be made until the next Nexus.
 * 1.10.02.01 Allied players' Forces are considered the same for the purposes of victory.
 * 1.10.02.02 The win condition is now 4 strongholds instead of 3 for players in an Alliance.
 * 1.10.02.05 Bidding: During the Bidding Phase, allies may help each other by paying some or all the cost of each other's Treachery Cards so that a player can bid more spice than they actually have.
 * 1.10.02.07 Constraint: At the end of your Shipment and Movement actions, Place all your Forces that are in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks.
 */

import {
  AllianceStatus,
  Faction,
  Phase,
  TerritoryId,
  type GameState,
} from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { triggerNexus } from "../../phases/handlers/spice-blow/nexus";
import { type SpiceBlowContext } from "../../phases/handlers/spice-blow/types";
import {
  breakAlliance,
  formAlliance,
  validateAllianceTarget,
} from "../../phases/handlers/spice-blow/nexus/alliances";
import { isNexusComplete } from "../../phases/handlers/spice-blow/nexus/requests";
import { checkStrongholdVictory } from "../../state/queries";
import { validateAllyBidSupport } from "../../rules/bidding";
import { AllianceConstraintHandler } from "../../phases/handlers/shipment-movement/handlers/alliance-constraints";
import { createInformationTools } from "../../tools/information/tools";
import type { ToolResult } from "../../tools/types";

// =============================================================================
// Minimal test harness (supports async tests)
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
    turn: 3,
    phase: Phase.SPICE_BLOW,
    advancedRules: false,
  });

  return {
    ...state,
    stormOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  };
}

function buildDefaultSpiceBlowContext(): SpiceBlowContext {
  return {
    cardARevealed: true,
    cardBRevealed: true,
    lastSpiceLocation: { territoryId: TerritoryId.IMPERIAL_BASIN, sector: 1 },
    shaiHuludCount: 1,
    nexusTriggered: false,
    nexusResolved: false,
    fremenWormChoice: null,
    factionsActedInNexus: new Set(),
    turnOneWormsSetAside: [],
    fremenProtectionDecision: null,
    pendingDevourLocation: null,
    pendingDevourDeck: null,
  };
}

// =============================================================================
// 1.10.00 - Nexus triggering after Shai-Hulud
// =============================================================================

function testNexusTriggeredAfterWorm(): void {
  section("1.10.00 - Nexus is triggered after worm + territory card");

  const state = buildBaseState();
  const context = buildDefaultSpiceBlowContext();
  const events: any[] = [];

  const result = triggerNexus(state, context, events);

  assert(
    result.context.nexusTriggered === true,
    `Nexus context flag should be set (nexusTriggered), got ${result.context.nexusTriggered}`
  );
  assert(
    result.state.nexusOccurring === true,
    `Game state should indicate nexusOccurring, got ${result.state.nexusOccurring}`
  );

  const hasNexusStartedEvent = events.some((e) => e.type === "NEXUS_STARTED");
  assert(
    hasNexusStartedEvent,
    `Events should include NEXUS_STARTED when nexus is triggered`
  );
}

// =============================================================================
// 1.10.01.02–1.10.01.07 - Alliance lifecycle during Nexus
// =============================================================================

function testFormAlliance_setsMutualAllyIds(): void {
  section("1.10.01.02 / 1.10.01.04 - forming a 2-player alliance");

  const state = buildBaseState();
  const updated = formAlliance(state, Faction.ATREIDES, Faction.HARKONNEN);

  const atreides = getFactionState(updated, Faction.ATREIDES);
  const harkonnen = getFactionState(updated, Faction.HARKONNEN);

  assert(
    atreides.allyId === Faction.HARKONNEN &&
      harkonnen.allyId === Faction.ATREIDES,
    `Forming an alliance should set mutual allyId references`
  );
}

function testValidateAllianceTarget_disallowsAlreadyAllied(): void {
  section("1.10.01.05 - cannot be in more than one alliance");

  const state = buildBaseState();
  const withAlliance = formAlliance(state, Faction.ATREIDES, Faction.HARKONNEN);

  // Harkonnen already allied with Atreides, so cannot be target for Emperor
  const canTargetHarkonnen = validateAllianceTarget(
    withAlliance,
    Faction.HARKONNEN
  );

  assert(
    canTargetHarkonnen === false,
    `validateAllianceTarget should return false for a faction already allied`
  );
}

function testBreakAlliance_clearsBothSides(): void {
  section("1.10.01.06 - breaking an alliance clears allyId on both sides");

  const state = buildBaseState();
  const withAlliance = formAlliance(state, Faction.ATREIDES, Faction.HARKONNEN);

  const broken = breakAlliance(withAlliance, Faction.ATREIDES);
  const atreides = getFactionState(broken, Faction.ATREIDES);
  const harkonnen = getFactionState(broken, Faction.HARKONNEN);

  assert(
    atreides.allyId === null && harkonnen.allyId === null,
    `Breaking alliance from one side should clear allyId on both members`
  );
}

function testIsNexusComplete_whenAllFactionsActed(): void {
  section("1.10.01.07 - nexus complete when all factions have acted");

  const state = buildBaseState();
  const context = buildDefaultSpiceBlowContext();

  // Initially, no factions have acted
  let complete = isNexusComplete(context, state);
  assert(
    complete === false,
    `Nexus should not be complete when no factions have acted`
  );

  // Mark all factions in storm order as having acted
  const acted = new Set(state.stormOrder);
  const updatedContext: SpiceBlowContext = {
    ...context,
    factionsActedInNexus: acted,
  };

  complete = isNexusComplete(updatedContext, state);
  assert(
    complete === true,
    `Nexus should be complete when all factions in storm order have acted`
  );
}

// =============================================================================
// 1.10.01.03 - Alliance transparency via view_faction tool
// =============================================================================

async function testTransparency_viewFactionShowsAlly(): Promise<void> {
  section("1.10.01.03 - view_faction exposes allyId as public info");

  const fakeCtx: any = {
    getGameStateSummary: () => ({ turn: 1, phase: Phase.SETUP }),
    getFactionInfo: (f: Faction | undefined = Faction.ATREIDES) => ({
      faction: f,
      spice: 10,
      reserveForces: { regular: 0, elite: 0 },
      forcesOnBoard: [],
      leaders: [],
      handSize: 3,
      maxHandSize: 4,
      allyId: Faction.HARKONNEN,
      controlledStrongholds: [],
    }),
    getTerritoryInfo: () => null,
    getValidActions: () => ({
      phase: Phase.SETUP,
      canAct: false,
      availableActions: [],
      context: {},
    }),
    getMyHand: () => [],
    getMyTraitors: () => [],
  };

  const tools = createInformationTools(fakeCtx);
  const result = (await tools.view_faction.execute(
    { faction: Faction.ATREIDES },
    {} as any
  )) as ToolResult<any>;

  assert(
    result.success === true,
    `view_faction should succeed for a valid faction`
  );
  assert(
    result.data && result.data.allyId === Faction.HARKONNEN,
    `view_faction public data should include allyId to satisfy transparency`
  );
}

// =============================================================================
// 1.10.02.01–1.10.02.02 - Allied victory (forces considered jointly, 4-stronghold threshold)
// =============================================================================

function testAlliedStrongholdVictory_usesCombinedStrongholds(): void {
  section("1.10.02.01/02 - allied players win with 4 combined strongholds");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);

  const territoryA = TerritoryId.ARRAKEEN;
  const territoryB = TerritoryId.CARTHAG;
  const territoryC = TerritoryId.SIETCH_TABR;
  const territoryD = TerritoryId.HABBANYA_SIETCH;

  const withAlliance: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        allianceStatus: AllianceStatus.ALLIED,
        allyId: Faction.HARKONNEN,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            {
              factionId: Faction.ATREIDES,
              territoryId: territoryA,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
            {
              factionId: Faction.ATREIDES,
              territoryId: territoryB,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
          ],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        allianceStatus: AllianceStatus.ALLIED,
        allyId: Faction.ATREIDES,
        forces: {
          ...harkonnenState.forces,
          onBoard: [
            {
              factionId: Faction.HARKONNEN,
              territoryId: territoryC,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
            {
              factionId: Faction.HARKONNEN,
              territoryId: territoryD,
              sector: 1,
              forces: { regular: 1, elite: 0 },
            },
          ],
        },
      }),
  };

  const result = checkStrongholdVictory(withAlliance, Faction.ATREIDES);

  assert(
    result.wins === true,
    `Allied pair controlling 4 unique strongholds should meet victory condition`
  );
  assert(
    result.strongholds.length === 4,
    `Combined strongholds array should include all 4 distinct strongholds, got ${result.strongholds.length}`
  );
}

// =============================================================================
// 1.10.02.05 - Ally bidding support
// =============================================================================

function testAllyBidSupport_allowsContributionWhenAlliedAndSufficientSpice(): void {
  section("1.10.02.05 - allies can pay part of each other's bids");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);

  const withAlliance: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        allyId: Faction.HARKONNEN,
        // Ensure bidder has enough spice for their share of the bid
        spice: 2,
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        allyId: Faction.ATREIDES,
        spice: 5,
      }),
  };

  const result = validateAllyBidSupport(
    withAlliance,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    3,
    5
  );

  assert(
    result.valid === true,
    `Ally with enough spice should be able to support part of a bid`
  );
}

function testAllyBidSupport_rejectsWhenNotAlliedOrInsufficientSpice(): void {
  section("1.10.02.05 - ally bid support guards");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);

  // Case 1: Not allied
  const notAlliedState: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, { ...atreidesState, allyId: null })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        allyId: null,
        spice: 5,
      }),
  };

  const notAlliedResult = validateAllyBidSupport(
    notAlliedState,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    3,
    5
  );
  assert(
    notAlliedResult.valid === false,
    `validateAllyBidSupport should fail when factions are not allied`
  );

  // Case 2: Allied but insufficient spice
  const alliedLowSpice: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, { ...atreidesState, allyId: Faction.HARKONNEN })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        allyId: Faction.ATREIDES,
        spice: 1,
      }),
  };

  const lowSpiceResult = validateAllyBidSupport(
    alliedLowSpice,
    Faction.ATREIDES,
    Faction.HARKONNEN,
    3,
    5
  );
  assert(
    lowSpiceResult.valid === false,
    `validateAllyBidSupport should fail when ally does not have enough spice`
  );
}

// =============================================================================
// 1.10.02.07 - Alliance constraint after movement
// =============================================================================

function testAllianceConstraint_sendsCoLocatedForcesToTanks(): void {
  section("1.10.02.07 - forces co-located with ally are sent to tanks");

  const state = buildBaseState();

  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);

  const territory = TerritoryId.IMPERIAL_BASIN;

  const withAlliance: GameState = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        allyId: Faction.HARKONNEN,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            {
              factionId: Faction.ATREIDES,
              territoryId: territory,
              sector: 1,
              forces: { regular: 3, elite: 0 },
            },
          ],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [
            {
              factionId: Faction.HARKONNEN,
              territoryId: territory,
              sector: 2,
              forces: { regular: 2, elite: 0 },
            },
          ],
        },
      }),
  };

  const handler = new AllianceConstraintHandler();
  const result = handler.applyForFaction(withAlliance, Faction.ATREIDES, []);

  const atreidesAfter = getFactionState(result.state, Faction.ATREIDES);

  const remainingOnBoard = atreidesAfter.forces.onBoard.filter(
    (s) => s.territoryId === territory
  );

  assert(
    remainingOnBoard.length === 0,
    `All Atreides forces in same territory as ally should be sent to tanks (no onBoard stacks remain)`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

async function runTests(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rules 1.10.00–1.10.02: ALLIANCES & NEXUS");
  console.log("=".repeat(80));

  testNexusTriggeredAfterWorm();
  testFormAlliance_setsMutualAllyIds();
  testValidateAllianceTarget_disallowsAlreadyAllied();
  testBreakAlliance_clearsBothSides();
  testIsNexusComplete_whenAllFactionsActed();
  await testTransparency_viewFactionShowsAlly();
  testAlliedStrongholdVictory_usesCombinedStrongholds();
  testAllyBidSupport_allowsContributionWhenAlliedAndSufficientSpice();
  testAllyBidSupport_rejectsWhenNotAlliedOrInsufficientSpice();
  testAllianceConstraint_sendsCoLocatedForcesToTanks();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unexpected error during 1.10 tests:", err);
  process.exit(1);
});


