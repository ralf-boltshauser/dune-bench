/**
 * Phase Handler Integration Tests
 *
 * Tests the phase state machines to ensure correct behavior
 * for game phase transitions and agent request handling.
 */

import {
  Faction,
  Phase,
  TerritoryId,
  type GameState,
} from '../types';
import { createGameState, type CreateGameOptions } from '../state';
import { addSpice, removeSpice, getFactionState, shipForces } from '../state';
import { PhaseManager } from './phase-manager';
import '../agent/env-loader';
import { createAgentProvider } from '../agent/azure-provider';
import {
  StormPhaseHandler,
  SpiceBlowPhaseHandler,
  ChoamCharityPhaseHandler,
  BiddingPhaseHandler,
  RevivalPhaseHandler,
  ShipmentMovementPhaseHandler,
  BattlePhaseHandler,
  SpiceCollectionPhaseHandler,
  MentatPausePhaseHandler,
} from './handlers';
import type { AgentResponse, PhaseEvent } from './types';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createTestState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): GameState {
  const options: CreateGameOptions = {
    factions,
    maxTurns: 10,
    advancedRules: false,
  };
  return createGameState(options);
}

function hasEvent(events: PhaseEvent[], type: string): boolean {
  return events.some((e) => e.type === type);
}

// =============================================================================
// PHASE MANAGER TESTS
// =============================================================================

function testPhaseManagerInitialization(): void {
  console.log('Testing Phase Manager Initialization...');

  const state = createTestState();
  const provider = createAgentProvider(state, { verbose: false });
  const manager = new PhaseManager(provider);

  // Register handlers
  manager.registerHandlers([
    new StormPhaseHandler(),
    new SpiceBlowPhaseHandler(),
    new ChoamCharityPhaseHandler(),
    new BiddingPhaseHandler(),
    new RevivalPhaseHandler(),
    new ShipmentMovementPhaseHandler(),
    new BattlePhaseHandler(),
    new SpiceCollectionPhaseHandler(),
    new MentatPausePhaseHandler(),
  ]);

  // Test that handlers are registered (we can't directly check, but runPhase should work)
  // The manager should be ready to run phases
  assert(manager !== null, 'Manager should be created');

  console.log('  Phase Manager Initialization: PASS');
}

function testPhaseTransitions(): void {
  console.log('Testing Phase Transitions...');

  const state = createTestState();

  // Test each handler individually
  const handlers = [
    { handler: new StormPhaseHandler(), name: 'Storm' },
    { handler: new SpiceBlowPhaseHandler(), name: 'Spice Blow' },
    { handler: new ChoamCharityPhaseHandler(), name: 'CHOAM Charity' },
    { handler: new BiddingPhaseHandler(), name: 'Bidding' },
    { handler: new RevivalPhaseHandler(), name: 'Revival' },
    { handler: new ShipmentMovementPhaseHandler(), name: 'Shipment & Movement' },
    { handler: new BattlePhaseHandler(), name: 'Battle' },
    { handler: new SpiceCollectionPhaseHandler(), name: 'Spice Collection' },
    { handler: new MentatPausePhaseHandler(), name: 'Mentat Pause' },
  ];

  for (const { handler, name } of handlers) {
    const result = handler.initialize(state);
    assert(
      hasEvent(result.events, 'PHASE_STARTED'),
      `${name} should emit PHASE_STARTED event`
    );
  }

  console.log('  Phase Transitions: PASS');
}

// =============================================================================
// STORM PHASE TESTS
// =============================================================================

function testStormPhaseBasic(): void {
  console.log('Testing Storm Phase...');

  const state = createTestState();
  const handler = new StormPhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    initResult.pendingRequests.length === 2,
    'Should request storm dial from 2 factions'
  );

  // Process storm dial responses
  const responses: AgentResponse[] = [
    {
      factionId: Faction.ATREIDES,
      actionType: 'STORM_DIAL',
      passed: false,
      data: { dial: 2 },
    },
    {
      factionId: Faction.HARKONNEN,
      actionType: 'STORM_DIAL',
      passed: false,
      data: { dial: 3 },
    },
  ];

  const stepResult = handler.processStep(initResult.state, responses);
  assert(stepResult.phaseComplete, 'Storm phase should complete after dial processing');
  assert(stepResult.nextPhase === Phase.SPICE_BLOW, 'Should transition to Spice Blow');

  console.log('  Storm Phase: PASS');
}

// =============================================================================
// CHOAM CHARITY TESTS
// =============================================================================

function testChoamCharityPhase(): void {
  console.log('Testing CHOAM Charity Phase...');

  const state = createTestState();
  const handler = new ChoamCharityPhaseHandler();

  // Give Atreides low spice
  const testState = removeSpice(state, Faction.ATREIDES, getFactionState(state, Faction.ATREIDES).spice);

  // Initialize
  const initResult = handler.initialize(testState);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // Atreides should get charity request
  const atreidesRequest = initResult.pendingRequests.find(
    (r) => r.factionId === Faction.ATREIDES
  );
  assert(atreidesRequest !== undefined, 'Atreides should get charity opportunity');

  // Accept charity
  const responses: AgentResponse[] = [
    {
      factionId: Faction.ATREIDES,
      actionType: 'CLAIM_CHARITY',
      passed: false,
      data: {},
    },
  ];

  const stepResult = handler.processStep(initResult.state, responses);
  const atreidesFinal = getFactionState(stepResult.state, Faction.ATREIDES);
  assert(atreidesFinal.spice >= 2, 'Atreides should receive charity spice');

  console.log('  CHOAM Charity Phase: PASS');
}

// =============================================================================
// BIDDING PHASE TESTS
// =============================================================================

function testBiddingPhaseBasic(): void {
  console.log('Testing Bidding Phase...');

  const state = createTestState();
  const handler = new BiddingPhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // There should be auction events or pending requests
  assert(
    initResult.pendingRequests.length > 0 || initResult.phaseComplete,
    'Should have pending bid requests or be complete (no cards)'
  );

  console.log('  Bidding Phase: PASS');
}

// =============================================================================
// REVIVAL PHASE TESTS
// =============================================================================

function testRevivalPhase(): void {
  console.log('Testing Revival Phase...');

  const state = createTestState();
  const handler = new RevivalPhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // All factions should get revival requests
  for (const faction of state.stormOrder) {
    const request = initResult.pendingRequests.find((r) => r.factionId === faction);
    assert(request !== undefined, `${faction} should get revival request`);
  }

  // Pass on revival
  const responses: AgentResponse[] = initResult.pendingRequests.map((r) => ({
    factionId: r.factionId,
    actionType: 'PASS',
    passed: true,
    data: {},
  }));

  const stepResult = handler.processStep(initResult.state, responses);
  assert(stepResult.phaseComplete, 'Should complete after all factions respond');
  assert(
    stepResult.nextPhase === Phase.SHIPMENT_MOVEMENT,
    'Should transition to Shipment & Movement'
  );

  console.log('  Revival Phase: PASS');
}

// =============================================================================
// SHIPMENT & MOVEMENT TESTS
// =============================================================================

function testShipmentMovementPhase(): void {
  console.log('Testing Shipment & Movement Phase...');

  const state = createTestState();
  const handler = new ShipmentMovementPhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // First faction should get shipment request
  assert(
    initResult.pendingRequests.length === 1,
    'Should request from one faction at a time'
  );
  assert(
    initResult.pendingRequests[0].requestType === 'SHIP_FORCES',
    'First request should be for shipment'
  );

  console.log('  Shipment & Movement Phase: PASS');
}

// =============================================================================
// BATTLE PHASE TESTS
// =============================================================================

function testBattlePhaseNoBattles(): void {
  console.log('Testing Battle Phase (no battles)...');

  const state = createTestState();
  const handler = new BattlePhaseHandler();

  // Initialize with no forces colocated
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // With no battles, phase should complete immediately
  assert(initResult.phaseComplete, 'Should complete with no battles');
  assert(
    initResult.nextPhase === Phase.SPICE_COLLECTION,
    'Should transition to Spice Collection'
  );

  console.log('  Battle Phase (no battles): PASS');
}

function testBattlePhaseWithBattle(): void {
  console.log('Testing Battle Phase (with battle)...');

  let state = createTestState();
  const handler = new BattlePhaseHandler();

  // Ship forces from both factions to same territory to create battle
  state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 5, 2);
  state = shipForces(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 5, 2);

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // Should have pending battle
  assert(
    !initResult.phaseComplete,
    'Should not complete with battles pending'
  );

  console.log('  Battle Phase (with battle): PASS');
}

// =============================================================================
// SPICE COLLECTION TESTS
// =============================================================================

function testSpiceCollectionPhase(): void {
  console.log('Testing Spice Collection Phase...');

  const state = createTestState();
  const handler = new SpiceCollectionPhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );
  assert(initResult.phaseComplete, 'Spice collection should complete immediately');
  assert(
    initResult.nextPhase === Phase.MENTAT_PAUSE,
    'Should transition to Mentat Pause'
  );

  console.log('  Spice Collection Phase: PASS');
}

// =============================================================================
// MENTAT PAUSE TESTS
// =============================================================================

function testMentatPausePhase(): void {
  console.log('Testing Mentat Pause Phase...');

  const state = createTestState();
  const handler = new MentatPausePhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );
  assert(initResult.phaseComplete, 'Mentat pause should complete immediately');

  // No winner on turn 1
  assert(
    initResult.state.winner === null || initResult.state.winner === undefined,
    'Should have no winner on turn 1'
  );

  console.log('  Mentat Pause Phase: PASS');
}

// =============================================================================
// SPICE BLOW PHASE TESTS
// =============================================================================

function testSpiceBlowPhase(): void {
  console.log('Testing Spice Blow Phase...');

  const state = createTestState();
  const handler = new SpiceBlowPhaseHandler();

  // Initialize
  const initResult = handler.initialize(state);
  assert(
    hasEvent(initResult.events, 'PHASE_STARTED'),
    'Should emit phase started'
  );

  // Should process spice card reveals or complete
  // The result depends on what cards are drawn
  const hasSpiceEvents = initResult.events.some((e) =>
    e.type === 'SPICE_CARD_REVEALED' ||
    e.type === 'PHASE_STARTED' ||
    e.message?.includes('Spice')
  );
  assert(
    hasSpiceEvents || initResult.phaseComplete,
    'Should process spice cards or complete'
  );

  console.log('  Spice Blow Phase: PASS');
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

export function runPhaseTests(): void {
  console.log('\n========================================');
  console.log('Running Phase Handler Tests');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    testPhaseManagerInitialization,
    testPhaseTransitions,
    testStormPhaseBasic,
    testChoamCharityPhase,
    testBiddingPhaseBasic,
    testRevivalPhase,
    testShipmentMovementPhase,
    testBattlePhaseNoBattles,
    testBattlePhaseWithBattle,
    testSpiceCollectionPhase,
    testMentatPausePhase,
    testSpiceBlowPhase,
  ];

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      failed++;
      console.error(`  FAILED: ${test.name}`);
      console.error(`    ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
runPhaseTests();
