/**
 * Unit Tests: Territory Extraction
 * 
 * Tests for territory extraction utilities.
 */

import {
  extractShipmentTerritory,
  extractMovementTerritory,
  extractIntrusionTerritory,
  extractSpiritualAdvisorTerritory,
} from '../../../phases/handlers/shipment-movement/utils/territory-extraction';
import { TerritoryId } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

/**
 * Test extractShipmentTerritory - normal shipment
 */
export function testExtractShipmentTerritoryNormal() {
  console.log('\n=== Testing extractShipmentTerritory (normal) ===');
  
  const response: AgentResponse = {
    factionId: 'ATREIDES' as any,
    actionType: 'SHIP_FORCES',
    data: {
      territoryId: TerritoryId.ARRAKEEN,
      sector: 9,
    },
    passed: false,
  };

  const result = extractShipmentTerritory(response, 'SHIP_FORCES');
  
  if (result.territoryId !== TerritoryId.ARRAKEEN) {
    throw new Error(`Expected territoryId to be ${TerritoryId.ARRAKEEN}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct');
  
  if (result.sector !== 9) {
    throw new Error(`Expected sector to be 9, got ${result.sector}`);
  }
  console.log('✓ Sector correct');
  
  console.log('✅ Normal shipment extraction passed\n');
}

/**
 * Test extractShipmentTerritory - Guild cross-ship
 */
export function testExtractShipmentTerritoryGuildCrossShip() {
  console.log('\n=== Testing extractShipmentTerritory (Guild cross-ship) ===');
  
  const response: AgentResponse = {
    factionId: 'SPACING_GUILD' as any,
    actionType: 'GUILD_CROSS_SHIP',
    data: {
      fromTerritoryId: TerritoryId.ARRAKEEN,
      fromSector: 9,
      toTerritoryId: TerritoryId.CARTHAG,
      toSector: 9,
    },
    passed: false,
  };

  const result = extractShipmentTerritory(response, 'GUILD_CROSS_SHIP');
  
  if (result.territoryId !== TerritoryId.CARTHAG) {
    throw new Error(`Expected territoryId to be ${TerritoryId.CARTHAG}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct (destination)');
  
  if (result.sector !== 9) {
    throw new Error(`Expected sector to be 9, got ${result.sector}`);
  }
  console.log('✓ Sector correct');
  
  console.log('✅ Guild cross-ship extraction passed\n');
}

/**
 * Test extractMovementTerritory - new format
 */
export function testExtractMovementTerritoryNewFormat() {
  console.log('\n=== Testing extractMovementTerritory (new format) ===');
  
  const response: AgentResponse = {
    factionId: 'ATREIDES' as any,
    actionType: 'MOVE_FORCES',
    data: {
      fromTerritoryId: TerritoryId.ARRAKEEN,
      fromSector: 9,
      toTerritoryId: TerritoryId.CARTHAG,
      toSector: 9,
    },
    passed: false,
  };

  const result = extractMovementTerritory(response);
  
  if (result.territoryId !== TerritoryId.CARTHAG) {
    throw new Error(`Expected territoryId to be ${TerritoryId.CARTHAG}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct');
  
  if (result.sector !== 9) {
    throw new Error(`Expected sector to be 9, got ${result.sector}`);
  }
  console.log('✓ Sector correct');
  
  console.log('✅ New format movement extraction passed\n');
}

/**
 * Test extractMovementTerritory - legacy format
 */
export function testExtractMovementTerritoryLegacyFormat() {
  console.log('\n=== Testing extractMovementTerritory (legacy format) ===');
  
  const response: AgentResponse = {
    factionId: 'ATREIDES' as any,
    actionType: 'MOVE_FORCES',
    data: {
      from: {
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
      },
      to: {
        territory: TerritoryId.CARTHAG,
        sector: 9,
      },
    },
    passed: false,
  };

  const result = extractMovementTerritory(response);
  
  if (result.territoryId !== TerritoryId.CARTHAG) {
    throw new Error(`Expected territoryId to be ${TerritoryId.CARTHAG}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct');
  
  if (result.sector !== 9) {
    throw new Error(`Expected sector to be 9, got ${result.sector}`);
  }
  console.log('✓ Sector correct');
  
  console.log('✅ Legacy format movement extraction passed\n');
}

/**
 * Test extractIntrusionTerritory - shipment
 */
export function testExtractIntrusionTerritoryShipment() {
  console.log('\n=== Testing extractIntrusionTerritory (shipment) ===');
  
  const response: AgentResponse = {
    factionId: 'ATREIDES' as any,
    actionType: 'SHIP_FORCES',
    data: {
      territoryId: TerritoryId.ARRAKEEN,
      sector: 9,
    },
    passed: false,
  };

  const result = extractIntrusionTerritory(response, 'SHIP_FORCES');
  
  if (result.territoryId !== TerritoryId.ARRAKEEN) {
    throw new Error(`Expected territoryId to be ${TerritoryId.ARRAKEEN}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct');
  
  console.log('✅ Shipment intrusion extraction passed\n');
}

/**
 * Test extractIntrusionTerritory - movement
 */
export function testExtractIntrusionTerritoryMovement() {
  console.log('\n=== Testing extractIntrusionTerritory (movement) ===');
  
  const response: AgentResponse = {
    factionId: 'ATREIDES' as any,
    actionType: 'MOVE_FORCES',
    data: {
      fromTerritoryId: TerritoryId.ARRAKEEN,
      fromSector: 9,
      toTerritoryId: TerritoryId.CARTHAG,
      toSector: 9,
    },
    passed: false,
  };

  const result = extractIntrusionTerritory(response, 'MOVE_FORCES');
  
  if (result.territoryId !== TerritoryId.CARTHAG) {
    throw new Error(`Expected territoryId to be ${TerritoryId.CARTHAG}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct (destination)');
  
  console.log('✅ Movement intrusion extraction passed\n');
}

/**
 * Test extractSpiritualAdvisorTerritory
 */
export function testExtractSpiritualAdvisorTerritory() {
  console.log('\n=== Testing extractSpiritualAdvisorTerritory ===');
  
  const response: AgentResponse = {
    factionId: 'ATREIDES' as any,
    actionType: 'SHIP_FORCES',
    data: {
      territoryId: TerritoryId.ARRAKEEN,
      sector: 9,
    },
    passed: false,
  };

  const result = extractSpiritualAdvisorTerritory(response);
  
  if (result.territoryId !== TerritoryId.ARRAKEEN) {
    throw new Error(`Expected territoryId to be ${TerritoryId.ARRAKEEN}, got ${result.territoryId}`);
  }
  console.log('✓ Territory ID correct');
  
  if (result.sector !== 9) {
    throw new Error(`Expected sector to be 9, got ${result.sector}`);
  }
  console.log('✓ Sector correct');
  
  console.log('✅ Spiritual advisor extraction passed\n');
}

/**
 * Run all territory extraction tests
 */
export function runTerritoryExtractionTests() {
  console.log('='.repeat(80));
  console.log('TERRITORY EXTRACTION UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    testExtractShipmentTerritoryNormal();
    testExtractShipmentTerritoryGuildCrossShip();
    testExtractMovementTerritoryNewFormat();
    testExtractMovementTerritoryLegacyFormat();
    testExtractIntrusionTerritoryShipment();
    testExtractIntrusionTerritoryMovement();
    testExtractSpiritualAdvisorTerritory();
    console.log('✅ All territory extraction tests passed!');
  } catch (error) {
    console.error('❌ Territory extraction tests failed:', error);
    throw error;
  }
}
