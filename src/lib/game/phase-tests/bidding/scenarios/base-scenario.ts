/**
 * Base Scenario Utilities for Bidding Phase
 * 
 * Common utilities for bidding phase test scenarios.
 */

import { BiddingPhaseHandler } from '../../../phases/handlers/bidding';
import { createClaudeAgentProvider } from '../../../agent/claude-provider';
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
 * Run a bidding phase scenario with REAL LLM agents
 * 
 * This uses ClaudeAgentProvider to make real API calls to LLM agents.
 * Agents will analyze the game state and make decisions using their tools.
 */
export async function runBiddingScenario(
  state: GameState,
  scenarioName: string,
  maxSteps: number = 100,
  agentConfig?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    verbose?: boolean;
  }
): Promise<ScenarioResult> {
  const handler = new BiddingPhaseHandler();
  
  // Use REAL Claude agents (not mocked)
  const provider = createClaudeAgentProvider(state, {
    model: agentConfig?.model ?? process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? 'claude-haiku-4-5',
    temperature: agentConfig?.temperature ?? 0.7,
    maxTokens: agentConfig?.maxTokens ?? 1024,
    verbose: agentConfig?.verbose ?? false,
  });
  
  const logger = new TestLogger(scenarioName, 'bidding');
  
  // Log initial state
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, `Starting scenario: ${scenarioName}`);
  logger.logInfo(0, `Using REAL LLM agents (Claude) - agents will make actual decisions`);

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
    
    // Update agent provider with new state so agents have latest information
    provider.updateState(currentState);

    // Log responses
    responsesQueue.forEach(response => {
      logger.logResponse(stepCount, {
        factionId: response.factionId,
        actionType: response.actionType,
        data: response.data,
        passed: response.passed,
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
      // Get REAL agent responses from LLM
      // Agents will analyze the game state and make decisions
      logger.logInfo(stepCount, `Requesting responses from ${stepResult.pendingRequests.length} agent(s)...`);
      responsesQueue = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
      logger.logInfo(stepCount, `Received ${responsesQueue.length} agent response(s)`);
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
      event.type.includes('BID') ||
      event.type.includes('AUCTION') ||
      event.type.includes('CARD') ||
      event.type.includes('HAND') ||
      event.type.includes('KARAMA') ||
      event.type.includes('PAYMENT')
    ) {
      console.log(`  ${i + 1}. [${event.type}] ${event.message}`);
    }
  });
  
  console.log('='.repeat(80));
}

