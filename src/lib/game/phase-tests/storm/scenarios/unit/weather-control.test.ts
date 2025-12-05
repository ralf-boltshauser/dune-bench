/**
 * Unit Tests for Weather Control Module
 */

import { Faction } from '../../../../types';
import {
  checkWeatherControl,
  processWeatherControl,
} from '../../../../phases/handlers/storm/weather-control';
import { resetContext } from '../../../../phases/handlers/storm/initialization';
import { StormTestStateBuilder } from '../../helpers/test-state-builder';
import { AgentResponseBuilder } from '../../helpers/agent-response-builder';
import { WeatherControlTestHelpers } from '../../helpers/module-helpers/weather-control-helpers';
import { StormAssertions } from '../../helpers/assertions';
import { StateAssertions } from '../../helpers/state-assertions';

/**
 * Test: processWeatherControl
 */
export function testProcessWeatherControl(): boolean {
  console.log('\n📋 Test: processWeatherControl');

  try {
    const state = WeatherControlTestHelpers.createWithCard(Faction.ATREIDES);

    const context = resetContext();
    context.stormMovement = 5; // Calculated movement

    const responses = new AgentResponseBuilder()
      .queueWeatherControlWithMovement(Faction.ATREIDES, 7)
      .getResponsesArray();

    const result = processWeatherControl(
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
    if (!context.weatherControlUsed) {
      throw new Error('Expected weatherControlUsed to be true');
    }
    if (context.weatherControlBy !== Faction.ATREIDES) {
      throw new Error(`Expected weatherControlBy to be ${Faction.ATREIDES}, but got ${context.weatherControlBy}`);
    }
    if (context.stormMovement !== 7) {
      throw new Error(`Expected movement 7, but got ${context.stormMovement}`);
    }
    
    // Note: result.events comes from applyStormMovement, not processWeatherControl
    // For unit testing, we verify the context which is the source of truth
    StateAssertions.assertCardInHand(result.state, Faction.ATREIDES, 'weather_control', false);
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test: Weather Control with 0 movement
 */
export function testWeatherControlZeroMovement(): boolean {
  console.log('\n📋 Test: processWeatherControl - Zero Movement');

  try {
    const state = WeatherControlTestHelpers.createWithCard(Faction.ATREIDES);

    const context = resetContext();
    context.stormMovement = 5;

    const responses = new AgentResponseBuilder()
      .queueWeatherControlWithMovement(Faction.ATREIDES, 0)
      .getResponsesArray();

    const result = processWeatherControl(
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
    if (context.stormMovement !== 0) {
      throw new Error(`Expected movement 0, but got ${context.stormMovement}`);
    }
    if (context.weatherControlBy !== Faction.ATREIDES) {
      throw new Error(`Expected weatherControlBy to be ${Faction.ATREIDES}, but got ${context.weatherControlBy}`);
    }
    
    // Note: result.events comes from applyStormMovement, not processWeatherControl
    // For unit testing, we verify the context which is the source of truth
    console.log('✅ Test passed');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all Weather Control unit tests
 */
export function runWeatherControlUnitTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('WEATHER CONTROL MODULE UNIT TESTS');
  console.log('='.repeat(80));

  const results: Array<{ name: string; passed: boolean }> = [];

  results.push({
    name: 'processWeatherControl',
    passed: testProcessWeatherControl(),
  });

  results.push({
    name: 'processWeatherControl - Zero Movement',
    passed: testWeatherControlZeroMovement(),
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
}

