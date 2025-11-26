/**
 * Phase Manager - Orchestrates the game flow through all phases.
 * This is the main controller that runs the game turn by turn.
 */

import {
  Phase,
  PHASE_ORDER,
  type GameState,
  type WinResult,
} from '../types';
import { advancePhase, advanceTurn, logAction } from '../state';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from './types';

// =============================================================================
// AGENT PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for providing agent responses.
 * Implemented by the AI orchestrator or test harness.
 */
export interface AgentProvider {
  /**
   * Get responses for one or more agent requests.
   * @param requests - The requests to process
   * @param simultaneous - Whether all requests should be processed at once
   * @returns Responses from agents
   */
  getResponses(
    requests: AgentRequest[],
    simultaneous: boolean
  ): Promise<AgentResponse[]>;

  /**
   * Update the agent provider with new game state.
   * This is called before getResponses so agents have the latest state.
   */
  updateState?(state: GameState): void;
}

/**
 * Event listener for phase events.
 */
export type PhaseEventListener = (event: PhaseEvent) => void;

/**
 * Options for running the game with phase filtering (useful for debugging).
 */
export interface GameRunOptions {
  /** Run only specific phases (for debugging) */
  onlyPhases?: Phase[];
  /** Stop after this phase completes (for debugging) */
  stopAfter?: Phase;
  /** Skip setup phase, use default values */
  skipSetup?: boolean;
}

// =============================================================================
// PHASE MANAGER
// =============================================================================

export class PhaseManager {
  private handlers: Map<Phase, PhaseHandler> = new Map();
  private agentProvider: AgentProvider;
  private eventListeners: PhaseEventListener[] = [];
  private isRunning: boolean = false;

  constructor(agentProvider: AgentProvider) {
    this.agentProvider = agentProvider;
  }

  /**
   * Register a phase handler.
   */
  registerHandler(handler: PhaseHandler): void {
    this.handlers.set(handler.phase, handler);
  }

  /**
   * Register all phase handlers at once.
   */
  registerHandlers(handlers: PhaseHandler[]): void {
    for (const handler of handlers) {
      this.registerHandler(handler);
    }
  }

  /**
   * Add an event listener.
   */
  addEventListener(listener: PhaseEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: PhaseEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners.
   */
  private emitEvent(event: PhaseEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Emit multiple events.
   */
  private emitEvents(events: PhaseEvent[]): void {
    for (const event of events) {
      this.emitEvent(event);
    }
  }

  /**
   * Run the game until completion or max turns.
   * @param initialState - The initial game state
   * @param options - Optional phase filtering for debugging
   */
  async runGame(initialState: GameState, options: GameRunOptions = {}): Promise<GameResult> {
    if (this.isRunning) {
      throw new Error('Game is already running');
    }

    this.isRunning = true;
    let state = initialState;
    let shouldStop = false;

    try {
      // Handle setup phase
      const shouldRunSetup = !options.skipSetup &&
        (state.phase === Phase.SETUP || !state.setupComplete) &&
        (!options.onlyPhases || options.onlyPhases.includes(Phase.SETUP));

      if (shouldRunSetup) {
        state = await this.runPhase(state, Phase.SETUP);
        state = { ...state, setupComplete: true, phase: Phase.STORM };

        // Stop if stopAfter is setup OR if onlyPhases only contains setup
        if (options.stopAfter === Phase.SETUP ||
            (options.onlyPhases && options.onlyPhases.length === 1 && options.onlyPhases[0] === Phase.SETUP)) {
          shouldStop = true;
        }
      } else if (options.skipSetup) {
        // Mark setup as complete even if skipped
        state = { ...state, setupComplete: true, phase: Phase.STORM };
        this.emitEvent({
          type: 'PHASE_SKIPPED',
          data: { phase: Phase.SETUP },
          message: 'Setup phase skipped (using defaults)',
        });
      }

      if (!shouldStop) {
        this.emitEvent({
          type: 'TURN_STARTED',
          data: { turn: state.turn },
          message: `Turn ${state.turn} started`,
        });

        while (!state.winner && state.turn <= state.config.maxTurns && !shouldStop) {
          const turnResult = await this.runTurn(state, options);
          state = turnResult.state;
          shouldStop = turnResult.shouldStop;

          if (!state.winner && !shouldStop) {
            state = advanceTurn(state);
            this.emitEvent({
              type: 'TURN_STARTED',
              data: { turn: state.turn },
              message: `Turn ${state.turn} started`,
            });
          }
        }
      }

      this.emitEvent({
        type: 'GAME_ENDED',
        data: { winner: state.winner, turn: state.turn, stoppedEarly: shouldStop },
        message: shouldStop
          ? `Game stopped after ${options.stopAfter} phase`
          : state.winner
            ? `Game ended: ${state.winner.winners.join(' & ')} win!`
            : `Game ended after ${state.turn} turns`,
      });

      return {
        finalState: state,
        winner: state.winner,
        totalTurns: state.turn,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a single turn (all 9 phases).
   * @param state - Current game state
   * @param options - Optional phase filtering for debugging
   */
  async runTurn(state: GameState, options: GameRunOptions = {}): Promise<{ state: GameState; shouldStop: boolean }> {
    let shouldStop = false;

    for (const phase of PHASE_ORDER) {
      // Skip phases not in onlyPhases filter (if specified)
      if (options.onlyPhases && !options.onlyPhases.includes(phase)) {
        continue;
      }

      state = await this.runPhase(state, phase);

      // Check for stopAfter
      if (options.stopAfter === phase) {
        shouldStop = true;
        break;
      }

      // Check for victory after Mentat Pause
      if (state.winner) {
        break;
      }
    }

    return { state, shouldStop };
  }

  /**
   * Run a single phase.
   */
  async runPhase(state: GameState, phase: Phase): Promise<GameState> {
    const handler = this.handlers.get(phase);
    if (!handler) {
      console.warn(`No handler registered for phase ${phase}, skipping`);
      return advancePhase(state, this.getNextPhase(phase));
    }

    // Update state to current phase
    state = { ...state, phase };

    this.emitEvent({
      type: 'PHASE_STARTED',
      data: { phase },
      message: `${phase} phase started`,
    });

    // Initialize the phase
    let result = handler.initialize(state);
    state = result.state;
    this.emitEvents(result.events);

    // Process phase steps until complete
    while (!result.phaseComplete) {
      // Get agent responses if needed
      let responses: AgentResponse[] = [];
      if (result.pendingRequests.length > 0) {
        // Update agent provider with current state so tools are phase-appropriate
        if (this.agentProvider.updateState) {
          this.agentProvider.updateState(state);
        }
        responses = await this.agentProvider.getResponses(
          result.pendingRequests,
          result.simultaneousRequests ?? false
        );
      }

      // Process next step
      result = handler.processStep(state, responses);
      state = result.state;
      this.emitEvents(result.events);
    }

    // Cleanup
    state = handler.cleanup(state);

    this.emitEvent({
      type: 'PHASE_ENDED',
      data: { phase },
      message: `${phase} phase ended`,
    });

    return state;
  }

  /**
   * Run a single phase step (for testing/debugging).
   */
  async runPhaseStep(
    state: GameState,
    responses: AgentResponse[] = []
  ): Promise<PhaseStepResult> {
    const handler = this.handlers.get(state.phase);
    if (!handler) {
      throw new Error(`No handler for phase ${state.phase}`);
    }

    return handler.processStep(state, responses);
  }

  /**
   * Get the next phase in order.
   */
  private getNextPhase(currentPhase: Phase): Phase {
    const index = PHASE_ORDER.indexOf(currentPhase);
    if (index === -1 || index === PHASE_ORDER.length - 1) {
      return Phase.STORM; // Wrap around to start
    }
    return PHASE_ORDER[index + 1];
  }

  /**
   * Stop a running game.
   */
  stop(): void {
    this.isRunning = false;
  }
}

// =============================================================================
// GAME RESULT
// =============================================================================

export interface GameResult {
  finalState: GameState;
  winner: WinResult | null;
  totalTurns: number;
}

// =============================================================================
// MOCK AGENT PROVIDER (for testing)
// =============================================================================

/**
 * A mock agent provider that uses predefined responses or random valid actions.
 * Useful for testing phase logic without real AI.
 */
export class MockAgentProvider implements AgentProvider {
  private responseQueue: Map<string, AgentResponse[]> = new Map();
  private defaultBehavior: 'pass' | 'random' | 'first_valid' = 'pass';

  constructor(defaultBehavior: 'pass' | 'random' | 'first_valid' = 'pass') {
    this.defaultBehavior = defaultBehavior;
  }

  /**
   * Queue responses for a specific request type.
   */
  queueResponse(requestType: string, response: AgentResponse): void {
    const queue = this.responseQueue.get(requestType) ?? [];
    queue.push(response);
    this.responseQueue.set(requestType, queue);
  }

  async getResponses(
    requests: AgentRequest[],
    _simultaneous: boolean
  ): Promise<AgentResponse[]> {
    return requests.map((request) => {
      // Check for queued response
      const queue = this.responseQueue.get(request.requestType);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }

      // Default behavior
      return this.generateDefaultResponse(request);
    });
  }

  private generateDefaultResponse(request: AgentRequest): AgentResponse {
    switch (this.defaultBehavior) {
      case 'pass':
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };

      case 'random':
      case 'first_valid':
        // For now, just pass - real implementation would pick valid action
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };

      default:
        return {
          factionId: request.factionId,
          actionType: 'PASS',
          data: {},
          passed: true,
        };
    }
  }
}
