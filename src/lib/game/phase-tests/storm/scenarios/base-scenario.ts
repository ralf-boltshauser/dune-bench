/**
 * Base Scenario Utilities for Storm Phase Tests
 * 
 * Common utilities for storm phase test scenarios.
 */

import { StormPhaseHandler } from '../../../phases/handlers/storm';
import { MockAgentProvider } from '../../../phases/phase-manager';
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
 * Run a storm phase scenario with mocked agent responses
 */
export async function runStormScenario(
  state: GameState,
  responseBuilder: AgentResponseBuilder,
  scenarioName: string,
  maxSteps: number = 100
): Promise<ScenarioResult> {
  const handler = new StormPhaseHandler();
  const provider = new MockAgentProvider('pass');
  const logger = new TestLogger(scenarioName, 'storm');
  
  // Log initial state with detailed context
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, `Starting scenario: ${scenarioName}`);
  logger.logInfo(0, `Turn: ${state.turn}, Storm Sector: ${state.stormSector}`);
  logger.logInfo(0, `Factions: ${Array.from(state.factions.keys()).join(', ')}`);
  
  // Log player positions
  const playerPositions = Array.from(state.playerPositions.entries());
  logger.logInfo(0, 'Player Positions:', playerPositions.map(([f, p]) => `${f}: sector ${p}`));
  
  // Log forces on board
  let totalForces = 0;
  for (const [faction, fs] of state.factions.entries()) {
    for (const stack of fs.forces.onBoard) {
      const count = stack.forces.regular + stack.forces.elite;
      totalForces += count;
      logger.logInfo(0, `Forces: ${faction} has ${count} in ${stack.territoryId} sector ${stack.sector}`);
    }
  }
  logger.logInfo(0, `Total forces on board: ${totalForces}`);
  
  // Log spice on board
  logger.logInfo(0, `Spice on board: ${state.spiceOnBoard.length} deposits`);
  state.spiceOnBoard.forEach(spice => {
    logger.logInfo(0, `  - ${spice.amount} spice in ${spice.territoryId} sector ${spice.sector}`);
  });
  
  // Load responses into provider
  const responses = responseBuilder.getResponses();
  const allResponses = Array.from(responses.values()).flat();
  logger.logInfo(0, `Queued ${allResponses.length} agent responses`);
  allResponses.forEach(response => {
    logger.logInfo(0, `  - ${response.factionId}: ${response.actionType} with data:`, response.data);
  });
  for (const [requestType, responseList] of responses.entries()) {
    for (const response of responseList) {
      provider.queueResponse(requestType, response);
    }
  }

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
  let pendingRequests = initResult.pendingRequests;

  // Get initial responses if there are pending requests
  if (pendingRequests.length > 0) {
    // Log pending requests
    pendingRequests.forEach(req => {
      logger.logRequest(1, undefined, {
        factionId: req.factionId,
        requestType: req.requestType,
        prompt: req.prompt,
        context: req.context,
        availableActions: req.availableActions,
      });
    });
    
    // Get agent responses
    responsesQueue = await provider.getResponses(
      pendingRequests,
      initResult.simultaneousRequests || false
    );
    
      // Log responses
      responsesQueue.forEach(response => {
        logger.logResponse(1, {
          factionId: response.factionId,
          actionType: response.actionType,
          data: response.data,
          passed: response.passed ?? false,
        });
      });
  }

  // Process steps
  while (!phaseComplete && stepCount < maxSteps) {
    stepCount++;
    
    const stepResult = handler.processStep(currentState, responsesQueue);
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

    // Get responses for next step if needed
    if (stepResult.pendingRequests.length > 0) {
      // Log pending requests
      stepResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount + 1, undefined, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
      
      // Get agent responses
      responsesQueue = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
      
      // Log responses
      responsesQueue.forEach(response => {
        logger.logResponse(stepCount + 1, {
          factionId: response.factionId,
          actionType: response.actionType,
          data: response.data,
          passed: response.passed ?? false,
        });
      });
    } else {
      responsesQueue = [];
    }

    // Log state snapshot after each step (storm phase is short)
    logger.logState(stepCount, `After step ${stepCount}`, currentState);
    
    // Log detailed storm information
    if (phaseComplete || stepCount === 1) {
      logger.logInfo(stepCount, `Storm Sector: ${currentState.stormSector}`);
      logger.logInfo(stepCount, `Storm Order: ${currentState.stormOrder.join(' → ')}`);
      
      // Log forces remaining on board
      for (const [faction, fs] of currentState.factions.entries()) {
        for (const stack of fs.forces.onBoard) {
          const count = stack.forces.regular + stack.forces.elite;
          if (count > 0) {
            logger.logInfo(stepCount, `  ${faction}: ${count} forces in ${stack.territoryId} sector ${stack.sector}`);
          }
        }
      }
      
      // Log spice remaining
      if (currentState.spiceOnBoard.length > 0) {
        logger.logInfo(stepCount, `Spice remaining: ${currentState.spiceOnBoard.length} deposits`);
      }
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
      event.type.includes('STORM') ||
      event.type.includes('DESTROY') ||
      event.type.includes('DIAL') ||
      event.type.includes('WEATHER') ||
      event.type.includes('ATOMICS')
    ) {
      console.log(`  ${i + 1}. [${event.type}] ${event.message}`);
    }
  });
  
  console.log('='.repeat(80));
}

