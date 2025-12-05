/**
 * Unit Tests for ShipmentMovementStateMachine
 * 
 * Tests 12.1: State machine transitions, state management
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { createGameState } from '../../../state';
import { ShipmentMovementStateMachine } from '../../../phases/handlers/shipment-movement/state-machine';

/**
 * Test 12.1.1: State Machine Initialization
 */
export function testStateMachineInitialization(): boolean {
  console.log('\n🧪 Testing: State Machine Initialization');

  const stateMachine = new ShipmentMovementStateMachine();
  const state = stateMachine.getState();

  // Verify initial state
  if (state.currentFactionIndex !== 0) {
    throw new Error(`Expected currentFactionIndex 0, got ${state.currentFactionIndex}`);
  }
  if (state.currentFactionPhase !== 'SHIP') {
    throw new Error(`Expected currentFactionPhase SHIP, got ${state.currentFactionPhase}`);
  }
  if (state.currentFaction !== null) {
    throw new Error(`Expected currentFaction null, got ${state.currentFaction}`);
  }
  if (state.nonGuildStormOrder.length !== 0) {
    throw new Error(`Expected empty nonGuildStormOrder, got ${state.nonGuildStormOrder.length} items`);
  }

  console.log('✅ State Machine Initialization passed');
  return true;
}

/**
 * Test 12.1.2: State Machine Initialize from Game State
 */
export function testStateMachineInitializeFromGameState(): boolean {
  console.log('\n🧪 Testing: State Machine Initialize from Game State');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.SPACING_GUILD],
    advancedRules: true,
  });

  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(gameState);

  const state = stateMachine.getState();

  // Verify Guild state
  if (!state.guildState.inGame) {
    throw new Error('Expected Guild to be in game');
  }
  if (state.guildState.completed) {
    throw new Error('Expected Guild to not be completed initially');
  }

  // Verify non-Guild storm order
  const nonGuildOrder = stateMachine.getNonGuildStormOrder();
  if (nonGuildOrder.includes(Faction.SPACING_GUILD)) {
    throw new Error('Guild should not be in non-Guild storm order');
  }
  if (nonGuildOrder.length !== 2) {
    throw new Error(`Expected 2 non-Guild factions, got ${nonGuildOrder.length}`);
  }

  console.log('✅ State Machine Initialize from Game State passed');
  return true;
}

/**
 * Test 12.1.3: Faction Phase Transitions
 */
export function testFactionPhaseTransitions(): boolean {
  console.log('\n🧪 Testing: Faction Phase Transitions');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test SHIP -> MOVE transition
  stateMachine.setCurrentPhase('SHIP');
  if (stateMachine.getCurrentPhase() !== 'SHIP') {
    throw new Error('Expected phase SHIP');
  }

  stateMachine.setCurrentPhase('MOVE');
  if (stateMachine.getCurrentPhase() !== 'MOVE') {
    throw new Error('Expected phase MOVE');
  }

  stateMachine.setCurrentPhase('DONE');
  if (stateMachine.getCurrentPhase() !== 'DONE') {
    throw new Error('Expected phase DONE');
  }

  console.log('✅ Faction Phase Transitions passed');
  return true;
}

/**
 * Test 12.1.4: Faction Index Management
 */
export function testFactionIndexManagement(): boolean {
  console.log('\n🧪 Testing: Faction Index Management');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial index
  if (stateMachine.getCurrentFactionIndex() !== 0) {
    throw new Error('Expected initial index 0');
  }

  // Test advancing index
  stateMachine.advanceFactionIndex();
  if (stateMachine.getCurrentFactionIndex() !== 1) {
    throw new Error('Expected index 1 after advance');
  }

  stateMachine.advanceFactionIndex();
  if (stateMachine.getCurrentFactionIndex() !== 2) {
    throw new Error('Expected index 2 after second advance');
  }

  console.log('✅ Faction Index Management passed');
  return true;
}

/**
 * Test 12.1.5: Current Faction Management
 */
export function testCurrentFactionManagement(): boolean {
  console.log('\n🧪 Testing: Current Faction Management');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial null
  if (stateMachine.getCurrentFaction() !== null) {
    throw new Error('Expected initial faction null');
  }

  // Test setting faction
  stateMachine.setCurrentFaction(Faction.ATREIDES);
  if (stateMachine.getCurrentFaction() !== Faction.ATREIDES) {
    throw new Error('Expected faction ATREIDES');
  }

  // Test clearing faction
  stateMachine.setCurrentFaction(null);
  if (stateMachine.getCurrentFaction() !== null) {
    throw new Error('Expected faction null after clear');
  }

  console.log('✅ Current Faction Management passed');
  return true;
}

/**
 * Test 12.1.6: All Factions Done Check
 */
export function testAllFactionsDoneCheck(): boolean {
  console.log('\n🧪 Testing: All Factions Done Check');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(gameState);

  // Initially not done (index 0, 2 factions)
  if (stateMachine.isAllFactionsDone()) {
    throw new Error('Expected not all factions done initially');
  }

  // Advance to index 1 (still not done)
  stateMachine.advanceFactionIndex();
  if (stateMachine.isAllFactionsDone()) {
    throw new Error('Expected not all factions done at index 1');
  }

  // Advance to index 2 (should be done)
  stateMachine.advanceFactionIndex();
  if (!stateMachine.isAllFactionsDone()) {
    throw new Error('Expected all factions done at index 2');
  }

  console.log('✅ All Factions Done Check passed');
  return true;
}

/**
 * Test 12.1.7: Guild State Management
 */
export function testGuildStateManagement(): boolean {
  console.log('\n🧪 Testing: Guild State Management');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial Guild state
  const initialState = stateMachine.getGuildState();
  if (initialState.inGame) {
    throw new Error('Expected Guild not in game initially');
  }
  if (initialState.completed) {
    throw new Error('Expected Guild not completed initially');
  }

  // Test setting Guild completed
  stateMachine.setGuildCompleted(true);
  if (!stateMachine.isGuildCompleted()) {
    throw new Error('Expected Guild completed');
  }

  // Test setting Guild wants to delay
  stateMachine.setGuildWantsToDelayToEnd(true);
  if (!stateMachine.doesGuildWantToDelayToEnd()) {
    throw new Error('Expected Guild wants to delay to end');
  }

  // Test asking before next faction
  stateMachine.setAskGuildBeforeNextFaction(true);
  if (!stateMachine.shouldAskGuildBeforeNextFaction()) {
    throw new Error('Expected should ask Guild before next faction');
  }

  console.log('✅ Guild State Management passed');
  return true;
}

/**
 * Test 12.1.8: BG Spiritual Advisor State
 */
export function testBGSpiritualAdvisorState(): boolean {
  console.log('\n🧪 Testing: BG Spiritual Advisor State');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial state
  if (stateMachine.isWaitingForBGAdvisor()) {
    throw new Error('Expected not waiting for BG advisor initially');
  }
  if (stateMachine.getBGSpiritualAdvisorTrigger() !== null) {
    throw new Error('Expected null trigger initially');
  }

  // Test setting waiting state
  const trigger = { territory: TerritoryId.ARRAKEEN, sector: 9 };
  stateMachine.setWaitingForBGAdvisor(true, trigger);
  if (!stateMachine.isWaitingForBGAdvisor()) {
    throw new Error('Expected waiting for BG advisor');
  }
  if (stateMachine.getBGSpiritualAdvisorTrigger()?.territory !== trigger.territory) {
    throw new Error('Expected trigger territory to match');
  }

  // Test clearing waiting state
  stateMachine.setWaitingForBGAdvisor(false, null);
  if (stateMachine.isWaitingForBGAdvisor()) {
    throw new Error('Expected not waiting for BG advisor after clear');
  }

  console.log('✅ BG Spiritual Advisor State passed');
  return true;
}

/**
 * Test 12.1.9: BG Intrusion State
 */
export function testBGIntrusionState(): boolean {
  console.log('\n🧪 Testing: BG Intrusion State');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial state
  if (stateMachine.isWaitingForBGIntrusion()) {
    throw new Error('Expected not waiting for BG intrusion initially');
  }

  // Test setting waiting state
  const trigger = {
    territory: TerritoryId.ARRAKEEN,
    sector: 9,
    enteringFaction: Faction.ATREIDES,
  };
  stateMachine.setWaitingForBGIntrusion(true, trigger);
  if (!stateMachine.isWaitingForBGIntrusion()) {
    throw new Error('Expected waiting for BG intrusion');
  }
  if (stateMachine.getBGIntrusionTrigger()?.enteringFaction !== Faction.ATREIDES) {
    throw new Error('Expected trigger entering faction to match');
  }

  console.log('✅ BG Intrusion State passed');
  return true;
}

/**
 * Test 12.1.10: BG Wartime State
 */
export function testBGWartimeState(): boolean {
  console.log('\n🧪 Testing: BG Wartime State');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial state
  if (stateMachine.isWaitingForWartime()) {
    throw new Error('Expected not waiting for BG wartime initially');
  }
  if (stateMachine.getWartimeTerritories().length !== 0) {
    throw new Error('Expected empty wartime territories initially');
  }

  // Test setting waiting state with territories
  const territories = [
    { territoryId: TerritoryId.ARRAKEEN, sector: 9, advisorCount: 3 },
    { territoryId: TerritoryId.CARTHAG, sector: 9, advisorCount: 5 },
  ];
  stateMachine.setWaitingForWartime(true, territories);
  if (!stateMachine.isWaitingForWartime()) {
    throw new Error('Expected waiting for BG wartime');
  }
  if (stateMachine.getWartimeTerritories().length !== 2) {
    throw new Error('Expected 2 wartime territories');
  }

  console.log('✅ BG Wartime State passed');
  return true;
}

/**
 * Test 12.1.11: BG Take Up Arms State
 */
export function testBGTakeUpArmsState(): boolean {
  console.log('\n🧪 Testing: BG Take Up Arms State');

  const stateMachine = new ShipmentMovementStateMachine();

  // Test initial state
  if (stateMachine.isWaitingForTakeUpArms()) {
    throw new Error('Expected not waiting for BG take up arms initially');
  }

  // Test setting waiting state
  const trigger = {
    territory: TerritoryId.ARRAKEEN,
    sector: 9,
    advisorCount: 5,
  };
  stateMachine.setWaitingForTakeUpArms(true, trigger);
  if (!stateMachine.isWaitingForTakeUpArms()) {
    throw new Error('Expected waiting for BG take up arms');
  }
  if (stateMachine.getBGTakeUpArmsTrigger()?.advisorCount !== 5) {
    throw new Error('Expected trigger advisor count to match');
  }

  console.log('✅ BG Take Up Arms State passed');
  return true;
}

/**
 * Test 12.1.12: Ornithopter Access
 */
export function testOrnithopterAccess(): boolean {
  console.log('\n🧪 Testing: Ornithopter Access');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });

  // Add forces to Arrakeen (ornithopter territory)
  const { createForceStack } = require('../../../state/force-utils');
  const atreidesState = gameState.factions.get(Faction.ATREIDES);
  if (atreidesState) {
    atreidesState.forces.onBoard.push(
      createForceStack(TerritoryId.ARRAKEEN, 9, { regular: 5, elite: 0 })
    );
  }

  const stateMachine = new ShipmentMovementStateMachine();
  stateMachine.initialize(gameState);

  // Test ornithopter access
  const access = stateMachine.getOrnithopterAccess();
  if (!stateMachine.hasOrnithopterAccess(Faction.ATREIDES)) {
    throw new Error('Expected Atreides to have ornithopter access');
  }
  if (stateMachine.hasOrnithopterAccess(Faction.HARKONNEN)) {
    throw new Error('Expected Harkonnen to not have ornithopter access');
  }

  console.log('✅ Ornithopter Access passed');
  return true;
}

/**
 * Run all State Machine Unit Tests
 */
export function runAllStateMachineTests(): boolean {
  console.log('='.repeat(80));
  console.log('STATE MACHINE UNIT TESTS');
  console.log('='.repeat(80));

  const tests = [
    testStateMachineInitialization,
    testStateMachineInitializeFromGameState,
    testFactionPhaseTransitions,
    testFactionIndexManagement,
    testCurrentFactionManagement,
    testAllFactionsDoneCheck,
    testGuildStateManagement,
    testBGSpiritualAdvisorState,
    testBGIntrusionState,
    testBGWartimeState,
    testBGTakeUpArmsState,
    testOrnithopterAccess,
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

  console.log(`\n✅ State Machine Tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

