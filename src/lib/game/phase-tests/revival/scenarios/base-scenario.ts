/**
 * Base Scenario Utilities for Revival Phase
 * 
 * Common utilities for revival phase test scenarios.
 */

import { RevivalPhaseHandler } from '../../../phases/handlers/revival';
import '../../../agent/env-loader';
import { createAgentProvider } from '../../../agent/azure-provider';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { TestLogger } from '../../helpers/test-logger';
import type { GameState } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export interface ScenarioResult {
  state: GameState;
  events: Array<{ type: string; message: string }>;
  stepCount: number;
  completed: boolean;
  error?: Error;
}

/**
 * Run a revival phase scenario with mocked agent responses
 */
export async function runPhaseScenario(
  state: GameState,
  responseBuilder: AgentResponseBuilder,
  scenarioName: string,
  phaseName: string = 'revival',
  maxSteps: number = 100
): Promise<ScenarioResult> {
  const handler = new RevivalPhaseHandler();
  const provider = createAgentProvider(state, { verbose: false });
  const logger = new TestLogger(scenarioName, phaseName);
  
  // Log initial state
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, `Starting scenario: ${scenarioName}`);
  
  // Note: Using Azure OpenAI agent - responses are generated dynamically
  const responses = responseBuilder.getResponses();
  logger.logInfo(0, `Note: ${Array.from(responses.values()).flat().length} expected responses (using Azure OpenAI)`);

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
  let responsesQueue: AgentResponse[] = [];
  let stepCount = 0;
  let phaseComplete = initResult.phaseComplete;

  // Process steps
  while (!phaseComplete && stepCount < maxSteps) {
    stepCount++;
    
    // Log pending requests
    if (stepCount === 1 && initResult.pendingRequests.length > 0) {
      initResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount, undefined, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
    }
    
    const stepResult = handler.processStep(currentState, responsesQueue);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;

    // Log responses
    responsesQueue.forEach(response => {
      logger.logResponse(stepCount, {
        factionId: response.factionId,
        actionType: response.actionType,
        data: response.data,
        passed: response.passed ?? false,
      });
    });

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

    // Log pending requests for next step
    if (stepResult.pendingRequests.length > 0) {
      stepResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount + 1, undefined, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
    }

    // Log state snapshot periodically
    if (stepCount % 5 === 0 || phaseComplete) {
      logger.logState(stepCount, `After step ${stepCount}`, currentState);
    }

    if (phaseComplete) {
      logger.logState(stepCount, 'Final State', currentState);
      logger.logInfo(stepCount, 'Phase completed successfully');
      
      const result = {
        state: currentState,
        events,
        stepCount,
        completed: true,
      };
      
      logger.writeLog(result);
      return result;
    }

    if (stepResult.pendingRequests.length > 0) {
      // Get agent responses
      responsesQueue = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
    } else {
      responsesQueue = [];
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

/**
 * Log scenario results
 */
export function logScenarioResults(
  scenarioName: string,
  result: ScenarioResult
): void {
  console.log('\n' + '='.repeat(80));
  console.log(`SCENARIO: ${scenarioName}`);
  console.log('='.repeat(80));
  
  console.log(`\nSteps: ${result.stepCount}`);
  console.log(`Completed: ${result.completed ? '✓' : '✗'}`);
  
  if (result.error) {
    console.log(`Error: ${result.error.message}`);
  }

  console.log(`\nEvents (${result.events.length}):`);
  result.events.forEach((event, i) => {
    if (
      event.type.includes('REVIVED') ||
      event.type.includes('BOOST') ||
      event.type.includes('KWISATZ')
    ) {
      console.log(`  ${i + 1}. [${event.type}] ${event.message}`);
    }
  });
  
  console.log('='.repeat(80));
}

