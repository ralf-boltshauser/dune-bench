/**
 * Base Phase Handler
 *
 * Abstract base class for phase handlers with common utilities and patterns.
 * Reduces boilerplate and ensures consistency across phase implementations.
 */

import { Phase, type GameState } from '../types';
import type {
  PhaseHandler,
  PhaseStepResult,
  AgentRequest,
  AgentResponse,
  PhaseEvent,
  PhaseEventType,
} from './types';
import {
  createCompleteResult,
  createPendingResult,
  createIncompleteResult,
  createPhaseEvent,
} from './helpers';

// =============================================================================
// BASE PHASE HANDLER
// =============================================================================

/**
 * Abstract base class for phase handlers.
 * Provides common utilities and default implementations.
 */
export abstract class BasePhaseHandler implements PhaseHandler {
  abstract readonly phase: Phase;

  /**
   * Initialize the phase. Override in subclasses.
   */
  abstract initialize(state: GameState): PhaseStepResult;

  /**
   * Process a step. Override in subclasses.
   */
  abstract processStep(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult;

  /**
   * Cleanup when leaving the phase.
   * Default implementation does nothing - override if needed.
   */
  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PROTECTED HELPER METHODS
  // ===========================================================================

  /**
   * Create a complete result (phase finished).
   */
  protected complete(
    state: GameState,
    nextPhase: Phase,
    events: PhaseEvent[] = []
  ): PhaseStepResult {
    return createCompleteResult(state, nextPhase, events);
  }

  /**
   * Create a pending result (waiting for agent input).
   */
  protected pending(
    state: GameState,
    requests: AgentRequest[],
    simultaneous: boolean = false,
    events: PhaseEvent[] = []
  ): PhaseStepResult {
    return createPendingResult(state, requests, simultaneous, events);
  }

  /**
   * Create an incomplete result (phase continues but no requests yet).
   */
  protected incomplete(
    state: GameState,
    requests: AgentRequest[] = [],
    simultaneous: boolean = false,
    events: PhaseEvent[] = []
  ): PhaseStepResult {
    return createIncompleteResult(state, requests, simultaneous, events);
  }

  /**
   * Create a phase event.
   */
  protected event(
    type: string,
    message: string,
    data: Record<string, unknown> = {}
  ): PhaseEvent {
    return createPhaseEvent(type as PhaseEventType, message, data);
  }

  /**
   * Get the next phase in the standard order.
   */
  protected getNextPhase(currentPhase: Phase): Phase {
    const order: Phase[] = [
      Phase.STORM,
      Phase.SPICE_BLOW,
      Phase.CHOAM_CHARITY,
      Phase.BIDDING,
      Phase.REVIVAL,
      Phase.SHIPMENT_MOVEMENT,
      Phase.BATTLE,
      Phase.SPICE_COLLECTION,
      Phase.MENTAT_PAUSE,
    ];

    const index = order.indexOf(currentPhase);
    if (index === -1 || index === order.length - 1) {
      return Phase.STORM; // Wrap around
    }
    return order[index + 1];
  }
}

