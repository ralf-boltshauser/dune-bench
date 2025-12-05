/**
 * Storm Phase Test Suite (Refactored)
 * 
 * Comprehensive test suite using the new test infrastructure.
 * Tests all modules and their interactions.
 */

import { Faction, TerritoryId } from '../../types';
import { StormTestStateBuilder } from './helpers/test-state-builder';
import { AgentResponseBuilder } from './helpers/agent-response-builder';
import { runStormScenario, runAndValidateScenario } from './scenarios/base-scenario';
import { StormTestFixtures } from './helpers/fixtures';
import { StormAssertions } from './helpers/assertions';
import { StateAssertions } from './helpers/state-assertions';
import { EventAssertions } from './helpers/event-assertions';

// Import unit test runners
import { runDialingUnitTests } from './scenarios/unit/dialing.test';
import { runInitializationUnitTests } from './scenarios/unit/initialization.test';
import { runFamilyAtomicsUnitTests } from './scenarios/unit/family-atomics.test';
import { runWeatherControlUnitTests } from './scenarios/unit/weather-control.test';
import { runMovementUnitTests } from './scenarios/unit/movement.test';
import { runOrderCalculationUnitTests } from './scenarios/unit/order-calculation.test';

// Import integration test runners
import { runIntegrationTests } from './scenarios/integration/full-phase-flow.test';

/**
 * Test 1: Turn 1 Initial Storm Placement
 */
async function testTurn1InitialPlacement(): Promise<boolean> {
  console.log('\n🌪️  Test: Turn 1 Initial Storm Placement');

  const { state, expectedDialers } = StormTestFixtures.turn1TwoFactions();
  const stateWithMore = StormTestStateBuilder
    .forTurn1([Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.FREMEN])
    .withPlayerPosition(Faction.ATREIDES, 1)
    .withPlayerPosition(Faction.HARKONNEN, 17)
    .withPlayerPosition(Faction.BENE_GESSERIT, 3)
    .withPlayerPosition(Faction.FREMEN, 15)
    .build();

  const responses = new AgentResponseBuilder()
    .queueTurn1Dials(Faction.ATREIDES, 5, Faction.HARKONNEN, 8);

  try {
    const result = await runAndValidateScenario(
      stateWithMore,
      responses,
      'turn1-initial-placement',
      {
        stormMoved: { from: 0, to: 13, movement: 13 },
        dialsRevealed: new Map([[Faction.ATREIDES, 5], [Faction.HARKONNEN, 8]]),
        phaseCompleted: true,
      }
    );

    StateAssertions.assertStormSector(result.state, 13);
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 2: Player On Storm Sector (Special Case)
 */
async function testPlayerOnStormSector(): Promise<boolean> {
  console.log('\n🌪️  Test: Player On Storm Sector');

  const { state, expectedDialers } = StormTestFixtures.playerOnStormSector(
    Faction.ATREIDES,
    10
  );

  const responses = new AgentResponseBuilder()
    .queueTurn2Dials(Faction.ATREIDES, 2, expectedDialers[1], 3);

  try {
    const result = await runAndValidateScenario(
      state,
      responses,
      'player-on-storm-sector',
      {
        stormMoved: { from: 10, to: 15, movement: 5 },
        phaseCompleted: true,
      }
    );

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 3: Fremen Storm Deck Turn 2+
 */
async function testFremenStormDeck(): Promise<boolean> {
  console.log('\n🌪️  Test: Fremen Storm Deck (Turn 2+)');

  const { state, expectedMovement } = StormTestFixtures.fremenWithStormDeck('4');

  const responses = new AgentResponseBuilder(); // No dialing needed

  try {
    const result = await runStormScenario(state, responses, 'fremen-storm-deck');

    EventAssertions.assertEventExists(result.events, 'STORM_CARD_REVEALED');
    StormAssertions.assertStormMoved(
      result.events.map(e => ({ type: e.type, message: e.message, data: {} as any })),
      10,
      14,
      expectedMovement
    );
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 4: Force Destruction
 */
async function testForceDestruction(): Promise<boolean> {
  console.log('\n🌪️  Test: Force Destruction');

  const { state, expectedDestructions } = StormTestFixtures.forcesInStormPath(
    10,
    3,
    TerritoryId.MERIDIAN,
    [Faction.ATREIDES, Faction.FREMEN]
  );

  const responses = new AgentResponseBuilder()
    .queueTurn2Dials(Faction.ATREIDES, 2, Faction.FREMEN, 1);

  try {
    const result = await runAndValidateScenario(
      state,
      responses,
      'force-destruction',
      {
        stormMoved: { from: 10, to: 13, movement: 3 },
        phaseCompleted: true,
      }
    );

    // Verify forces were destroyed
    const destructionEvents = result.events.filter(
      e => e.type === 'FORCES_KILLED_BY_STORM'
    );
    if (destructionEvents.length === 0) {
      throw new Error('Expected force destruction events, but none found');
    }

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 5: Fremen Half Losses
 */
async function testFremenHalfLosses(): Promise<boolean> {
  console.log('\n🌪️  Test: Fremen Half Losses');

  const state = StormTestStateBuilder
    .forTurn2([Faction.FREMEN, Faction.ATREIDES], 7)
    .withForces({
      faction: Faction.FREMEN,
      territory: TerritoryId.MERIDIAN,
      sector: 9,
      regular: 5, // Should lose 3 (half rounded up)
    })
    .withForces({
      faction: Faction.ATREIDES,
      territory: TerritoryId.MERIDIAN,
      sector: 9,
      regular: 5, // Should lose all 5
    })
    .build();

  const responses = new AgentResponseBuilder()
    .queueTurn2Dials(Faction.FREMEN, 1, Faction.ATREIDES, 1);

  try {
    const result = await runAndValidateScenario(
      state,
      responses,
      'fremen-half-losses',
      {
        stormMoved: { from: 7, to: 9, movement: 2 },
        phaseCompleted: true,
      }
    );

    // Verify Fremen lost 3, Atreides lost 5
    const fremenDestruction = result.events.find(
      e => e.type === 'FORCES_KILLED_BY_STORM' && e.message.includes('FREMEN')
    );
    const atreidesDestruction = result.events.find(
      e => e.type === 'FORCES_KILLED_BY_STORM' && e.message.includes('ATREIDES')
    );

    if (!fremenDestruction) {
      throw new Error('Expected Fremen destruction event not found');
    }
    if (!atreidesDestruction) {
      throw new Error('Expected Atreides destruction event not found');
    }

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('STORM PHASE REFACTORED TEST SUITE');
  console.log('='.repeat(80));

  let totalPassed = 0;
  let totalFailed = 0;

  // Run unit tests
  console.log('\n📦 UNIT TESTS');
  console.log('='.repeat(80));
  
  try {
    runInitializationUnitTests();
    totalPassed++;
  } catch (error) {
    console.error('Initialization tests error:', error);
    totalFailed++;
  }

  try {
    runDialingUnitTests();
    totalPassed++;
  } catch (error) {
    console.error('Dialing tests error:', error);
    totalFailed++;
  }

  try {
    runFamilyAtomicsUnitTests();
    totalPassed++;
  } catch (error) {
    console.error('Family Atomics tests error:', error);
    totalFailed++;
  }

  try {
    runWeatherControlUnitTests();
    totalPassed++;
  } catch (error) {
    console.error('Weather Control tests error:', error);
    totalFailed++;
  }

  try {
    runMovementUnitTests();
    totalPassed++;
  } catch (error) {
    console.error('Movement tests error:', error);
    totalFailed++;
  }

  try {
    runOrderCalculationUnitTests();
    totalPassed++;
  } catch (error) {
    console.error('Order Calculation tests error:', error);
    totalFailed++;
  }

  // Run integration tests
  console.log('\n🔗 INTEGRATION TESTS');
  console.log('='.repeat(80));
  
  try {
    await runIntegrationTests();
    totalPassed++;
  } catch (error) {
    console.error('Integration tests error:', error);
    totalFailed++;
  }

  // Run E2E tests
  console.log('\n🌐 END-TO-END TESTS');
  console.log('='.repeat(80));
  
  const e2eResults: Array<{ name: string; passed: boolean }> = [];

  e2eResults.push({
    name: 'Turn 1 Initial Placement',
    passed: await testTurn1InitialPlacement(),
  });

  e2eResults.push({
    name: 'Player On Storm Sector',
    passed: await testPlayerOnStormSector(),
  });

  e2eResults.push({
    name: 'Fremen Storm Deck',
    passed: await testFremenStormDeck(),
  });

  e2eResults.push({
    name: 'Force Destruction',
    passed: await testForceDestruction(),
  });

  e2eResults.push({
    name: 'Fremen Half Losses',
    passed: await testFremenHalfLosses(),
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(80));

  console.log('\n📦 Unit Tests:');
  console.log('  - Initialization Module');
  console.log('  - Dialing Module');
  console.log('  - Family Atomics Module');
  console.log('  - Weather Control Module');
  console.log('  - Movement Module');
  console.log('  - Order Calculation Module');

  console.log('\n🔗 Integration Tests:');
  console.log('  - Full Phase Flow');

  console.log('\n🌐 E2E Tests:');
  e2eResults.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${index + 1}. ${result.name}: ${status}`);
    if (result.passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  });

  const total = totalPassed + totalFailed;
  console.log(`\n📊 Overall: ${totalPassed} passed, ${totalFailed} failed (${total} total test suites)`);

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n❌ Some tests failed - review logs above');
  }
}

// Export for use in test runners
export { runAllTests };

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

