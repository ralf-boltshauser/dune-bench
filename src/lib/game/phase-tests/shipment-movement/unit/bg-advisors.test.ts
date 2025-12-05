/**
 * Unit Tests for BGSpiritualAdvisorHandler
 * 
 * Tests 12.3: BG Spiritual Advisor trigger detection
 */

import { Faction } from '../../../types';
import { createGameState, getFactionState } from '../../../state';
import { BGSpiritualAdvisorHandler } from '../../../phases/handlers/shipment-movement/handlers/bg-abilities/bg-advisors';

/**
 * Test 12.3.1: Should Trigger - Normal Shipment
 */
export function testShouldTriggerNormalShipment(): boolean {
  console.log('\n🧪 Testing: Should Trigger - Normal Shipment');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    advancedRules: true,
  });

  // Give BG reserves
  const bgState = getFactionState(gameState, Faction.BENE_GESSERIT);
  bgState.forces.reserves.regular = 5;

  const handler = new BGSpiritualAdvisorHandler();
  const shouldTrigger = handler.shouldTrigger(
    gameState,
    Faction.ATREIDES,
    'SHIP_FORCES'
  );

  if (!shouldTrigger) {
    throw new Error('Expected trigger for normal shipment');
  }

  console.log('✅ Should Trigger - Normal Shipment passed');
  return true;
}

/**
 * Test 12.3.2: Should NOT Trigger - Guild Cross-Ship
 */
export function testShouldNotTriggerGuildCrossShip(): boolean {
  console.log('\n🧪 Testing: Should NOT Trigger - Guild Cross-Ship');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    advancedRules: true,
  });

  const handler = new BGSpiritualAdvisorHandler();
  const shouldTrigger = handler.shouldTrigger(
    gameState,
    Faction.ATREIDES,
    'GUILD_CROSS_SHIP'
  );

  if (shouldTrigger) {
    throw new Error('Expected no trigger for Guild cross-ship');
  }

  console.log('✅ Should NOT Trigger - Guild Cross-Ship passed');
  return true;
}

/**
 * Test 12.3.3: Should NOT Trigger - Fremen Send Forces
 */
export function testShouldNotTriggerFremenSend(): boolean {
  console.log('\n🧪 Testing: Should NOT Trigger - Fremen Send Forces');

  const gameState = createGameState({
    factions: [Faction.FREMEN, Faction.BENE_GESSERIT],
    advancedRules: true,
  });

  const handler = new BGSpiritualAdvisorHandler();
  const shouldTrigger = handler.shouldTrigger(
    gameState,
    Faction.FREMEN,
    'FREMEN_SEND_FORCES'
  );

  if (shouldTrigger) {
    throw new Error('Expected no trigger for Fremen send forces');
  }

  console.log('✅ Should NOT Trigger - Fremen Send Forces passed');
  return true;
}

/**
 * Test 12.3.4: Should NOT Trigger - BG Ships
 */
export function testShouldNotTriggerBGShips(): boolean {
  console.log('\n🧪 Testing: Should NOT Trigger - BG Ships');

  const gameState = createGameState({
    factions: [Faction.BENE_GESSERIT],
    advancedRules: true,
  });

  const handler = new BGSpiritualAdvisorHandler();
  const shouldTrigger = handler.shouldTrigger(
    gameState,
    Faction.BENE_GESSERIT,
    'SHIP_FORCES'
  );

  if (shouldTrigger) {
    throw new Error('Expected no trigger when BG ships');
  }

  console.log('✅ Should NOT Trigger - BG Ships passed');
  return true;
}

/**
 * Test 12.3.5: Should NOT Trigger - BG Has No Reserves
 */
export function testShouldNotTriggerNoReserves(): boolean {
  console.log('\n🧪 Testing: Should NOT Trigger - BG Has No Reserves');

  const gameState = createGameState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    advancedRules: true,
  });

  // BG has no reserves
  const bgState = getFactionState(gameState, Faction.BENE_GESSERIT);
  bgState.forces.reserves.regular = 0;
  bgState.forces.reserves.elite = 0;

  const handler = new BGSpiritualAdvisorHandler();
  const shouldTrigger = handler.shouldTrigger(
    gameState,
    Faction.ATREIDES,
    'SHIP_FORCES'
  );

  if (shouldTrigger) {
    throw new Error('Expected no trigger when BG has no reserves');
  }

  console.log('✅ Should NOT Trigger - BG Has No Reserves passed');
  return true;
}

/**
 * Test 12.3.6: Should NOT Trigger - BG Not in Game
 */
export function testShouldNotTriggerBGNotInGame(): boolean {
  console.log('\n🧪 Testing: Should NOT Trigger - BG Not in Game');

  const gameState = createGameState({
    factions: [Faction.ATREIDES], // No BG
    advancedRules: true,
  });

  const handler = new BGSpiritualAdvisorHandler();
  const shouldTrigger = handler.shouldTrigger(
    gameState,
    Faction.ATREIDES,
    'SHIP_FORCES'
  );

  if (shouldTrigger) {
    throw new Error('Expected no trigger when BG not in game');
  }

  console.log('✅ Should NOT Trigger - BG Not in Game passed');
  return true;
}

/**
 * Run all BG Spiritual Advisor Handler Unit Tests
 */
export function runAllBGAdvisorsTests(): boolean {
  console.log('='.repeat(80));
  console.log('BG SPIRITUAL ADVISOR HANDLER UNIT TESTS');
  console.log('='.repeat(80));

  const tests = [
    testShouldTriggerNormalShipment,
    testShouldNotTriggerGuildCrossShip,
    testShouldNotTriggerFremenSend,
    testShouldNotTriggerBGShips,
    testShouldNotTriggerNoReserves,
    testShouldNotTriggerBGNotInGame,
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

  console.log(`\n✅ BG Spiritual Advisor Handler Tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

