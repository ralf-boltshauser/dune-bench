/**
 * Phase Handler Helper Functions
 *
 * Common utilities for phase handlers to reduce duplication and improve maintainability.
 */

import { Phase, Faction, type GameState } from '../types';
import type {
  AgentRequest,
  AgentRequestType,
  PhaseEvent,
  PhaseEventType,
  PhaseStepResult,
} from './types';

// =============================================================================
// PHASE STEP RESULT HELPERS
// =============================================================================

/**
 * Create a phase step result indicating the phase is complete.
 */
export function createCompleteResult(
  state: GameState,
  nextPhase: Phase,
  events: PhaseEvent[] = []
): PhaseStepResult {
  return {
    state,
    phaseComplete: true,
    nextPhase,
    pendingRequests: [],
    actions: [],
    events,
  };
}

/**
 * Create a phase step result indicating more agent input is needed.
 */
export function createPendingResult(
  state: GameState,
  pendingRequests: AgentRequest[],
  simultaneous: boolean = false,
  events: PhaseEvent[] = []
): PhaseStepResult {
  return {
    state,
    phaseComplete: false,
    pendingRequests,
    simultaneousRequests: simultaneous,
    actions: [],
    events,
  };
}

/**
 * Create a phase step result with updated state but phase not complete.
 */
export function createIncompleteResult(
  state: GameState,
  pendingRequests: AgentRequest[] = [],
  simultaneous: boolean = false,
  events: PhaseEvent[] = []
): PhaseStepResult {
  return {
    state,
    phaseComplete: false,
    pendingRequests,
    simultaneousRequests: simultaneous,
    actions: [],
    events,
  };
}

// =============================================================================
// AGENT REQUEST HELPERS
// =============================================================================

/**
 * Create an agent request with standard structure.
 */
export function createAgentRequest(
  factionId: Faction,
  requestType: AgentRequestType,
  prompt: string,
  context: Record<string, unknown> = {},
  availableActions: string[] = []
): AgentRequest {
  return {
    factionId,
    requestType,
    prompt,
    context,
    availableActions,
  };
}

/**
 * Create multiple agent requests for a list of factions.
 */
export function createAgentRequests(
  factions: Faction[],
  requestType: AgentRequestType,
  promptBuilder: (faction: Faction) => string,
  contextBuilder?: (faction: Faction) => Record<string, unknown>,
  availableActions: string[] = []
): AgentRequest[] {
  return factions.map((faction) =>
    createAgentRequest(
      faction,
      requestType,
      promptBuilder(faction),
      contextBuilder ? contextBuilder(faction) : {},
      availableActions
    )
  );
}

// =============================================================================
// EVENT HELPERS
// =============================================================================

/**
 * Create a phase event with standard structure.
 */
export function createPhaseEvent(
  type: PhaseEventType,
  message: string,
  data: Record<string, unknown> = {}
): PhaseEvent {
  return {
    type,
    message,
    data,
  };
}

/**
 * Create a simple informational event.
 */
export function createInfoEvent(
  message: string,
  data: Record<string, unknown> = {}
): PhaseEvent {
  return createPhaseEvent('PHASE_STARTED' as PhaseEventType, message, data);
}

// =============================================================================
// COMMON PATTERNS
// =============================================================================

/**
 * Check if all factions in a list have been processed.
 */
export function allFactionsProcessed(
  factions: Faction[],
  processed: Set<Faction>
): boolean {
  return factions.every((f) => processed.has(f));
}

/**
 * Get remaining factions that haven't been processed.
 */
export function getRemainingFactions(
  factions: Faction[],
  processed: Set<Faction>
): Faction[] {
  return factions.filter((f) => !processed.has(f));
}

