/**
 * Base Scenario Utilities
 * 
 * Common utilities for mentat pause phase test scenarios.
 * Note: Mentat Pause doesn't require agent responses (it's automatic).
 */

import { MentatPausePhaseHandler } from '../../../phases/handlers/mentat-pause';
import { TestLogger } from '../../helpers/test-logger';
import type { ScenarioResult } from '../../helpers/types';
import type { GameState } from '../../../types';

/**
 * Run a mentat pause phase scenario
 * Note: Mentat Pause is automatic (no agent responses needed)
 */
export async function runMentatPauseScenario(
  state: GameState,
  scenarioName: string,
  maxSteps: number = 10
): Promise<ScenarioResult> {
  const handler = new MentatPausePhaseHandler();
  const logger = new TestLogger(scenarioName, 'mentat-pause');
  
  // Log initial state
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, `Starting scenario: ${scenarioName}`);
  
  // Initialize phase
  const initResult = handler.initialize(state);
  
  // Log initialization events
  initResult.events.forEach(event => {
    logger.logEvent(0, {
      type: event.type,
      message: event.message,
      data: event.data,
    });
  });
  
  const events: Array<{ type: string; message: string }> = [];
  let currentState = initResult.state;
  let stepCount = 0;
  let phaseComplete = initResult.phaseComplete;

  // Process steps (though mentat pause should complete in initialize)
  while (!phaseComplete && stepCount < maxSteps) {
    stepCount++;
    
    const stepResult = handler.processStep(currentState, []);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;

    // Log events
    stepResult.events.forEach(event => {
      events.push({
        type: event.type,
        message: event.message,
      });
      logger.logEvent(stepCount, {
        type: event.type,
        message: event.message,
        data: event.data,
      });
    });

    // Log state snapshot
    if (stepCount % 5 === 0 || phaseComplete) {
      logger.logState(stepCount, `After step ${stepCount}`, currentState);
    }

    if (phaseComplete) {
      logger.logState(stepCount, 'Final State', currentState);
      logger.logInfo(stepCount, 'Phase completed successfully');
      
      // Log victory result if any
      if (currentState.winner) {
        logger.logInfo(stepCount, 'Victory Result', {
          winners: currentState.winner.winners,
          condition: currentState.winner.condition,
          turn: currentState.winner.turn,
          details: currentState.winner.details,
        });
      } else {
        logger.logInfo(stepCount, 'No winner - game continues');
      }
      
      const result = {
        state: currentState,
        events,
        stepCount,
        completed: true,
      };
      
      logger.writeLog(result);
      return result;
    }
  }

  const result = {
    state: currentState,
    events,
    stepCount,
    completed: stepCount < maxSteps,
    error: stepCount >= maxSteps ? new Error('Max steps reached') : undefined,
  };

  if (stepCount >= maxSteps) {
    logger.logError(stepCount, 'Max steps reached', { maxSteps });
  }

  logger.writeLog(result);
  return result;
}

