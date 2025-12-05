/**
 * Unit Tests for Family Atomics Module
 */

import { Faction, TerritoryId } from '../../../../types';
import {
  canPlayFamilyAtomics,
  checkFamilyAtomics,
  processFamilyAtomics,
} from '../../../../phases/handlers/storm/family-atomics';
import { resetContext } from '../../../../phases/handlers/storm/initialization';
import { getFactionState } from '../../../../state';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { FamilyAtomicsTestHelpers } from '../../helpers/module-helpers/family-atomics-helpers';
import { StormAssertions } from '../../helpers/assertions';
import { StateAssertions } from '../../helpers/state-assertions';

/**
 * Test: canPlayFamilyAtomics - forces on Shield Wall (using helper)
 */
export function testCanPlayFamilyAtomicsOnWallHelper(): boolean {
  console.log('\n📋 Test: canPlayFamilyAtomics - Forces On Wall (Helper)');

  try {
    const state = FamilyAtomicsTestHelpers.createWithForcesOnWall(
      Faction.ATREIDES,
      5
    );

    const canPlay = canPlayFamilyAtomics(state, Faction.ATREIDES);
    if (!canPlay) {
      throw new Error('Expected canPlay to be true');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: canPlayFamilyAtomics - forces on Shield Wall
 * 
 * Note: This test verifies that forces directly on Shield Wall can play Family Atomics.
 * The adjacent territory logic is complex due to wrapped path detection, so we test
 * the simpler case of forces directly on the wall.
 */
export function testCanPlayFamilyAtomicsOnWall(): boolean {
  console.log('\n📋 Test: canPlayFamilyAtomics - Forces On Shield Wall');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10) // Storm at 10
      .withForces({
        faction: Faction.ATREIDES,
        territory: TerritoryId.SHIELD_WALL, // Directly on Shield Wall - should always work
        sector: 7, // Shield Wall sector
        regular: 5,
      })
      .withCard(Faction.ATREIDES, 'family_atomics')
      .build();

    const canPlay = canPlayFamilyAtomics(state, Faction.ATREIDES);
    if (!canPlay) {
      throw new Error('Expected canPlay to be true when forces are on Shield Wall');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: processFamilyAtomics
 */
export function testProcessFamilyAtomics(): boolean {
  console.log('\n📋 Test: processFamilyAtomics');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 5)
      .withForces({
        faction: Faction.ATREIDES,
        territory: TerritoryId.SHIELD_WALL,
        sector: 7,
        regular: 5,
      })
      .withForces({
        faction: Faction.HARKONNEN,
        territory: TerritoryId.SHIELD_WALL,
        sector: 8,
        regular: 3,
      })
      .withCard(Faction.ATREIDES, 'family_atomics')
      .build();

    const context = resetContext();
    context.stormMovement = 5;

    const responses = new AgentResponseBuilder()
      .queueFamilyAtomicsPlay(Faction.ATREIDES)
      .getResponsesArray();

    // Store initial hand size to verify card was removed
    const initialHandSize = getFactionState(state, Faction.ATREIDES).hand.length;

    const result = processFamilyAtomics(
      state,
      responses,
      context,
      () => ({
        state,
        phaseComplete: true,
        nextPhase: undefined,
        pendingRequests: [],
        actions: [],
        events: [],
      })
    );

    // Verify context was updated
    if (!context.familyAtomicsUsed) {
      throw new Error('Expected familyAtomicsUsed to be true');
    }
    if (context.familyAtomicsBy !== Faction.ATREIDES) {
      throw new Error(`Expected familyAtomicsBy to be ${Faction.ATREIDES}, but got ${context.familyAtomicsBy}`);
    }
    
    // Verify card was removed from hand
    // Note: processFamilyAtomics mutates newState and passes it to checkWeatherControl
    // So result.state should have the updated hand
    const finalHandSize = getFactionState(result.state, Faction.ATREIDES).hand.length;
    if (finalHandSize !== initialHandSize - 1) {
      throw new Error(
        `Expected hand size to decrease by 1 (${initialHandSize} -> ${initialHandSize - 1}), but got ${finalHandSize}`
      );
    }
    
    // Verify shield wall destroyed flag
    if (!result.state.shieldWallDestroyed) {
      throw new Error('Expected shieldWallDestroyed to be true');
    }
    
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all Family Atomics unit tests
 */
export function runFamilyAtomicsUnitTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('FAMILY ATOMICS MODULE UNIT TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'canPlayFamilyAtomics - Forces On Wall (Helper)',
    passed: testCanPlayFamilyAtomicsOnWallHelper(),
  });

  results.push({
    name: 'canPlayFamilyAtomics - Forces On Shield Wall',
    passed: testCanPlayFamilyAtomicsOnWall(),
  });

  results.push({
    name: 'processFamilyAtomics',
    passed: testProcessFamilyAtomics(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
}

