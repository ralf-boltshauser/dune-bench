#!/usr/bin/env npx tsx

/**
 * Unit test for Fremen shipment tool
 * Tests the fremen_send_forces tool validation and execution
 */

import { Faction, TerritoryId } from './src/lib/game/types';
import { createInitialState } from './src/lib/game/state';
import { ToolContextManager } from './src/lib/game/tools/context';
import { createShipmentTools } from './src/lib/game/tools/actions/shipment';
import { FremenSendForcesSchema } from './src/lib/game/tools/schemas';

async function runTests() {
  console.log('\n=== Fremen Shipment Tool Test ===\n');

  // Create initial game state with Fremen
  const state = createInitialState([Faction.FREMEN, Faction.ATREIDES]);
  console.log('Initial Fremen reserves:', state.factions.get(Faction.FREMEN)!.forces.reserves);
  console.log('Initial Fremen spice:', state.factions.get(Faction.FREMEN)!.spice);

  // Create tool context for Fremen
  const ctx = new ToolContextManager(state, Faction.FREMEN);
  const tools = createShipmentTools(ctx);

  console.log('\n=== Test Cases ===\n');

  // Test Case 1: Ship to Great Flat (should succeed)
  console.log('Test 1: Ship to Great Flat (sector 14)');
  try {
    const result = await tools.fremen_send_forces.execute!({
      territoryId: TerritoryId.THE_GREAT_FLAT,
      sector: 14,
      count: 5,
      useElite: false,
      allowStormMigration: false,
    }, {} as any);
    console.log('  Result:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('  Message:', result.message);
    if (result.data) {
      console.log('  Data:', JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.log('  ❌ ERROR:', error);
  }

  // Reset state
  ctx.updateState(state);

  console.log('\nTest 2: Ship to Funeral Plain (adjacent to Great Flat)');
  try {
    const result = await tools.fremen_send_forces.execute!({
      territoryId: TerritoryId.FUNERAL_PLAIN,
      sector: 14,
      count: 3,
      useElite: false,
      allowStormMigration: false,
    }, {} as any);
    console.log('  Result:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('  Message:', result.message);
    if (result.data) {
      console.log('  Cost:', result.data.cost);
    }
  } catch (error) {
    console.log('  ❌ ERROR:', error);
  }

  // Reset state
  ctx.updateState(state);

  console.log('\nTest 3: Ship to Habbanya Erg (adjacent to Great Flat)');
  try {
    const result = await tools.fremen_send_forces.execute!({
      territoryId: TerritoryId.HABBANYA_ERG,
      sector: 15,
      count: 3,
      useElite: false,
      allowStormMigration: false,
    }, {} as any);
    console.log('  Result:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('  Message:', result.message);
  } catch (error) {
    console.log('  ❌ ERROR:', error);
  }

  // Reset state
  ctx.updateState(state);

  console.log('\nTest 4: Ship to Sietch Tabr (TOO FAR - should fail)');
  try {
    const result = await tools.fremen_send_forces.execute!({
      territoryId: TerritoryId.SIETCH_TABR,
      sector: 13,
      count: 3,
      useElite: false,
      allowStormMigration: false,
    }, {} as any);
    console.log('  Result:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('  Message:', result.message);
    console.log('  Expected: FAILED (Sietch Tabr is more than 2 territories away)');
  } catch (error) {
    console.log('  ❌ ERROR:', error);
  }

  console.log('\n=== Test Complete ===\n');
  console.log('Summary:');
  console.log('  - Great Flat: Should succeed (distance 0)');
  console.log('  - Funeral Plain: Should succeed (distance 1)');
  console.log('  - Habbanya Erg: Should succeed (distance 1)');
  console.log('  - Sietch Tabr: Should FAIL (distance > 2)');
  console.log('\n');
}

// Run the tests
runTests().catch(console.error);
