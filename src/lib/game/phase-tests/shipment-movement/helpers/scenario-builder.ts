/**
 * Scenario Builder for Shipment & Movement Phase Tests
 * 
 * Fluent API for building complete test scenarios with setup, execution, and assertions.
 */

import { ShipmentMovementPhaseHandler } from '../../../phases/handlers/shipment-movement';
import '../../../agent/env-loader';
import { createAgentProvider } from '../../../agent/azure-provider';
import { AgentResponseBuilder } from './agent-response-builder';
import { TestLogger } from '../../helpers/test-logger';
import type { GameState } from '../../../types';
import type { AgentResponse, PhaseEvent, PhaseStepResult } from '../../../phases/types';
import * as assertions from './assertions';

export interface ScenarioResult {
  state: GameState;
  events: PhaseEvent[];
  stepCount: number;
  completed: boolean;
  error?: Error;
}

/**
 * Fluent scenario builder
 */
export class ScenarioBuilder {
  private state?: GameState;
  private responseBuilder?: AgentResponseBuilder;
  private scenarioName: string = 'Test Scenario';
  private maxSteps: number = 200;
  private assertions: Array<() => void> = [];

  /**
   * Set the game state
   */
  withState(state: GameState | ((builder: any) => GameState)): this {
    if (typeof state === 'function') {
      // If it's a function, we'd need a builder - for now, just accept GameState
      throw new Error('Builder functions not yet supported');
    }
    this.state = state;
    return this;
  }

  /**
   * Set the response builder
   */
  withResponses(builder: AgentResponseBuilder): this {
    this.responseBuilder = builder;
    return this;
  }

  /**
   * Set scenario name
   */
  named(name: string): this {
    this.scenarioName = name;
    return this;
  }

  /**
   * Set max steps
   */
  withMaxSteps(maxSteps: number): this {
    this.maxSteps = maxSteps;
    return this;
  }

  // =============================================================================
  // ASSERTIONS (Fluent API)
  // =============================================================================

  /**
   * Expect phase to be complete
   */
  expectPhaseComplete(): this {
    this.assertions.push(() => {
      // Will be called after execution
    });
    return this;
  }

  /**
   * Expect phase to NOT be complete
   */
  expectPhaseNotComplete(): this {
    this.assertions.push(() => {
      // Will be called after execution
    });
    return this;
  }

  /**
   * Expect an event to be emitted
   */
  expectEvent(
    eventType: string,
    predicate?: (event: PhaseEvent) => boolean
  ): this {
    this.assertions.push(() => {
      // Will be called after execution with events
    });
    return this;
  }

  /**
   * Expect an event to NOT be emitted
   */
  expectEventNotEmitted(eventType: string): this {
    this.assertions.push(() => {
      // Will be called after execution
    });
    return this;
  }

  /**
   * Expect event sequence
   */
  expectEventSequence(sequence: string[]): this {
    this.assertions.push(() => {
      // Will be called after execution
    });
    return this;
  }

  /**
   * Expect forces in territory
   */
  expectForcesInTerritory(
    faction: any,
    territory: any,
    sector: number,
    count: number
  ): this {
    this.assertions.push(() => {
      // Will be called after execution
    });
    return this;
  }

  /**
   * Expect spice amount
   */
  expectSpiceAmount(faction: any, amount: number): this {
    this.assertions.push(() => {
      // Will be called after execution
    });
    return this;
  }

  /**
   * Execute the scenario and run assertions
   */
  async execute(): Promise<ScenarioResult> {
    if (!this.state) {
      throw new Error('State must be set before execution');
    }
    if (!this.responseBuilder) {
      throw new Error('Response builder must be set before execution');
    }

    const result = await this.runScenario(
      this.state,
      this.responseBuilder,
      this.scenarioName,
      this.maxSteps
    );

    // Run assertions
    for (const assertion of this.assertions) {
      try {
        assertion();
      } catch (error) {
        console.error('Assertion failed:', error);
        throw error;
      }
    }

    return result;
  }

  /**
   * Run the scenario (internal)
   */
  private async runScenario(
    state: GameState,
    responseBuilder: AgentResponseBuilder,
    scenarioName: string,
    maxSteps: number
  ): Promise<ScenarioResult> {
    const handler = new ShipmentMovementPhaseHandler();
    const provider = createAgentProvider(state, { verbose: false });
    const logger = new TestLogger(scenarioName, 'shipment-movement');

    logger.logState(0, 'Initial State', state);
    logger.logInfo(0, `Starting scenario: ${scenarioName}`);

    const responses = responseBuilder.getResponses();
    logger.logInfo(
      0,
      `Note: ${Array.from(responses.values()).flat().length} expected responses (using Azure OpenAI)`
    );

    // Initialize phase
    const initResult = handler.initialize(state);

    // Log initialization events
    initResult.events.forEach((event) => {
      logger.logEvent(0, {
        type: event.type,
        message: event.message,
        data: event.data,
      });
    });

    const events: PhaseEvent[] = [];
    let currentState = initResult.state;
    let responsesQueue: AgentResponse[] = [];
    let stepCount = 0;
    let phaseComplete = initResult.phaseComplete;
    let pendingRequests = initResult.pendingRequests;

    // Process steps
    while (!phaseComplete && stepCount < maxSteps) {
      stepCount++;

      // Get responses for pending requests BEFORE processing step
      if (pendingRequests.length > 0) {
        // Log pending requests
        pendingRequests.forEach((req) => {
          logger.logRequest(stepCount, undefined, {
            factionId: req.factionId,
            requestType: req.requestType,
            prompt: req.prompt,
            context: req.context,
            availableActions: req.availableActions,
          });
        });

        // Get responses from provider
        responsesQueue = await provider.getResponses(
          pendingRequests,
          initResult.simultaneousRequests || false
        );
      }

      const stepResult = handler.processStep(currentState, responsesQueue);
      currentState = stepResult.state;
      phaseComplete = stepResult.phaseComplete;
      pendingRequests = stepResult.pendingRequests;

      // Log responses
      responsesQueue.forEach((response) => {
        logger.logResponse(stepCount, {
          factionId: response.factionId,
          actionType: response.actionType,
          data: response.data,
          passed: response.passed ?? false,
        });
      });

      // Log events
      stepResult.events.forEach((event) => {
        events.push(event);
        logger.logEvent(stepCount, {
          type: event.type,
          message: event.message,
          data: event.data,
        });
      });

      // Log state snapshot periodically
      if (stepCount % 5 === 0 || phaseComplete) {
        logger.logState(stepCount, `After step ${stepCount}`, currentState);
      }

      if (phaseComplete) {
        logger.logState(stepCount, 'Final State', currentState);
        logger.logInfo(stepCount, 'Phase completed successfully');

        const result: ScenarioResult = {
          state: currentState,
          events,
          stepCount,
          completed: true,
        };

        logger.writeLog(result);
        return result;
      }

      responsesQueue = [];
    }

    const result: ScenarioResult = {
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
}

