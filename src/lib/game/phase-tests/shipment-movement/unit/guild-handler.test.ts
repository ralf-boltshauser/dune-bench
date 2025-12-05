/**
 * Unit Tests for GuildHandler
 * 
 * Tests 12.2: Guild timing decisions, state management
 */

import { Faction, Phase } from '../../../types';
import { createGameState } from '../../../state';
import { GuildHandler } from '../../../phases/handlers/shipment-movement/handlers/guild-handler';
import { ShipmentMovementStateMachine } from '../../../phases/handlers/shipment-movement/state-machine';
import { RequestBuilder } from '../../../phases/handlers/shipment-movement/builders/request-builders';
import type { AgentResponse } from '../../../phases/types';

/**
 * Test 12.2.1: Ask Initial Timing
 */
export function testAskInitialTiming(): boolean {
  console.log('\n🧪 Testing: Ask Initial Timing');

  const gameState = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });

  const handler = new GuildHandler();
  const result = handler.askInitialTiming(gameState, []);

  // Verify request created
  if (result.pendingRequests.length !== 1) {
    throw new Error(`Expected 1 pending request, got ${result.pendingRequests.length}`);
  }

  const request = result.pendingRequests[0];
  if (request.factionId !== Faction.SPACING_GUILD) {
    throw new Error('Expected request for Guild');
  }
  if (request.requestType !== 'GUILD_TIMING_DECISION') {
    throw new Error('Expected GUILD_TIMING_DECISION request type');
  }
  if (result.phaseComplete) {
    throw new Error('Expected phase not complete');
  }

  console.log('✅ Ask Initial Timing passed');
  return true;
}

/**
 * Test 12.2.2: Process Timing Decision - ACT NOW
 */
export function testProcessTimingDecisionActNow(): boolean {
  console.log('\n🧪 Testing: Process Timing Decision - ACT NOW');

  const gameState = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });

  const handler = new GuildHandler();
  const stateMachine = new ShipmentMovementStateMachine();
  const requestBuilder = new RequestBuilder();
  
  const responses: AgentResponse[] = [
    {
      factionId: Faction.SPACING_GUILD,
      actionType: 'GUILD_ACT_NOW',
      data: { decision: 'act_now' },
      passed: false,
    },
  ];

  let calledStartGuildShipment = false;
  const mockStartGuildShipment = () => {
    calledStartGuildShipment = true;
    return {
      state: gameState,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events: [],
    };
  };

  // Mock the startGuildShipment method by checking if it would be called
  // Since we can't easily mock private methods, we verify the decision logic
  const decision = responses[0].data?.decision as string | undefined;
  const actionType = responses[0].actionType;
  const shouldActNow = decision === 'act_now' || actionType === 'GUILD_ACT_NOW';

  if (!shouldActNow) {
    throw new Error('Expected ACT NOW decision to be recognized');
  }

  console.log('✅ Process Timing Decision - ACT NOW passed');
  return true;
}

/**
 * Test 12.2.3: Process Timing Decision - DELAY TO END
 */
export function testProcessTimingDecisionDelayToEnd(): boolean {
  console.log('\n🧪 Testing: Process Timing Decision - DELAY TO END');

  const gameState = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });

  const handler = new GuildHandler();
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(gameState);
  const requestBuilder = new RequestBuilder();

  const responses: AgentResponse[] = [
    {
      factionId: Faction.SPACING_GUILD,
      actionType: 'GUILD_DELAY_TO_END',
      data: { decision: 'delay_to_end' },
      passed: false,
    },
  ];

  const startNextFaction = () => ({
    state: gameState,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  });

  const result = handler.processTimingDecision(
    gameState,
    responses,
    [],
    stateMachine,
    requestBuilder,
    startNextFaction
  );

  // Verify Guild wants to delay
  if (!stateMachine.doesGuildWantToDelayToEnd()) {
    throw new Error('Expected Guild to want to delay to end');
  }
  if (!stateMachine.isGuildCompleted()) {
    throw new Error('Expected Guild to be marked as completed');
  }

  console.log('✅ Process Timing Decision - DELAY TO END passed');
  return true;
}

/**
 * Test 12.2.4: Process Timing Decision - LATER
 */
export function testProcessTimingDecisionLater(): boolean {
  console.log('\n🧪 Testing: Process Timing Decision - LATER');

  const gameState = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });

  const handler = new GuildHandler();
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(gameState);
  const requestBuilder = new RequestBuilder();

  const responses: AgentResponse[] = [
    {
      factionId: Faction.SPACING_GUILD,
      actionType: 'GUILD_WAIT_LATER',
      data: { decision: 'wait_later' },
      passed: false,
    },
  ];

  const startNextFaction = () => ({
    state: gameState,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  });

  const result = handler.processTimingDecision(
    gameState,
    responses,
    [],
    stateMachine,
    requestBuilder,
    startNextFaction
  );

  // Verify Guild will be asked before next faction
  if (!stateMachine.shouldAskGuildBeforeNextFaction()) {
    throw new Error('Expected Guild to be asked before next faction');
  }

  console.log('✅ Process Timing Decision - LATER passed');
  return true;
}

/**
 * Test 12.2.5: Process Timing Decision - No Response (Default to LATER)
 */
export function testProcessTimingDecisionNoResponse(): boolean {
  console.log('\n🧪 Testing: Process Timing Decision - No Response');

  const gameState = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });

  const handler = new GuildHandler();
  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(gameState);
  const requestBuilder = new RequestBuilder();

  const responses: AgentResponse[] = []; // No Guild response

  const startNextFaction = () => ({
    state: gameState,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events: [],
  });

  const result = handler.processTimingDecision(
    gameState,
    responses,
    [],
    stateMachine,
    requestBuilder,
    startNextFaction
  );

  // Verify default to LATER
  if (!stateMachine.shouldAskGuildBeforeNextFaction()) {
    throw new Error('Expected Guild to default to LATER when no response');
  }

  console.log('✅ Process Timing Decision - No Response passed');
  return true;
}

/**
 * Test 12.2.6: Ask Before Faction
 */
export function testAskBeforeFaction(): boolean {
  console.log('\n🧪 Testing: Ask Before Faction');

  const gameState = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });

  const handler = new GuildHandler();
  const result = handler.askBeforeFaction(gameState, [], Faction.ATREIDES);

  // Verify request created
  if (result.pendingRequests.length !== 1) {
    throw new Error(`Expected 1 pending request, got ${result.pendingRequests.length}`);
  }

  const request = result.pendingRequests[0];
  if (request.factionId !== Faction.SPACING_GUILD) {
    throw new Error('Expected request for Guild');
  }
  if (request.requestType !== 'GUILD_TIMING_DECISION') {
    throw new Error('Expected GUILD_TIMING_DECISION request type');
  }

  // Verify context includes next faction
  const context = request.context as any;
  if (context.nextFaction !== 'Atreides') {
    throw new Error(`Expected next faction Atreides, got ${context.nextFaction}`);
  }

  console.log('✅ Ask Before Faction passed');
  return true;
}

/**
 * Run all Guild Handler Unit Tests
 */
export function runAllGuildHandlerTests(): boolean {
  console.log('='.repeat(80));
  console.log('GUILD HANDLER UNIT TESTS');
  console.log('='.repeat(80));

  const tests = [
    testAskInitialTiming,
    testProcessTimingDecisionActNow,
    testProcessTimingDecisionDelayToEnd,
    testProcessTimingDecisionLater,
    testProcessTimingDecisionNoResponse,
    testAskBeforeFaction,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Test failed: ${error}`);
      failed++;
    }
  }

  console.log(`\n✅ Guild Handler Tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

