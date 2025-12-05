import { Phase } from "../../../../types";
import { type GameState } from "../../../../types";
import {
  type AgentRequest,
  type PhaseEvent,
  type PhaseStepResult,
} from "../../../types";
import {
  createCompleteResult,
  createIncompleteResult,
  createPendingResult,
} from "../../../helpers";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { withContext } from "../context/helpers";

/**
 * Result Factory for Spice Blow Phase
 * 
 * Provides type-safe result creation with context.
 * Uses phase helpers for consistency.
 */

export const SpiceBlowResults = {
  /**
   * Create a result indicating the phase is complete
   */
  complete: (
    state: GameState,
    context: SpiceBlowContext,
    events: PhaseEvent[] = []
  ): SpiceBlowStepResult => {
    return withContext(
      createCompleteResult(state, Phase.CHOAM_CHARITY, events),
      context
    );
  },

  /**
   * Create a result indicating agent requests are needed
   */
  pending: (
    state: GameState,
    context: SpiceBlowContext,
    requests: AgentRequest[],
    events: PhaseEvent[] = [],
    simultaneous: boolean = false
  ): SpiceBlowStepResult => {
    return withContext(
      createPendingResult(state, requests, simultaneous, events),
      context
    );
  },

  /**
   * Create a result indicating the phase is not complete but no requests needed
   */
  incomplete: (
    state: GameState,
    context: SpiceBlowContext,
    events: PhaseEvent[] = []
  ): SpiceBlowStepResult => {
    return withContext(createIncompleteResult(state, [], false, events), context);
  },

  /**
   * Wrap a PhaseStepResult with context
   */
  withContext: (
    result: PhaseStepResult,
    context: SpiceBlowContext
  ): SpiceBlowStepResult => {
    return withContext(result, context);
  },
};

