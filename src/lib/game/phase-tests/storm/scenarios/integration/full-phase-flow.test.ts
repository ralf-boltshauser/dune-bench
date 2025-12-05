/**
 * Integration Tests: Full Phase Flow
 * 
 * Tests the complete storm phase flow with all modules working together.
 */

import { Faction, TerritoryId } from '../../../../types';
import { StormPhaseHandler } from '../../../../phases/handlers/storm';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { StormAssertions } from '../../helpers/assertions';
import { EventAssertions } from '../../helpers/event-assertions';

/**
 * Test: Complete full phase with dialing
 */
export function testFullPhaseWithDialing(): boolean {
  console.log('\n📋 Test: Full Phase Flow - Dialing');

  try {
    const state = StormTestStateBuilder
      .forTurn2([Faction.ATREIDES, Faction.HARKONNEN], 10)
      .build();

    const handler = new StormPhaseHandler();
    const initResult = handler.initialize(state);

    // Should have dial requests
    StormAssertions.assertPendingRequests(initResult, 2, ['DIAL_STORM']);

    // Process dial responses
    const responses = new AgentResponseBuilder()
      .queueTurn2Dials(Faction.ATREIDES, 2, Faction.HARKONNEN, 3)
      .getResponsesArray();

    const stepResult = handler.processStep(state, responses);

    // Should eventually complete
    if (stepResult.events.length === 0) {
      throw new Error('Expected events, but got none');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Fremen storm deck flow
 */
export function testFremenStormDeckFlow(): boolean {
  console.log('\n📋 Test: Full Phase Flow - Fremen Storm Deck');

  try {
    const state = StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withStormSector(10)
      .withFremenStormCard('4')
      .build();

    const handler = new StormPhaseHandler();
    const initResult = handler.initialize(state);

    // Should not have dial requests (uses storm deck)
    if (initResult.pendingRequests.length !== 0) {
      throw new Error('Expected no dial requests for storm deck');
    }
    EventAssertions.assertEventExists(initResult.events, 'STORM_CARD_REVEALED');

    // Process empty responses (no dialing needed)
    const stepResult = handler.processStep(state, []);

    // Should eventually complete or request Family Atomics/Weather Control
    if (stepResult.events.length === 0) {
      throw new Error('Expected events, but got none');
    }
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all integration tests
 */
export function runIntegrationTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('INTEGRATION TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'Full Phase Flow - Dialing',
    passed: testFullPhaseWithDialing(),
  });

  results.push({
    name: 'Full Phase Flow - Fremen Storm Deck',
    passed: testFremenStormDeckFlow(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
}

