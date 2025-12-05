/**
 * Unit Tests for Event Factory
 * 
 * Tests for all event creation functions in events/factory.ts
 */

import { Faction, TerritoryId } from '../../../types';
import { SpiceBlowEvents } from '../../../phases/handlers/spice-blow/events/factory';

/**
 * Test cardRevealed event
 */
export function testCardRevealedEvent() {
  console.log('\n=== Testing cardRevealed Event ===');
  
  const event = SpiceBlowEvents.cardRevealed('Test Card', 'Territory', 'A');
  
  if (event.type !== 'SPICE_CARD_REVEALED') {
    throw new Error(`Expected event type SPICE_CARD_REVEALED, but got ${event.type}`);
  }
  
  if (event.data.card !== 'Test Card') {
    throw new Error(`Expected event.data.card to be 'Test Card', but got ${event.data.card}`);
  }
  
  if (event.data.type !== 'Territory') {
    throw new Error(`Expected event.data.type to be 'Territory', but got ${event.data.type}`);
  }
  
  if (event.data.deck !== 'A') {
    throw new Error(`Expected event.data.deck to be 'A', but got ${event.data.deck}`);
  }
  
  // Test with inStorm flag
  const eventWithStorm = SpiceBlowEvents.cardRevealed('Test Card', 'Territory', 'B', true);
  if (eventWithStorm.data.inStorm !== true) {
    throw new Error(`Expected event.data.inStorm to be true, but got ${eventWithStorm.data.inStorm}`);
  }
  
  console.log('✓ cardRevealed event created correctly');
}

/**
 * Test spicePlaced event
 */
export function testSpicePlacedEvent() {
  console.log('\n=== Testing spicePlaced Event ===');
  
  const event = SpiceBlowEvents.spicePlaced(TerritoryId.CIELAGO_SOUTH, 1, 12);
  
  if (event.type !== 'SPICE_PLACED') {
    throw new Error(`Expected event type SPICE_PLACED, but got ${event.type}`);
  }
  
  if (event.data.territory !== TerritoryId.CIELAGO_SOUTH) {
    throw new Error(`Expected event.data.territory to be ${TerritoryId.CIELAGO_SOUTH}, but got ${event.data.territory}`);
  }
  
  if (event.data.sector !== 1) {
    throw new Error(`Expected event.data.sector to be 1, but got ${event.data.sector}`);
  }
  
  if (event.data.amount !== 12) {
    throw new Error(`Expected event.data.amount to be 12, but got ${event.data.amount}`);
  }
  
  if (!event.message.includes('12')) {
    throw new Error(`Expected event message to include amount 12`);
  }
  
  console.log('✓ spicePlaced event created correctly');
}

/**
 * Test spiceNotPlaced event
 */
export function testSpiceNotPlacedEvent() {
  console.log('\n=== Testing spiceNotPlaced Event ===');
  
  const event = SpiceBlowEvents.spiceNotPlaced(TerritoryId.CIELAGO_SOUTH, 1, 12, 'in storm');
  
  if (event.type !== 'SPICE_CARD_REVEALED') {
    throw new Error(`Expected event type SPICE_CARD_REVEALED, but got ${event.type}`);
  }
  
  if (event.data.inStorm !== true) {
    throw new Error(`Expected event.data.inStorm to be true, but got ${event.data.inStorm}`);
  }
  
  if (!event.message.includes('No spice blow')) {
    throw new Error(`Expected event message to include 'No spice blow'`);
  }
  
  console.log('✓ spiceNotPlaced event created correctly');
}

/**
 * Test shaiHuludAppeared event
 */
export function testShaiHuludAppearedEvent() {
  console.log('\n=== Testing shaiHuludAppeared Event ===');
  
  const event = SpiceBlowEvents.shaiHuludAppeared(1);
  
  if (event.type !== 'SHAI_HULUD_APPEARED') {
    throw new Error(`Expected event type SHAI_HULUD_APPEARED, but got ${event.type}`);
  }
  
  if (event.data.wormNumber !== 1) {
    throw new Error(`Expected event.data.wormNumber to be 1, but got ${event.data.wormNumber}`);
  }
  
  // Test with ignoredTurnOne flag
  const eventTurn1 = SpiceBlowEvents.shaiHuludAppeared(1, true);
  if (eventTurn1.data.ignoredTurnOne !== true) {
    throw new Error(`Expected event.data.ignoredTurnOne to be true, but got ${eventTurn1.data.ignoredTurnOne}`);
  }
  
  console.log('✓ shaiHuludAppeared event created correctly');
}

/**
 * Test forcesDevoured event
 */
export function testForcesDevouredEvent() {
  console.log('\n=== Testing forcesDevoured Event ===');
  
  const event = SpiceBlowEvents.forcesDevoured(Faction.ATREIDES, TerritoryId.CIELAGO_SOUTH, 1, 3);
  
  if (event.type !== 'FORCES_DEVOURED') {
    throw new Error(`Expected event type FORCES_DEVOURED, but got ${event.type}`);
  }
  
  if (event.data.faction !== Faction.ATREIDES) {
    throw new Error(`Expected event.data.faction to be ${Faction.ATREIDES}, but got ${event.data.faction}`);
  }
  
  if (event.data.count !== 3) {
    throw new Error(`Expected event.data.count to be 3, but got ${event.data.count}`);
  }
  
  console.log('✓ forcesDevoured event created correctly');
}

/**
 * Test fremenWormImmunity event
 */
export function testFremenWormImmunityEvent() {
  console.log('\n=== Testing fremenWormImmunity Event ===');
  
  const event = SpiceBlowEvents.fremenWormImmunity(Faction.FREMEN, TerritoryId.CIELAGO_SOUTH, 1, 2);
  
  if (event.type !== 'FREMEN_WORM_IMMUNITY') {
    throw new Error(`Expected event type FREMEN_WORM_IMMUNITY, but got ${event.type}`);
  }
  
  if (event.data.faction !== Faction.FREMEN) {
    throw new Error(`Expected event.data.faction to be ${Faction.FREMEN}, but got ${event.data.faction}`);
  }
  
  console.log('✓ fremenWormImmunity event created correctly');
}

/**
 * Test fremenProtectedAlly event
 */
export function testFremenProtectedAllyEvent() {
  console.log('\n=== Testing fremenProtectedAlly Event ===');
  
  const event = SpiceBlowEvents.fremenProtectedAlly(Faction.ATREIDES, TerritoryId.CIELAGO_SOUTH, 1, 3);
  
  if (event.type !== 'FREMEN_PROTECTED_ALLY') {
    throw new Error(`Expected event type FREMEN_PROTECTED_ALLY, but got ${event.type}`);
  }
  
  if (event.data.faction !== Faction.ATREIDES) {
    throw new Error(`Expected event.data.faction to be ${Faction.ATREIDES}, but got ${event.data.faction}`);
  }
  
  console.log('✓ fremenProtectedAlly event created correctly');
}

/**
 * Test nexusStarted event
 */
export function testNexusStartedEvent() {
  console.log('\n=== Testing nexusStarted Event ===');
  
  const event = SpiceBlowEvents.nexusStarted();
  
  if (event.type !== 'NEXUS_STARTED') {
    throw new Error(`Expected event type NEXUS_STARTED, but got ${event.type}`);
  }
  
  if (Object.keys(event.data).length !== 0) {
    throw new Error(`Expected event.data to be empty, but got ${JSON.stringify(event.data)}`);
  }
  
  console.log('✓ nexusStarted event created correctly');
}

/**
 * Test nexusEnded event
 */
export function testNexusEndedEvent() {
  console.log('\n=== Testing nexusEnded Event ===');
  
  const event = SpiceBlowEvents.nexusEnded();
  
  if (event.type !== 'NEXUS_ENDED') {
    throw new Error(`Expected event type NEXUS_ENDED, but got ${event.type}`);
  }
  
  console.log('✓ nexusEnded event created correctly');
}

/**
 * Test allianceFormed event
 */
export function testAllianceFormedEvent() {
  console.log('\n=== Testing allianceFormed Event ===');
  
  const event = SpiceBlowEvents.allianceFormed(Faction.ATREIDES, Faction.HARKONNEN);
  
  if (event.type !== 'ALLIANCE_FORMED') {
    throw new Error(`Expected event type ALLIANCE_FORMED, but got ${event.type}`);
  }
  
  if (event.data.faction1 !== Faction.ATREIDES) {
    throw new Error(`Expected event.data.faction1 to be ${Faction.ATREIDES}, but got ${event.data.faction1}`);
  }
  
  if (event.data.faction2 !== Faction.HARKONNEN) {
    throw new Error(`Expected event.data.faction2 to be ${Faction.HARKONNEN}, but got ${event.data.faction2}`);
  }
  
  console.log('✓ allianceFormed event created correctly');
}

/**
 * Test allianceBroken event
 */
export function testAllianceBrokenEvent() {
  console.log('\n=== Testing allianceBroken Event ===');
  
  const event = SpiceBlowEvents.allianceBroken(Faction.ATREIDES, Faction.HARKONNEN);
  
  if (event.type !== 'ALLIANCE_BROKEN') {
    throw new Error(`Expected event type ALLIANCE_BROKEN, but got ${event.type}`);
  }
  
  console.log('✓ allianceBroken event created correctly');
}

/**
 * Run all event factory tests
 */
export function runEventFactoryTests() {
  console.log('='.repeat(80));
  console.log('EVENT FACTORY UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testCardRevealedEvent();
    testSpicePlacedEvent();
    testSpiceNotPlacedEvent();
    testShaiHuludAppearedEvent();
    testForcesDevouredEvent();
    testFremenWormImmunityEvent();
    testFremenProtectedAllyEvent();
    testNexusStartedEvent();
    testNexusEndedEvent();
    testAllianceFormedEvent();
    testAllianceBrokenEvent();
    
    console.log('\n✅ All event factory tests passed!');
  } catch (error) {
    console.error('❌ Event factory tests failed:', error);
    throw error;
  }
}

