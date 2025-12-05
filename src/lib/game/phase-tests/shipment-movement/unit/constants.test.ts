/**
 * Unit Tests: Constants Module
 * 
 * Tests for shipment-movement constants and type guards.
 */

import {
  SHIPMENT_ACTION_TYPES,
  MOVEMENT_ACTION_TYPES,
  REQUEST_TYPES,
  FACTION_PHASES,
  isShipmentActionType,
  isMovementActionType,
} from '../../../phases/handlers/shipment-movement/constants';

/**
 * Test SHIPMENT_ACTION_TYPES
 */
export function testShipmentActionTypes() {
  console.log('\n=== Testing SHIPMENT_ACTION_TYPES ===');
  
  if (!SHIPMENT_ACTION_TYPES.includes('SHIP_FORCES')) {
    throw new Error('Expected SHIPMENT_ACTION_TYPES to contain SHIP_FORCES');
  }
  console.log('✓ Contains SHIP_FORCES');
  
  if (!SHIPMENT_ACTION_TYPES.includes('FREMEN_SEND_FORCES')) {
    throw new Error('Expected SHIPMENT_ACTION_TYPES to contain FREMEN_SEND_FORCES');
  }
  console.log('✓ Contains FREMEN_SEND_FORCES');
  
  if (!SHIPMENT_ACTION_TYPES.includes('GUILD_CROSS_SHIP')) {
    throw new Error('Expected SHIPMENT_ACTION_TYPES to contain GUILD_CROSS_SHIP');
  }
  console.log('✓ Contains GUILD_CROSS_SHIP');
  
  if (!SHIPMENT_ACTION_TYPES.includes('GUILD_SHIP_OFF_PLANET')) {
    throw new Error('Expected SHIPMENT_ACTION_TYPES to contain GUILD_SHIP_OFF_PLANET');
  }
  console.log('✓ Contains GUILD_SHIP_OFF_PLANET');
  
  if (SHIPMENT_ACTION_TYPES.length !== 4) {
    throw new Error(`Expected SHIPMENT_ACTION_TYPES to have length 4, got ${SHIPMENT_ACTION_TYPES.length}`);
  }
  console.log('✓ Has correct length');
  
  console.log('✅ All SHIPMENT_ACTION_TYPES tests passed\n');
}

/**
 * Test MOVEMENT_ACTION_TYPES
 */
export function testMovementActionTypes() {
  console.log('\n=== Testing MOVEMENT_ACTION_TYPES ===');
  
  if (!MOVEMENT_ACTION_TYPES.includes('MOVE_FORCES')) {
    throw new Error('Expected MOVEMENT_ACTION_TYPES to contain MOVE_FORCES');
  }
  console.log('✓ Contains MOVE_FORCES');
  
  if (MOVEMENT_ACTION_TYPES.length !== 1) {
    throw new Error(`Expected MOVEMENT_ACTION_TYPES to have length 1, got ${MOVEMENT_ACTION_TYPES.length}`);
  }
  console.log('✓ Has correct length');
  
  console.log('✅ All MOVEMENT_ACTION_TYPES tests passed\n');
}

/**
 * Test REQUEST_TYPES
 */
export function testRequestTypes() {
  console.log('\n=== Testing REQUEST_TYPES ===');
  
  if (REQUEST_TYPES.SHIP_FORCES !== 'SHIP_FORCES') {
    throw new Error(`Expected REQUEST_TYPES.SHIP_FORCES to be 'SHIP_FORCES', got '${REQUEST_TYPES.SHIP_FORCES}'`);
  }
  console.log('✓ SHIP_FORCES correct');
  
  if (REQUEST_TYPES.MOVE_FORCES !== 'MOVE_FORCES') {
    throw new Error(`Expected REQUEST_TYPES.MOVE_FORCES to be 'MOVE_FORCES', got '${REQUEST_TYPES.MOVE_FORCES}'`);
  }
  console.log('✓ MOVE_FORCES correct');
  
  if (REQUEST_TYPES.GUILD_TIMING_DECISION !== 'GUILD_TIMING_DECISION') {
    throw new Error(`Expected REQUEST_TYPES.GUILD_TIMING_DECISION to be 'GUILD_TIMING_DECISION', got '${REQUEST_TYPES.GUILD_TIMING_DECISION}'`);
  }
  console.log('✓ GUILD_TIMING_DECISION correct');
  
  if (REQUEST_TYPES.SEND_ADVISOR !== 'SEND_ADVISOR') {
    throw new Error(`Expected REQUEST_TYPES.SEND_ADVISOR to be 'SEND_ADVISOR', got '${REQUEST_TYPES.SEND_ADVISOR}'`);
  }
  console.log('✓ SEND_ADVISOR correct');
  
  console.log('✅ All REQUEST_TYPES tests passed\n');
}

/**
 * Test FACTION_PHASES
 */
export function testFactionPhases() {
  console.log('\n=== Testing FACTION_PHASES ===');
  
  if (FACTION_PHASES.SHIP !== 'SHIP') {
    throw new Error(`Expected FACTION_PHASES.SHIP to be 'SHIP', got '${FACTION_PHASES.SHIP}'`);
  }
  console.log('✓ SHIP correct');
  
  if (FACTION_PHASES.MOVE !== 'MOVE') {
    throw new Error(`Expected FACTION_PHASES.MOVE to be 'MOVE', got '${FACTION_PHASES.MOVE}'`);
  }
  console.log('✓ MOVE correct');
  
  if (FACTION_PHASES.DONE !== 'DONE') {
    throw new Error(`Expected FACTION_PHASES.DONE to be 'DONE', got '${FACTION_PHASES.DONE}'`);
  }
  console.log('✓ DONE correct');
  
  console.log('✅ All FACTION_PHASES tests passed\n');
}

/**
 * Test isShipmentActionType
 */
export function testIsShipmentActionType() {
  console.log('\n=== Testing isShipmentActionType ===');
  
  if (!isShipmentActionType('SHIP_FORCES')) {
    throw new Error('Expected isShipmentActionType("SHIP_FORCES") to return true');
  }
  console.log('✓ SHIP_FORCES returns true');
  
  if (!isShipmentActionType('FREMEN_SEND_FORCES')) {
    throw new Error('Expected isShipmentActionType("FREMEN_SEND_FORCES") to return true');
  }
  console.log('✓ FREMEN_SEND_FORCES returns true');
  
  if (!isShipmentActionType('GUILD_CROSS_SHIP')) {
    throw new Error('Expected isShipmentActionType("GUILD_CROSS_SHIP") to return true');
  }
  console.log('✓ GUILD_CROSS_SHIP returns true');
  
  if (!isShipmentActionType('GUILD_SHIP_OFF_PLANET')) {
    throw new Error('Expected isShipmentActionType("GUILD_SHIP_OFF_PLANET") to return true');
  }
  console.log('✓ GUILD_SHIP_OFF_PLANET returns true');
  
  if (isShipmentActionType('MOVE_FORCES')) {
    throw new Error('Expected isShipmentActionType("MOVE_FORCES") to return false');
  }
  console.log('✓ MOVE_FORCES returns false');
  
  if (isShipmentActionType('INVALID')) {
    throw new Error('Expected isShipmentActionType("INVALID") to return false');
  }
  console.log('✓ INVALID returns false');
  
  console.log('✅ All isShipmentActionType tests passed\n');
}

/**
 * Test isMovementActionType
 */
export function testIsMovementActionType() {
  console.log('\n=== Testing isMovementActionType ===');
  
  if (!isMovementActionType('MOVE_FORCES')) {
    throw new Error('Expected isMovementActionType("MOVE_FORCES") to return true');
  }
  console.log('✓ MOVE_FORCES returns true');
  
  if (isMovementActionType('SHIP_FORCES')) {
    throw new Error('Expected isMovementActionType("SHIP_FORCES") to return false');
  }
  console.log('✓ SHIP_FORCES returns false');
  
  if (isMovementActionType('INVALID')) {
    throw new Error('Expected isMovementActionType("INVALID") to return false');
  }
  console.log('✓ INVALID returns false');
  
  console.log('✅ All isMovementActionType tests passed\n');
}

/**
 * Run all constants tests
 */
export function runConstantsTests() {
  console.log('='.repeat(80));
  console.log('CONSTANTS MODULE UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testShipmentActionTypes();
    testMovementActionTypes();
    testRequestTypes();
    testFactionPhases();
    testIsShipmentActionType();
    testIsMovementActionType();
    console.log('✅ All constants module tests passed!');
  } catch (error) {
    console.error('❌ Constants module tests failed:', error);
    throw error;
  }
}
