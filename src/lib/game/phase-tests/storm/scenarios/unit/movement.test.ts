/**
 * Unit Tests for Movement Module
 */

import { Faction, TerritoryId } from '../../../../types';
import {
  destroyForcesInStorm,
  destroySpiceInStorm,
} from '../../../../phases/handlers/storm/movement';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { MovementTestHelpers } from '../../helpers/module-helpers/movement-helpers';
import { GAME_CONSTANTS } from '../../../../data';

/**
 * Test: calculateNewStormSector
 */
export function testCalculateNewStormSector(): boolean {
  console.log('\n📋 Test: calculateNewStormSector');

  try {
    // Use helper function to calculate
    const newSector1 = MovementTestHelpers.calculateNewSector(10, 5);
    if (newSector1 !== 15) {
      throw new Error(`Expected 15, but got ${newSector1}`);
    }

    const newSector2 = MovementTestHelpers.calculateNewSector(17, 3);
    if (newSector2 !== 2) {
      throw new Error(`Expected 2 (wrapping), but got ${newSector2}`);
    }

    const newSector3 = MovementTestHelpers.calculateNewSector(10, 18);
    if (newSector3 !== 10) {
      throw new Error(`Expected 10 (full wrap), but got ${newSector3}`);
    }

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.03
 * Test: destroyForcesInStorm - Fremen half losses
 * Verifies that Fremen Forces take only half losses (rounded up) when destroyed by storm,
 * as per rule 1.01.03 Fremen Exception (-2.04.16).
 */
export function testDestroyForcesFremenHalfLosses(): boolean {
  console.log('\n📋 Test: destroyForcesInStorm - Fremen Half Losses');

  try {
    // Storm from 10 with movement 3 affects sectors [10, 11, 12, 13]
    // HAGGA_BASIN has sectors [11, 12] and is a sand territory (not protected)
    const state = MovementTestHelpers.createWithForcesInPath(
      10,
      3,
      [{
        faction: Faction.FREMEN,
        territory: TerritoryId.HAGGA_BASIN, // Has sector 12, sand territory, not protected
        sector: 12,
        regular: 5,
      }]
    );

    const destructions = destroyForcesInStorm(state, 10, 3);

    const fremenDestruction = destructions.find(d => d.faction === Faction.FREMEN);
    if (!fremenDestruction) {
      throw new Error('Expected Fremen destruction not found');
    }
    // 5 forces -> half rounded up = 3
    if (fremenDestruction.count !== 3) {
      throw new Error(`Expected 3 forces destroyed, but got ${fremenDestruction.count}`);
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * @rule-test 1.01.03
 * Test: destroySpiceInStorm
 * Verifies that spice in sectors where a storm passes over or stops is destroyed
 * and placed in the Spice Bank, as per rule 1.01.03.
 */
export function testDestroySpiceInStorm(): boolean {
  console.log('\n📋 Test: destroySpiceInStorm');

  try {
    // Use a known sand territory that's not protected
    const state = MovementTestHelpers.createWithSpiceInPath(
      10,
      3,
      [{
        territory: TerritoryId.HABBANYA_ERG, // Sand territory, not protected
        sector: 12,
        amount: 5,
      }]
    );

    const destructions = destroySpiceInStorm(state, 10, 3);

    if (destructions.length === 0) {
      throw new Error('Expected spice destruction, but none found');
    }

    const spiceDestruction = destructions.find(
      d => d.territoryId === TerritoryId.HABBANYA_ERG && d.sector === 12
    );
    if (!spiceDestruction) {
      throw new Error('Expected spice destruction not found');
    }
    if (spiceDestruction.amount !== 5) {
      throw new Error(`Expected 5 spice destroyed, but got ${spiceDestruction.amount}`);
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all movement unit tests
 */
export function runMovementUnitTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('MOVEMENT MODULE UNIT TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'calculateNewStormSector',
    passed: testCalculateNewStormSector(),
  });

  results.push({
    name: 'destroyForcesInStorm - Fremen Half Losses',
    passed: testDestroyForcesFremenHalfLosses(),
  });

  results.push({
    name: 'destroySpiceInStorm',
    passed: testDestroySpiceInStorm(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
}

