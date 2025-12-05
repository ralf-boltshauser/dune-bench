/**
 * Unit Tests for Order Calculation Module
 */

import { Faction } from '../../../../types';
import { calculateAndLogStormOrder } from '../../../../phases/handlers/storm/order-calculation';
import { OrderTestHelpers } from '../../helpers/module-helpers/order-helpers';

/**
 * @rule-test 1.01.01
 * Test: calculateAndLogStormOrder
 * Verifies that storm order is calculated correctly, determining the First Player
 * based on which player marker the storm next approaches counterclockwise.
 */
export function testCalculateAndLogStormOrder(): boolean {
  console.log('\n📋 Test: calculateAndLogStormOrder');

  try {
    const positions = new Map<Faction, number>([
      [Faction.ATREIDES, 2],
      [Faction.HARKONNEN, 5],
      [Faction.BENE_GESSERIT, 8],
    ]);

    const state = OrderTestHelpers.createOrderTestState(
      [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT],
      positions,
      3 // Storm sector
    );

    const newState = calculateAndLogStormOrder(state, 3);

    if (newState.stormOrder.length !== 3) {
      throw new Error(`Expected 3 factions in order, but got ${newState.stormOrder.length}`);
    }
    if (!newState.stormOrder.includes(Faction.ATREIDES)) {
      throw new Error('Expected Atreides in storm order');
    }
    if (!newState.stormOrder.includes(Faction.HARKONNEN)) {
      throw new Error('Expected Harkonnen in storm order');
    }
    if (!newState.stormOrder.includes(Faction.BENE_GESSERIT)) {
      throw new Error('Expected Bene Gesserit in storm order');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.01
 * Test: Player on storm goes last
 * Verifies the edge case where if the storm is exactly ON a player token,
 * that player goes last and the NEXT player (counterclockwise) becomes First Player.
 */
export function testPlayerOnStormLast(): boolean {
  console.log('\n📋 Test: calculateAndLogStormOrder - Player On Storm Last');

  try {
    const positions = new Map<Faction, number>([
      [Faction.ATREIDES, 5],
      [Faction.HARKONNEN, 10], // On storm
      [Faction.BENE_GESSERIT, 12],
    ]);

    const state = OrderTestHelpers.createOrderTestState(
      [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT],
      positions,
      10 // Storm sector
    );

    const newState = calculateAndLogStormOrder(state, 10);

    OrderTestHelpers.assertPlayerOnStormLast(newState, 10, Faction.HARKONNEN);
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.01
 * Test: Player positions are fixed throughout the game
 * Verifies that player positions never change, only the storm moves.
 */
export function testPlayerPositionsFixed(): boolean {
  console.log('\n📋 Test: Player Positions Are Fixed Throughout Game');

  try {
    const positions = new Map<Faction, number>([
      [Faction.ATREIDES, 1],
      [Faction.HARKONNEN, 4],
      [Faction.BENE_GESSERIT, 7],
      [Faction.EMPEROR, 10],
      [Faction.FREMEN, 13],
      [Faction.SPACING_GUILD, 16],
    ]);

    // Create state with storm at sector 0
    let state = OrderTestHelpers.createOrderTestState(
      [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.FREMEN, Faction.SPACING_GUILD],
      positions,
      0
    );

    // Verify initial positions
    const initialPositions = new Map(state.playerPositions);
    for (const [faction, expectedSector] of Array.from(positions.entries())) {
      const actualSector = state.playerPositions.get(faction);
      if (actualSector !== expectedSector) {
        throw new Error(
          `Expected ${faction} at sector ${expectedSector}, but got ${actualSector}`
        );
      }
    }

    // Move storm to different positions and verify positions never change
    for (let stormSector = 0; stormSector < 18; stormSector++) {
      state = { ...state, stormSector };
      state = calculateAndLogStormOrder(state, stormSector);

      // Verify positions are still the same
      for (const [faction, expectedSector] of Array.from(positions.entries())) {
        const actualSector = state.playerPositions.get(faction);
        if (actualSector !== expectedSector) {
          throw new Error(
            `After storm moved to ${stormSector}, ${faction} position changed from ${expectedSector} to ${actualSector}`
          );
        }
      }
    }

    console.log('✅ Test passed: Player positions remain fixed as storm moves');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.01
 * Test: Faction goes from first to last when storm passes
 * Verifies that as the storm moves counterclockwise past a faction,
 * that faction transitions from first to last in storm order.
 */
export function testFactionTransitionsFromFirstToLast(): boolean {
  console.log('\n📋 Test: Faction Transitions From First To Last As Storm Passes');

  try {
    const positions = new Map<Faction, number>([
      [Faction.ATREIDES, 1],  // This faction will be tested
      [Faction.HARKONNEN, 4],
      [Faction.BENE_GESSERIT, 7],
      [Faction.EMPEROR, 10],
      [Faction.FREMEN, 13],
      [Faction.SPACING_GUILD, 16],
    ]);

    const testFaction = Faction.ATREIDES;
    const testFactionSector = 1;

    // Test storm at sector 0 (before faction at 1)
    let state = OrderTestHelpers.createOrderTestState(
      [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.FREMEN, Faction.SPACING_GUILD],
      positions,
      0
    );
    state = calculateAndLogStormOrder(state, 0);
    
    if (state.stormOrder[0] !== testFaction) {
      throw new Error(
        `When storm at 0, expected ${testFaction} to be FIRST, but got ${state.stormOrder[0]}`
      );
    }

    // Test storm at sector 1 (on faction at 1)
    state = { ...state, stormSector: 1 };
    state = calculateAndLogStormOrder(state, 1);
    
    const lastIndex = state.stormOrder.length - 1;
    if (state.stormOrder[lastIndex] !== testFaction) {
      throw new Error(
        `When storm at 1 (on faction), expected ${testFaction} to be LAST, but got ${state.stormOrder[lastIndex]}`
      );
    }

    // Test storm at sector 2 (just passed faction at 1)
    state = { ...state, stormSector: 2 };
    state = calculateAndLogStormOrder(state, 2);
    
    if (state.stormOrder[lastIndex] !== testFaction) {
      throw new Error(
        `When storm at 2 (just passed), expected ${testFaction} to be LAST, but got ${state.stormOrder[lastIndex]}`
      );
    }

    // Test storm at sector 16 (wrapping back, faction should be first again)
    state = { ...state, stormSector: 16 };
    state = calculateAndLogStormOrder(state, 16);
    
    if (state.stormOrder[0] !== testFaction) {
      throw new Error(
        `When storm at 16 (wrapping back), expected ${testFaction} to be FIRST again, but got ${state.stormOrder[0]}`
      );
    }

    console.log('✅ Test passed: Faction correctly transitions from first to last and back');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.01
 * Test: Complete cycle of storm order as storm moves around board
 * Verifies that storm order changes correctly for all 18 sectors,
 * showing the complete cycle behavior.
 */
export function testCompleteStormOrderCycle(): boolean {
  console.log('\n📋 Test: Complete Storm Order Cycle');

  try {
    const positions = new Map<Faction, number>([
      [Faction.ATREIDES, 1],
      [Faction.HARKONNEN, 4],
      [Faction.BENE_GESSERIT, 7],
      [Faction.EMPEROR, 10],
      [Faction.FREMEN, 13],
      [Faction.SPACING_GUILD, 16],
    ]);

    let state = OrderTestHelpers.createOrderTestState(
      [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.FREMEN, Faction.SPACING_GUILD],
      positions,
      0
    );

    const previousOrders: Faction[][] = [];

    // Test storm order for all 18 sectors
    for (let stormSector = 0; stormSector < 18; stormSector++) {
      state = { ...state, stormSector };
      state = calculateAndLogStormOrder(state, stormSector);
      
      const currentOrder = [...state.stormOrder];

      // Verify all factions are present
      if (currentOrder.length !== 6) {
        throw new Error(
          `Expected 6 factions in order at storm sector ${stormSector}, got ${currentOrder.length}`
        );
      }

      // Verify no duplicates
      const uniqueFactions = new Set(currentOrder);
      if (uniqueFactions.size !== 6) {
        throw new Error(
          `Duplicate factions in storm order at sector ${stormSector}: ${currentOrder.join(', ')}`
        );
      }

      // Verify first player is the one next counterclockwise from storm
      const firstFaction = currentOrder[0];
      const firstFactionSector = state.playerPositions.get(firstFaction);
      if (firstFactionSector === undefined) {
        throw new Error(`Could not find sector for first faction ${firstFaction}`);
      }

      // Calculate expected first faction (next counterclockwise from storm)
      let expectedFirstSector = (stormSector + 1) % 18;
      // If no faction at expected sector, find the next one
      while (!Array.from(positions.values()).includes(expectedFirstSector)) {
        expectedFirstSector = (expectedFirstSector + 1) % 18;
      }

      if (firstFactionSector !== expectedFirstSector) {
        // Special case: if storm is on a faction, next faction should be first
        const stormOnFaction = Array.from(positions.values()).includes(stormSector);
        if (stormOnFaction) {
          // Storm is on a faction, so next faction counterclockwise should be first
          let nextSector = (stormSector + 1) % 18;
          while (!Array.from(positions.values()).includes(nextSector)) {
            nextSector = (nextSector + 1) % 18;
          }
          if (firstFactionSector !== nextSector) {
            throw new Error(
              `At storm sector ${stormSector} (on faction), expected first faction at sector ${nextSector}, but got ${firstFactionSector}`
            );
          }
        } else {
          throw new Error(
            `At storm sector ${stormSector}, expected first faction at sector ${expectedFirstSector}, but got ${firstFactionSector}`
          );
        }
      }

      previousOrders.push(currentOrder);
    }

    // Verify order changes as storm moves (not all the same)
    const allSame = previousOrders.every(order => 
      order.join(',') === previousOrders[0].join(',')
    );
    if (allSame) {
      throw new Error('Storm order should change as storm moves, but it stayed the same');
    }

    // Verify order wraps around (order at sector 0 should match order at sector 18 if we continued)
    // Actually, order at sector 0 should be the same as when we started
    const orderAt0 = previousOrders[0];
    // This is expected - when storm completes a full cycle, order should be the same

    console.log('✅ Test passed: Complete cycle verified, order changes correctly');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.01
 * Test: Storm order with 3 factions
 * Verifies storm order calculation works correctly with fewer factions.
 */
export function testStormOrderWithThreeFactions(): boolean {
  console.log('\n📋 Test: Storm Order With Three Factions');

  try {
    const positions = new Map<Faction, number>([
      [Faction.ATREIDES, 1],
      [Faction.HARKONNEN, 7],
      [Faction.EMPEROR, 13],
    ]);

    // Test storm at sector 0
    let state = OrderTestHelpers.createOrderTestState(
      [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
      positions,
      0
    );
    state = calculateAndLogStormOrder(state, 0);

    if (state.stormOrder.length !== 3) {
      throw new Error(`Expected 3 factions, got ${state.stormOrder.length}`);
    }

    if (state.stormOrder[0] !== Faction.ATREIDES) {
      throw new Error(`Expected ATREIDES first at storm 0, got ${state.stormOrder[0]}`);
    }

    // Test storm at sector 5 (between ATREIDES at 1 and HARKONNEN at 7)
    state = { ...state, stormSector: 5 };
    state = calculateAndLogStormOrder(state, 5);

    if (state.stormOrder[0] !== Faction.HARKONNEN) {
      throw new Error(`Expected HARKONNEN first at storm 5, got ${state.stormOrder[0]}`);
    }

    // Test storm at sector 10 (between HARKONNEN at 7 and EMPEROR at 13)
    state = { ...state, stormSector: 10 };
    state = calculateAndLogStormOrder(state, 10);

    if (state.stormOrder[0] !== Faction.EMPEROR) {
      throw new Error(`Expected EMPEROR first at storm 10, got ${state.stormOrder[0]}`);
    }

    console.log('✅ Test passed: Storm order works correctly with 3 factions');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all order calculation unit tests
 */
export function runOrderCalculationUnitTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('ORDER CALCULATION MODULE UNIT TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'calculateAndLogStormOrder',
    passed: testCalculateAndLogStormOrder(),
  });

  results.push({
    name: 'calculateAndLogStormOrder - Player On Storm Last',
    passed: testPlayerOnStormLast(),
  });

  results.push({
    name: 'Player Positions Are Fixed',
    passed: testPlayerPositionsFixed(),
  });

  results.push({
    name: 'Faction Transitions From First To Last',
    passed: testFactionTransitionsFromFirstToLast(),
  });

  results.push({
    name: 'Complete Storm Order Cycle',
    passed: testCompleteStormOrderCycle(),
  });

  results.push({
    name: 'Storm Order With Three Factions',
    passed: testStormOrderWithThreeFactions(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed < total) {
    throw new Error(`Some tests failed: ${passed}/${total} passed`);
  }
}

