/**
 * Movement Context Builder Test
 * 
 * Validates that the movement context builder works correctly.
 * Run with: tsx src/lib/game/phases/handlers/shipment-movement/test-movement-context.ts
 */

import { Faction, TerritoryId } from '@/lib/game/types';
import { createGameState, shipForces, addSpiceToTerritory } from '@/lib/game/state';
import { buildMovementContext } from './builders/movement-context';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testBasicMovementContext(): void {
  console.log('Testing: Basic Movement Context');
  
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    advancedRules: false,
  });

  // Atreides starts with 10 forces in Arrakeen, so just verify existing forces
  // Add Harkonnen forces to reserves and ship them
  const harkonnenState = state.factions.get(Faction.HARKONNEN)!;
  harkonnenState.forces.reserves.regular = 3;
  state = shipForces(state, Faction.HARKONNEN, TerritoryId.CARTHAG, 10, 3, false);

  const context = buildMovementContext(state, Faction.ATREIDES, 1, false);

  assert(context.forceStacks.length > 0, 'Should have at least 1 force stack');
  const arrakeenStack = context.forceStacks.find(s => s.fromTerritory.territoryId === TerritoryId.ARRAKEEN);
  assert(arrakeenStack !== undefined, 'Should have forces in Arrakeen');
  const totalForces = arrakeenStack!.myForces.regular + arrakeenStack!.myForces.elite;
  assert(totalForces > 0, `Should have forces in Arrakeen, got ${totalForces}`);
  assert(context.movementRange === 1, 'Movement range should be 1');
  assert(context.hasOrnithopters === false, 'Should not have ornithopters');
  assert(context.forceStacks[0].reachableTerritories.length > 0, 'Should have reachable territories');

  console.log('  ✅ Basic Movement Context: PASS');
}

function testSpiceInformation(): void {
  console.log('Testing: Spice Information');
  
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });

  // Atreides starts with forces in Arrakeen
  // Add spice to a reachable territory
  state = addSpiceToTerritory(state, TerritoryId.IMPERIAL_BASIN, 9, 8);

  const context = buildMovementContext(state, Faction.ATREIDES, 1, false);

  const arrakeenStack = context.forceStacks.find(s => s.fromTerritory.territoryId === TerritoryId.ARRAKEEN);
  assert(arrakeenStack !== undefined, 'Should have forces in Arrakeen');
  
  const imperialBasinInfo = arrakeenStack!.reachableTerritories.find(
    t => t.territory.territoryId === TerritoryId.IMPERIAL_BASIN
  );

  if (imperialBasinInfo) {
    assert(imperialBasinInfo.territory.spice === 8, 'Imperial Basin should have 8 spice');
    assert(imperialBasinInfo.territory.spiceBySector.length > 0, 'Should have spice by sector info');
  } else {
    // If not reachable, test with a different territory or 3-range movement
    const context3 = buildMovementContext(state, Faction.ATREIDES, 3, true);
    const arrakeenStack3 = context3.forceStacks.find(s => s.fromTerritory.territoryId === TerritoryId.ARRAKEEN);
    const imperialBasinInfo3 = arrakeenStack3!.reachableTerritories.find(
      t => t.territory.territoryId === TerritoryId.IMPERIAL_BASIN
    );
    assert(imperialBasinInfo3 !== undefined, 'Imperial Basin should be reachable with 3-range');
    // TypeScript doesn't narrow after assert, so we need to check again or use non-null assertion
    if (imperialBasinInfo3 === undefined) {
      throw new Error('Imperial Basin should be reachable with 3-range');
    }
    assert(imperialBasinInfo3.territory.spice === 8, 'Imperial Basin should have 8 spice');
  }

  console.log('  ✅ Spice Information: PASS');
}

function testStrongholdOccupancy(): void {
  console.log('Testing: Stronghold Occupancy Limits');
  
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    advancedRules: false,
  });

  // Add forces to reserves first
  const atreidesState = state.factions.get(Faction.ATREIDES)!;
  atreidesState.forces.reserves.regular = 5;
  const emperorState = state.factions.get(Faction.EMPEROR)!;
  emperorState.forces.reserves.regular = 2;
  const harkonnenState = state.factions.get(Faction.HARKONNEN)!;
  harkonnenState.forces.reserves.regular = 3;
  
  state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5, false);
  state = shipForces(state, Faction.EMPEROR, TerritoryId.TUEKS_SIETCH, 9, 2, false);
  state = shipForces(state, Faction.HARKONNEN, TerritoryId.TUEKS_SIETCH, 9, 3, false);
  // Now Tuek's Sietch has 2 other factions

  const context = buildMovementContext(state, Faction.ATREIDES, 3, true);

  const tueksInfo = context.forceStacks[0].reachableTerritories.find(
    t => t.territory.territoryId === TerritoryId.TUEKS_SIETCH
  );

  if (tueksInfo) {
    assert(tueksInfo.territory.canMoveHere === false, 'Should not be able to move to full stronghold');
    assert(tueksInfo.territory.occupancyCount === 2, 'Should have 2 occupants');
    assert(tueksInfo.territory.reasonCannotMove !== null, 'Should have reason why cannot move');
  }

  console.log('  ✅ Stronghold Occupancy Limits: PASS');
}

function testMultipleForceStacks(): void {
  console.log('Testing: Multiple Force Stacks');
  
  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });

  const atreidesState = state.factions.get(Faction.ATREIDES)!;
  atreidesState.forces.reserves.regular = 8;
  
  state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5, false);
  state = shipForces(state, Faction.ATREIDES, TerritoryId.IMPERIAL_BASIN, 9, 3, false);

  const context = buildMovementContext(state, Faction.ATREIDES, 1, false);

  assert(context.forceStacks.length === 2, 'Should have 2 force stacks');
  assert(context.forceStacks.some(s => s.fromTerritory.territoryId === TerritoryId.ARRAKEEN), 'Should have Arrakeen');
  assert(context.forceStacks.some(s => s.fromTerritory.territoryId === TerritoryId.IMPERIAL_BASIN), 'Should have Imperial Basin');

  console.log('  ✅ Multiple Force Stacks: PASS');
}

function testTerritoryDetails(): void {
  console.log('Testing: Territory Details');
  
  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: false,
  });

  const context = buildMovementContext(state, Faction.ATREIDES, 1, false);

  // Should have all required fields
  assert(context.hasOwnProperty('movementRange'), 'Should have movementRange');
  assert(context.hasOwnProperty('hasOrnithopters'), 'Should have hasOrnithopters');
  assert(context.hasOwnProperty('stormSector'), 'Should have stormSector');
  assert(context.hasOwnProperty('forceStacks'), 'Should have forceStacks');
  assert(Array.isArray(context.forceStacks), 'forceStacks should be array');

  console.log('  ✅ Territory Details: PASS');
}

function runAllTests(): void {
  console.log('='.repeat(80));
  console.log('MOVEMENT CONTEXT BUILDER TESTS');
  console.log('='.repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;

  const tests = [
    { name: 'Basic Movement Context', fn: testBasicMovementContext },
    { name: 'Spice Information', fn: testSpiceInformation },
    { name: 'Stronghold Occupancy', fn: testStrongholdOccupancy },
    { name: 'Multiple Force Stacks', fn: testMultipleForceStacks },
    { name: 'Territory Details', fn: testTerritoryDetails },
  ];

  for (const test of tests) {
    try {
      test.fn();
      passed++;
    } catch (error) {
      failed++;
      console.error(`  ❌ ${test.name}: FAILED`);
      console.error(`     ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };

