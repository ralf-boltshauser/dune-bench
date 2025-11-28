/**
 * Phase system index.
 * Exports all phase-related types, handlers, and the PhaseManager.
 */

// Core types - explicitly export to avoid conflicts with main types
export {
  type AgentRequest,
  type AgentRequestType,
  type AgentResponse,
  type PhaseStepResult,
  type PhaseEvent,
  type PhaseEventType,
  type PhaseHandler,
  type BiddingPhaseContext,
  type BattlePhaseContext,
  type CurrentBattle,
  type NexusContext,
  // Renamed to avoid conflict with main types
  type StormPhaseContext as PhaseStormContext,
  type PendingBattle as PhasePendingBattle,
} from './types';

// Phase manager
export { PhaseManager, MockAgentProvider, type AgentProvider, type PhaseEventListener, type GameResult } from './phase-manager';

// All handlers
export * from './handlers';

// Helpers and base classes
export {
  createCompleteResult,
  createPendingResult,
  createIncompleteResult,
  createAgentRequest,
  createAgentRequests,
  createPhaseEvent,
  createInfoEvent,
  allFactionsProcessed,
  getRemainingFactions,
} from './helpers';
export { BasePhaseHandler } from './base-handler';
