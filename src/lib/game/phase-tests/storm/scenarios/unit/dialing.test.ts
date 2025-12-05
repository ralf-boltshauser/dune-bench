/**
 * Unit Tests for Dialing Module
 * 
 * Tests the dialing module functions in isolation.
 */

import { Faction } from '../../../../types';
import { getStormDialers, processDialResponses } from '../../../../phases/handlers/storm/dialing';
import { resetContext } from '../../../../phases/handlers/storm/initialization';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { DialingTestHelpers } from '../../helpers/module-helpers/dialing-helpers';
import { StormAssertions } from '../../helpers/assertions';

/**
 * Test: Select nearest players on Turn 1
 */
export function testGetStormDialersTurn1(): boolean {
  console.log('\n📋 Test: getStormDialers - Turn 1');

  try {
    const state = StormTestStateBuilder
      .forTurn1([Faction.ATREIDES, Faction.HARKONNEN])
      .withPlayerPosition(Faction.ATREIDES, 1)
      .withPlayerPosition(Faction.HARKONNEN, 17)
      .build();

    const dialers = getStormDialers(state);
    DialingTestHelpers.assertDialersSelected(dialers, [Faction.ATREIDES, Faction.HARKONNEN]);
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Handle player on storm sector
 */
export function testGetStormDialersPlayerOnStorm(): boolean {
  console.log('\n📋 Test: getStormDialers - Player On Storm');

  try {
    const state = DialingTestHelpers.createPlayerOnStormState(
      Faction.ATREIDES,
      10,
      [Faction.HARKONNEN, Faction.BENE_GESSERIT]
    );

    const dialers = getStormDialers(state);
    if (dialers[0] !== Faction.ATREIDES) {
      throw new Error(`Expected first dialer to be ${Faction.ATREIDES}, but got ${dialers[0]}`);
    }
    if (dialers[1] === Faction.ATREIDES) {
      throw new Error('Expected second dialer to be different from first');
    }
    if (dialers[0] === dialers[1]) {
      throw new Error('Dialers must be distinct');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Process dial responses on Turn 2+
 */
export function testProcessDialResponsesTurn2(): boolean {
  console.log('\n📋 Test: processDialResponses - Turn 2+');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10)
      .build();

    const responses = new AgentResponseBuilder()
      .queueTurn2Dials(Faction.ATREIDES, 2, Faction.HARKONNEN, 3)
      .getResponsesArray();

    const context = resetContext();
    context.dialingFactions = [Faction.ATREIDES, Faction.HARKONNEN];

    const result = processDialResponses(state, responses, context);

    // Verify dials were recorded in context
    if (context.dials.size !== 2) {
      throw new Error(`Expected 2 dials in context, but got ${context.dials.size}`);
    }
    if (context.dials.get(Faction.ATREIDES) !== 2) {
      throw new Error(`Expected Atreides dial 2, but got ${context.dials.get(Faction.ATREIDES)}`);
    }
    if (context.dials.get(Faction.HARKONNEN) !== 3) {
      throw new Error(`Expected Harkonnen dial 3, but got ${context.dials.get(Faction.HARKONNEN)}`);
    }
    if (context.stormMovement !== 5) {
      throw new Error(`Expected movement 5, but got ${context.stormMovement}`);
    }
    
    // Note: processDialResponses calls checkFamilyAtomics which returns a new result
    // The dial reveal events are created but not in the returned result
    // We verify the context instead which is the source of truth
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Process dial responses on Turn 1
 */
export function testProcessDialResponsesTurn1(): boolean {
  console.log('\n📋 Test: processDialResponses - Turn 1');

  try {
    const state = StormTestStateBuilder
      .forTurn1([Faction.ATREIDES, Faction.HARKONNEN])
      .build();

    const responses = new AgentResponseBuilder()
      .queueTurn1Dials(Faction.ATREIDES, 5, Faction.HARKONNEN, 8)
      .getResponsesArray();

    const context = resetContext();
    context.dialingFactions = [Faction.ATREIDES, Faction.HARKONNEN];

    const result = processDialResponses(state, responses, context);

    // Verify dials were recorded in context
    if (context.dials.size !== 2) {
      throw new Error(`Expected 2 dials in context, but got ${context.dials.size}`);
    }
    if (context.dials.get(Faction.ATREIDES) !== 5) {
      throw new Error(`Expected Atreides dial 5, but got ${context.dials.get(Faction.ATREIDES)}`);
    }
    if (context.dials.get(Faction.HARKONNEN) !== 8) {
      throw new Error(`Expected Harkonnen dial 8, but got ${context.dials.get(Faction.HARKONNEN)}`);
    }
    if (context.stormMovement !== 13) {
      throw new Error(`Expected movement 13, but got ${context.stormMovement}`);
    }
    
    // Note: processDialResponses calls checkFamilyAtomics which returns a new result
    // The dial reveal events are created but not in the returned result
    // We verify the context instead which is the source of truth
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Dial clamping - Turn 1 (0-20 range)
 */
export function testDialClampingTurn1(): boolean {
  console.log('\n📋 Test: Dial Clamping - Turn 1');

  try {
    const state = StormTestStateBuilder
      .forTurn1([Faction.ATREIDES, Faction.HARKONNEN])
      .build();

    const context = resetContext();
    context.dialingFactions = [Faction.ATREIDES, Faction.HARKONNEN];

    // Test negative value (should clamp to 0)
    const responses1 = new AgentResponseBuilder()
      .queueStormDial(Faction.ATREIDES, -5)
      .queueStormDial(Faction.HARKONNEN, 10)
      .getResponsesArray();
    processDialResponses(state, responses1, context);
    if (context.dials.get(Faction.ATREIDES) !== 0) {
      throw new Error(`Expected clamped dial 0, but got ${context.dials.get(Faction.ATREIDES)}`);
    }

    // Test value > 20 (should clamp to 20)
    const context2 = resetContext();
    context2.dialingFactions = [Faction.ATREIDES, Faction.HARKONNEN];
    const responses2 = new AgentResponseBuilder()
      .queueStormDial(Faction.ATREIDES, 25)
      .queueStormDial(Faction.HARKONNEN, 10)
      .getResponsesArray();
    processDialResponses(state, responses2, context2);
    if (context2.dials.get(Faction.ATREIDES) !== 20) {
      throw new Error(`Expected clamped dial 20, but got ${context2.dials.get(Faction.ATREIDES)}`);
    }

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Dial clamping - Turn 2+ (1-3 range)
 */
export function testDialClampingTurn2(): boolean {
  console.log('\n📋 Test: Dial Clamping - Turn 2+');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10)
      .build();

    const context = resetContext();
    context.dialingFactions = [Faction.ATREIDES, Faction.HARKONNEN];

    // Test value < 1 (should clamp to 1)
    const responses1 = new AgentResponseBuilder()
      .queueStormDial(Faction.ATREIDES, 0)
      .queueStormDial(Faction.HARKONNEN, 2)
      .getResponsesArray();
    processDialResponses(state, responses1, context);
    if (context.dials.get(Faction.ATREIDES) !== 1) {
      throw new Error(`Expected clamped dial 1, but got ${context.dials.get(Faction.ATREIDES)}`);
    }

    // Test value > 3 (should clamp to 3)
    const context2 = resetContext();
    context2.dialingFactions = [Faction.ATREIDES, Faction.HARKONNEN];
    const responses2 = new AgentResponseBuilder()
      .queueStormDial(Faction.ATREIDES, 5)
      .queueStormDial(Faction.HARKONNEN, 2)
      .getResponsesArray();
    processDialResponses(state, responses2, context2);
    if (context2.dials.get(Faction.ATREIDES) !== 3) {
      throw new Error(`Expected clamped dial 3, but got ${context2.dials.get(Faction.ATREIDES)}`);
    }

    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: All factions on one side of sector 0 (Turn 1)
 */
export function testAllFactionsOnOneSideTurn1(): boolean {
  console.log('\n📋 Test: All Factions On One Side - Turn 1');

  try {
    const state = StormTestStateBuilder
      .forTurn1([Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT])
      .withPlayerPosition(Faction.ATREIDES, 1)
      .withPlayerPosition(Faction.HARKONNEN, 2)
      .withPlayerPosition(Faction.BENE_GESSERIT, 3)
      .build();

    const dialers = getStormDialers(state);
    if (dialers.length !== 2) {
      throw new Error(`Expected 2 dialers, but got ${dialers.length}`);
    }
    if (dialers[0] === dialers[1]) {
      throw new Error('Dialers must be distinct');
    }
    // Should select two nearest to sector 0
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Faction at sector 0 excluded (Turn 1)
 */
export function testFactionAtSector0Excluded(): boolean {
  console.log('\n📋 Test: Faction At Sector 0 Excluded - Turn 1');

  try {
    const state = StormTestStateBuilder
      .forTurn1([Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT])
      .withPlayerPosition(Faction.ATREIDES, 0)
      .withPlayerPosition(Faction.HARKONNEN, 1)
      .withPlayerPosition(Faction.BENE_GESSERIT, 17)
      .build();

    const dialers = getStormDialers(state);
    if (dialers.includes(Faction.ATREIDES)) {
      throw new Error('Faction at sector 0 should be excluded from dialing');
    }
    if (dialers.length !== 2) {
      throw new Error(`Expected 2 dialers, but got ${dialers.length}`);
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all dialing unit tests
 */
export function runDialingUnitTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('DIALING MODULE UNIT TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'getStormDialers - Turn 1',
    passed: testGetStormDialersTurn1(),
  });

  results.push({
    name: 'getStormDialers - Player On Storm',
    passed: testGetStormDialersPlayerOnStorm(),
  });

  results.push({
    name: 'processDialResponses - Turn 2+',
    passed: testProcessDialResponsesTurn2(),
  });

  results.push({
    name: 'processDialResponses - Turn 1',
    passed: testProcessDialResponsesTurn1(),
  });

  results.push({
    name: 'Dial Clamping - Turn 1',
    passed: testDialClampingTurn1(),
  });

  results.push({
    name: 'Dial Clamping - Turn 2+',
    passed: testDialClampingTurn2(),
  });

  results.push({
    name: 'All Factions On One Side - Turn 1',
    passed: testAllFactionsOnOneSideTurn1(),
  });

  results.push({
    name: 'Faction At Sector 0 Excluded',
    passed: testFactionAtSector0Excluded(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All dialing unit tests passed!');
  } else {
    console.log('\n❌ Some dialing unit tests failed');
  }
}

// Run if executed directly
if (require.main === module) {
  runDialingUnitTests();
}

