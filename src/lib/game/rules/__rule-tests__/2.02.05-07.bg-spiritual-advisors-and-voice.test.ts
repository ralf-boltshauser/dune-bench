/**
 * Rule test: 2.02.05, 2.02.06, 2.02.07, 2.02.11 BENE GESSERIT SPIRITUAL ADVISORS & VOICE
 * @rule-test 2.02.05
 * @rule-test 2.02.06
 * @rule-test 2.02.07
 * @rule-test 2.02.11
 *
 * Rule text (numbered_rules/2.md):
 * 2.02.05 SPIRITUAL ADVISORS: Whenever any other faction Ships Forces onto Dune from off-planet, you may Send 1 Force (fighter) for free from your reserves to the Polar Sink.✷
 * 2.02.11 ADVISORS: When using ability Spiritual Advisors [2.02.05], you may send 1 advisor for free from your reserves into the same Territory (and same Sector) that faction ships to, in place of sending a fighter to the Polar Sink. You may only do this when you do not have fighters already present in that Territory.
 * 2.02.06 VOICE: After Battle Plans [1.07.04.00] you may command your opponent to play or not play one of the following cards in their Battle Plan: poison weapon, projectile weapon, poison defense, projectile defense, a worthless card, a Cheap Hero, a specific special weapon by name, or a specific special defense by name. Your opponent must comply with your command as well as they are able to.✷
 * 2.02.07 ALLIANCE: In your ally's battle you may use ability Voice [2.02.06] on your ally's opponent.✷
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.05-07.bg-spiritual-advisors-and-voice.test.ts
 */

import {
  Faction,
  TerritoryId,
  BattleSubPhase,
  type GameState,
  type CurrentBattle,
  type BattlePhaseContext,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from "../../types";
import { createGameState, getFactionState, getAlly } from "../../state";
import { TerritoryId } from "../../types";
import { BGSpiritualAdvisorHandler } from "../../phases/handlers/shipment-movement/handlers/bg-abilities/bg-advisors";
import { requestVoice, processVoice } from "../../phases/handlers/battle/sub-phases/voice";

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

function buildBattleContext(
  aggressor: Faction,
  defender: Faction,
  territoryId: TerritoryId = TerritoryId.ARRAKEEN,
  sector: number = 9
): BattlePhaseContext {
  const battle: CurrentBattle = {
    id: "battle-1",
    territoryId,
    sector,
    aggressor,
    defender,
    aggressorForces: { regular: 5, elite: 0 },
    defenderForces: { regular: 5, elite: 0 },
    aggressorPlan: null,
    defenderPlan: null,
    prescienceUsed: false,
    prescienceTarget: null,
    prescienceOpponent: null,
    prescienceResult: null,
    prescienceBlocked: false,
    traitorCalled: false,
    traitorCalledBy: null,
    traitorCallsByBothSides: false,
    voiceUsed: false,
    voiceCommand: null,
    winner: null,
    loser: null,
    spiceCollected: 0,
  };

  return {
    currentBattle: battle,
    subPhase: BattleSubPhase.VOICE_OPPORTUNITY,
  };
}

// =============================================================================
// Tests for 2.02.05 SPIRITUAL ADVISORS
// =============================================================================

function testSpiritualAdvisors_shouldTriggerForNormalShipment(): void {
  section("2.02.05 - shouldTrigger returns true for normal off-planet shipment");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();

  const result = handler.shouldTrigger(state, Faction.ATREIDES, "SHIP_FORCES");
  assert(result === true, "shouldTrigger returns true for normal SHIP_FORCES action");
}

function testSpiritualAdvisors_shouldNotTriggerForGuildCrossShip(): void {
  section("2.02.05 - shouldTrigger returns false for Guild cross-ship (no off-planet)");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();

  const result = handler.shouldTrigger(state, Faction.ATREIDES, "GUILD_CROSS_SHIP");
  assert(result === false, "shouldTrigger returns false for GUILD_CROSS_SHIP (no off-planet involved)");
}

function testSpiritualAdvisors_shouldNotTriggerForGuildOffPlanet(): void {
  section("2.02.05 - shouldTrigger returns false for Guild off-planet (going TO reserves)");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();

  const result = handler.shouldTrigger(state, Faction.ATREIDES, "GUILD_SHIP_OFF_PLANET");
  assert(result === false, "shouldTrigger returns false for GUILD_SHIP_OFF_PLANET (going TO reserves, not FROM)");
}

function testSpiritualAdvisors_shouldNotTriggerForFremenSend(): void {
  section("2.02.05 - shouldTrigger returns false for Fremen send (on-planet reserves)");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();

  const result = handler.shouldTrigger(state, Faction.FREMEN, "FREMEN_SEND_FORCES");
  assert(result === false, "shouldTrigger returns false for FREMEN_SEND_FORCES (on-planet reserves, not off-planet)");
}

function testSpiritualAdvisors_shouldNotTriggerForBGSelf(): void {
  section("2.02.05 - shouldTrigger returns false when BG ships (only other factions trigger)");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();

  const result = handler.shouldTrigger(state, Faction.BENE_GESSERIT, "SHIP_FORCES");
  assert(result === false, "shouldTrigger returns false when BG themselves ship");
}

function testSpiritualAdvisors_shouldNotTriggerWhenBGNotInGame(): void {
  section("2.02.05 - shouldTrigger returns false when BG not in game");
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN], // No BG
    advancedRules: true,
  });
  const handler = new BGSpiritualAdvisorHandler();

  const result = handler.shouldTrigger(state, Faction.ATREIDES, "SHIP_FORCES");
  assert(result === false, "shouldTrigger returns false when BG not in game");
}

function testSpiritualAdvisors_shouldNotTriggerWhenBGNoReserves(): void {
  section("2.02.05 - shouldTrigger returns false when BG has no reserves");
  const state = buildBaseState();
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  // Empty reserves
  bgState.forces.reserves.regular = 0;
  bgState.forces.reserves.elite = 0;

  const handler = new BGSpiritualAdvisorHandler();
  const result = handler.shouldTrigger(state, Faction.ATREIDES, "SHIP_FORCES");
  assert(result === false, "shouldTrigger returns false when BG has no reserves");
}

function testSpiritualAdvisors_requestDecisionCreatesRequest(): void {
  section("2.02.05 - requestDecision creates correct request");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();
  const events: PhaseEvent[] = [];
  const trigger = { territory: TerritoryId.ARRAKEEN, sector: 9 };

  const result = handler.requestDecision(state, events, trigger);

  assert(result.pendingRequests.length === 1, "exactly one pending request is created");
  assert(result.pendingRequests[0]?.factionId === Faction.BENE_GESSERIT, "request is addressed to BG");
  assert(result.pendingRequests[0]?.requestType === "SEND_ADVISOR", "request type is SEND_ADVISOR");
  assert(
    result.pendingRequests[0]?.context?.triggeringTerritory === TerritoryId.ARRAKEEN,
    "request context includes triggering territory"
  );
  assert(
    result.pendingRequests[0]?.context?.triggeringSector === 9,
    "request context includes triggering sector"
  );
}

function testSpiritualAdvisors_processDecisionHandlesResponse(): void {
  section("2.02.05 - processDecision handles response and emits event");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();
  const trigger = { territory: TerritoryId.ARRAKEEN, sector: 9 };

  const responses: AgentResponse[] = [
    {
      factionId: Faction.BENE_GESSERIT,
      actionType: "BG_SEND_SPIRITUAL_ADVISOR",
      passed: false,
      data: {
        choice: "polar_sink",
        count: 1,
      },
    },
  ];

  const { state: newState, events } = handler.processDecision(state, responses, trigger);

  assert(events.length === 1, "exactly one event is emitted");
  assert(events[0]?.type === "FORCES_SHIPPED", "event type is FORCES_SHIPPED");
  assert(
    events[0]?.data?.faction === Faction.BENE_GESSERIT,
    "event data includes BG faction"
  );
  assert(
    events[0]?.data?.cost === 0,
    "event data shows cost is 0 (free)"
  );
  assert(
    events[0]?.data?.reason === "spiritual_advisor",
    "event data includes reason 'spiritual_advisor'"
  );
  assert(
    newState.bgSpiritualAdvisorTrigger === null,
    "bgSpiritualAdvisorTrigger is cleared after processing"
  );
}

function testSpiritualAdvisors_processDecisionHandlesPass(): void {
  section("2.02.05 - processDecision handles pass response");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();
  const trigger = { territory: TerritoryId.ARRAKEEN, sector: 9 };

  const responses: AgentResponse[] = [
    {
      factionId: Faction.BENE_GESSERIT,
      actionType: "PASS",
      passed: true,
      data: {},
    },
  ];

  const { state: newState, events } = handler.processDecision(state, responses, trigger);

  assert(events.length === 0, "no events emitted when BG passes");
  assert(
    newState.bgSpiritualAdvisorTrigger === null,
    "bgSpiritualAdvisorTrigger is cleared even when passing"
  );
}

function testSpiritualAdvisorsAdvanced_sameTerritoryAvailableWhenNoFighters(): void {
  section("2.02.11 - same_territory option is available when BG has no fighters in target territory");
  const state = buildBaseState();
  const handler = new BGSpiritualAdvisorHandler();
  const events: PhaseEvent[] = [];
  const trigger = { territory: TerritoryId.ARRAKEEN, sector: 9 };

  // BG has no forces in Arrakeen
  const result = handler.requestDecision(state, events, trigger);

  assert(result.pendingRequests.length === 1, "exactly one pending request is created");
  assert(
    result.pendingRequests[0]?.context?.canUseSameTerritory === true,
    "canUseSameTerritory is true when BG has no fighters in target territory (Advanced Rules)"
  );
  assert(
    result.pendingRequests[0]?.context?.triggeringTerritory === TerritoryId.ARRAKEEN,
    "request context includes triggering territory for same_territory option"
  );
  assert(
    result.pendingRequests[0]?.context?.triggeringSector === 9,
    "request context includes triggering sector for same_territory option"
  );
}

function testSpiritualAdvisorsAdvanced_sameTerritoryNotAvailableWhenFightersPresent(): void {
  section("2.02.11 - same_territory option is NOT available when BG has fighters in target territory");
  const state = buildBaseState();
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  // Add fighters to Arrakeen (simulating BG already has forces there)
  bgState.forces.onBoard.push({
    territoryId: TerritoryId.ARRAKEEN,
    sector: 9,
    forces: { regular: 3, elite: 0 },
    advisors: 0, // These are fighters, not advisors
  });

  const updatedState = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, bgState),
  };

  const handler = new BGSpiritualAdvisorHandler();
  const events: PhaseEvent[] = [];
  const trigger = { territory: TerritoryId.ARRAKEEN, sector: 9 };

  const result = handler.requestDecision(updatedState, events, trigger);

  assert(result.pendingRequests.length === 1, "exactly one pending request is created");
  assert(
    result.pendingRequests[0]?.context?.canUseSameTerritory === false,
    "canUseSameTerritory is false when BG has fighters in target territory (Rule 2.02.11 restriction)"
  );
}

// =============================================================================
// Tests for 2.02.06 VOICE
// =============================================================================

function testVoice_requestCreatesRequestWhenBGInBattle(): void {
  section("2.02.06 - requestVoice creates request when BG is in battle");
  const state = buildBaseState();
  const context = buildBattleContext(Faction.BENE_GESSERIT, Faction.ATREIDES);
  const events: PhaseEvent[] = [];

  const result = requestVoice(context, state, events, Faction.ATREIDES);

  assert(result.pendingRequests.length === 1, "exactly one pending request is created");
  assert(result.pendingRequests[0]?.factionId === Faction.BENE_GESSERIT, "request is addressed to BG");
  assert(result.pendingRequests[0]?.requestType === "USE_VOICE", "request type is USE_VOICE");
  assert(
    result.pendingRequests[0]?.context?.opponent === Faction.ATREIDES,
    "request context identifies opponent"
  );
  // When BG is in battle, allyBattle should be false or null (even if they have an ally, it's BG's own battle)
  const allyBattle = result.pendingRequests[0]?.context?.allyBattle;
  assert(
    allyBattle === false || allyBattle === null || allyBattle === undefined,
    `request context marks this as NOT an ally battle (BG is in battle, actual: ${allyBattle})`
  );
  assert(
    Array.isArray(result.pendingRequests[0]?.context?.options),
    "request context includes voice command options"
  );
}

function testVoice_processVoiceSetsVoiceUsedAndCommand(): void {
  section("2.02.06 - processVoice sets voiceUsed and voiceCommand on battle");
  const state = buildBaseState();
  const context = buildBattleContext(Faction.BENE_GESSERIT, Faction.ATREIDES);
  const events: PhaseEvent[] = [];

  const responses: AgentResponse[] = [
    {
      factionId: Faction.BENE_GESSERIT,
      actionType: "USE_VOICE",
      passed: false,
      data: {
        command: {
          type: "not_play",
          cardType: "poison_weapon",
        },
      },
    },
  ];

  const stubRequestPrescience = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  const stubRequestBattlePlans = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  processVoice(context, state, responses, events, {
    requestPrescience: stubRequestPrescience,
    requestBattlePlans: stubRequestBattlePlans,
  });

  assert(context.currentBattle?.voiceUsed === true, "voiceUsed is set to true");
  assert(context.currentBattle?.voiceCommand !== null, "voiceCommand is set");
  assert(
    context.currentBattle?.voiceCommand?.type === "not_play",
    "voiceCommand type matches response"
  );
  assert(
    context.currentBattle?.voiceCommand?.cardType === "poison_weapon",
    "voiceCommand cardType matches response"
  );
}

function testVoice_processVoiceEmitsEvent(): void {
  section("2.02.06 - processVoice emits VOICE_USED event");
  const state = buildBaseState();
  const context = buildBattleContext(Faction.BENE_GESSERIT, Faction.ATREIDES);
  const events: PhaseEvent[] = [];

  const responses: AgentResponse[] = [
    {
      factionId: Faction.BENE_GESSERIT,
      actionType: "USE_VOICE",
      passed: false,
      data: {
        command: {
          type: "play",
          cardType: "projectile_defense",
        },
      },
    },
  ];

  const stubRequestPrescience = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  const stubRequestBattlePlans = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  processVoice(context, state, responses, events, {
    requestPrescience: stubRequestPrescience,
    requestBattlePlans: stubRequestBattlePlans,
  });

  const voiceEvent = events.find((e) => e.type === "VOICE_USED");
  assert(voiceEvent !== undefined, "VOICE_USED event is emitted");
  assert(
    voiceEvent?.data?.command?.type === "play",
    "event data includes correct command type"
  );
  assert(
    voiceEvent?.data?.command?.cardType === "projectile_defense",
    "event data includes correct cardType"
  );
}

function testVoice_processVoiceHandlesPass(): void {
  section("2.02.06 - processVoice handles pass (voiceUsed remains false)");
  const state = buildBaseState();
  const context = buildBattleContext(Faction.BENE_GESSERIT, Faction.ATREIDES);
  const events: PhaseEvent[] = [];

  const responses: AgentResponse[] = [
    {
      factionId: Faction.BENE_GESSERIT,
      actionType: "PASS",
      passed: true,
      data: {},
    },
  ];

  const stubRequestPrescience = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  const stubRequestBattlePlans = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  processVoice(context, state, responses, events, {
    requestPrescience: stubRequestPrescience,
    requestBattlePlans: stubRequestBattlePlans,
  });

  assert(context.currentBattle?.voiceUsed === false, "voiceUsed remains false when passing");
  assert(context.currentBattle?.voiceCommand === null, "voiceCommand remains null when passing");
  const voiceEvent = events.find((e) => e.type === "VOICE_USED");
  assert(voiceEvent === undefined, "no VOICE_USED event emitted when passing");
}

// =============================================================================
// Tests for 2.02.07 ALLIANCE (Voice)
// =============================================================================

function testVoiceAlliance_requestCreatesRequestWhenAllyInBattle(): void {
  section("2.02.07 - requestVoice creates request when BG's ally is in battle (BG not in battle)");
  let state = buildBaseState();
  
  // Set up alliance between BG and Atreides
  const bg = getFactionState(state, Faction.BENE_GESSERIT);
  const atreides = getFactionState(state, Faction.ATREIDES);
  const factions = new Map(state.factions)
    .set(Faction.BENE_GESSERIT, {
      ...bg,
      allyId: Faction.ATREIDES,
    })
    .set(Faction.ATREIDES, {
      ...atreides,
      allyId: Faction.BENE_GESSERIT,
    });
  state = { ...state, factions };
  
  const context = buildBattleContext(Faction.ATREIDES, Faction.HARKONNEN); // BG's ally vs Harkonnen
  const events: PhaseEvent[] = [];

  const result = requestVoice(context, state, events, Faction.HARKONNEN); // Target ally's opponent

  assert(result.pendingRequests.length === 1, "exactly one pending request is created for ally battle");
  assert(result.pendingRequests[0]?.factionId === Faction.BENE_GESSERIT, "request is still addressed to BG (ally using Voice)");
  assert(result.pendingRequests[0]?.context?.opponent === Faction.HARKONNEN, "request context identifies ally's opponent");
  assert(result.pendingRequests[0]?.context?.allyBattle === true, "request context marks this as an ally battle");
  assert(result.pendingRequests[0]?.context?.ally === Faction.ATREIDES, "request context identifies Atreides as BG's ally");
}

function testVoiceAlliance_processVoiceWorksForAllyBattle(): void {
  section("2.02.07 - processVoice works correctly for ally battle");
  let state = buildBaseState();
  
  // Set up alliance between BG and Atreides
  const bg = getFactionState(state, Faction.BENE_GESSERIT);
  const atreides = getFactionState(state, Faction.ATREIDES);
  const factions = new Map(state.factions)
    .set(Faction.BENE_GESSERIT, {
      ...bg,
      allyId: Faction.ATREIDES,
    })
    .set(Faction.ATREIDES, {
      ...atreides,
      allyId: Faction.BENE_GESSERIT,
    });
  state = { ...state, factions };
  
  const context = buildBattleContext(Faction.ATREIDES, Faction.HARKONNEN); // BG's ally vs Harkonnen
  const events: PhaseEvent[] = [];

  const responses: AgentResponse[] = [
    {
      factionId: Faction.BENE_GESSERIT,
      actionType: "USE_VOICE",
      passed: false,
      data: {
        command: {
          type: "play",
          cardType: "cheap_hero",
        },
      },
    },
  ];

  const stubRequestPrescience = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  const stubRequestBattlePlans = () => ({
    state,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  });

  processVoice(context, state, responses, events, {
    requestPrescience: stubRequestPrescience,
    requestBattlePlans: stubRequestBattlePlans,
  });

  assert(context.currentBattle?.voiceUsed === true, "voiceUsed is set to true for ally battle");
  assert(context.currentBattle?.voiceCommand !== null, "voiceCommand is set for ally battle");
  assert(
    context.currentBattle?.voiceCommand?.cardType === "cheap_hero",
    "voiceCommand cardType matches response for ally battle"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.05, 2.02.06, 2.02.07, 2.02.11 BENE GESSERIT SPIRITUAL ADVISORS & VOICE");
  console.log("=".repeat(80));

  try {
    testSpiritualAdvisors_shouldTriggerForNormalShipment();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldTriggerForNormalShipment failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_shouldNotTriggerForGuildCrossShip();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldNotTriggerForGuildCrossShip failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_shouldNotTriggerForGuildOffPlanet();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldNotTriggerForGuildOffPlanet failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_shouldNotTriggerForFremenSend();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldNotTriggerForFremenSend failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_shouldNotTriggerForBGSelf();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldNotTriggerForBGSelf failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_shouldNotTriggerWhenBGNotInGame();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldNotTriggerWhenBGNotInGame failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_shouldNotTriggerWhenBGNoReserves();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_shouldNotTriggerWhenBGNoReserves failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_requestDecisionCreatesRequest();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_requestDecisionCreatesRequest failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_processDecisionHandlesResponse();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_processDecisionHandlesResponse failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisors_processDecisionHandlesPass();
  } catch (error) {
    console.error("❌ testSpiritualAdvisors_processDecisionHandlesPass failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisorsAdvanced_sameTerritoryAvailableWhenNoFighters();
  } catch (error) {
    console.error("❌ testSpiritualAdvisorsAdvanced_sameTerritoryAvailableWhenNoFighters failed:", error);
    failCount++;
  }

  try {
    testSpiritualAdvisorsAdvanced_sameTerritoryNotAvailableWhenFightersPresent();
  } catch (error) {
    console.error("❌ testSpiritualAdvisorsAdvanced_sameTerritoryNotAvailableWhenFightersPresent failed:", error);
    failCount++;
  }

  try {
    testVoice_requestCreatesRequestWhenBGInBattle();
  } catch (error) {
    console.error("❌ testVoice_requestCreatesRequestWhenBGInBattle failed:", error);
    failCount++;
  }

  try {
    testVoice_processVoiceSetsVoiceUsedAndCommand();
  } catch (error) {
    console.error("❌ testVoice_processVoiceSetsVoiceUsedAndCommand failed:", error);
    failCount++;
  }

  try {
    testVoice_processVoiceEmitsEvent();
  } catch (error) {
    console.error("❌ testVoice_processVoiceEmitsEvent failed:", error);
    failCount++;
  }

  try {
    testVoice_processVoiceHandlesPass();
  } catch (error) {
    console.error("❌ testVoice_processVoiceHandlesPass failed:", error);
    failCount++;
  }

  try {
    testVoiceAlliance_requestCreatesRequestWhenAllyInBattle();
  } catch (error) {
    console.error("❌ testVoiceAlliance_requestCreatesRequestWhenAllyInBattle failed:", error);
    failCount++;
  }

  try {
    testVoiceAlliance_processVoiceWorksForAllyBattle();
  } catch (error) {
    console.error("❌ testVoiceAlliance_processVoiceWorksForAllyBattle failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.05–2.02.07, 2.02.11 tests completed: ${passCount} passed, ${failCount} failed`
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

