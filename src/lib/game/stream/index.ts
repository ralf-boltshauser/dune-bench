/**
 * Game Streaming Module - Public API
 *
 * This module provides real-time event streaming for game state changes.
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     Frontend (SSE Client)                    │
 * │              EventSource → /api/game/[id]/stream            │
 * └──────────────────────────┬──────────────────────────────────┘
 *                            │
 *              ┌─────────────┴─────────────┐
 *              │    SSE Route Handler      │
 *              │  (with reconnection)      │
 *              └─────────────┬─────────────┘
 *                            │
 *              ┌─────────────┴─────────────┐
 *              │      EventStreamer        │
 *              │   - UUID event IDs        │
 *              │   - Buffered replay       │
 *              │   - Auto cleanup          │
 *              └─────────────┬─────────────┘
 *                            │
 *      ┌─────────────────────┼─────────────────────┐
 *      │                     │                     │
 * ┌────┴────┐         ┌──────┴──────┐       ┌─────┴─────┐
 * │GameStore│         │ StateEvent  │       │ Session   │
 * │(persist)│         │  Emitter    │       │ Manager   │
 * └─────────┘         └─────────────┘       └───────────┘
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * // Create a game session (automatically starts streaming)
 * import { gameSessionManager } from '@/lib/game/stream';
 * const gameId = gameSessionManager.createSession({ factions, maxTurns });
 *
 * // Use event-emitting mutations (automatically emits delta events)
 * import { addSpice, moveForces } from '@/lib/game/stream';
 * state = addSpice(state, faction, amount, 'reason');
 *
 * // Subscribe to events programmatically
 * import { eventStreamer } from '@/lib/game/stream';
 * const sub = await eventStreamer.subscribeToGame(gameId, (event) => {
 *   console.log(event);
 * });
 * sub.unsubscribe();
 * ```
 *
 * ## File Structure
 *
 * - types.ts - All type definitions and enums
 * - event-streamer.ts - Central event hub
 * - game-store.ts - High-level persistence API
 * - game-session-manager.ts - Session lifecycle management
 * - state-event-emitter.ts - Event-emitting state mutations
 * - phase-event-bridge.ts - Phase event helpers
 * - persistence/ - Storage backend implementations
 * - utils/ - Utility functions (ID generation, buffering)
 */

// =============================================================================
// TYPES (re-exported for convenience)
// =============================================================================

export type {
  // Core types
  StreamEvent,
  StreamEventType,
  EventSubscriber,
  Subscription,
  GameMetadata,
  GameSessionState,

  // Event data types
  GameCreatedData,
  GameStartedData,
  GameCompletedData,
  GameErrorData,
  TurnStartedData,
  TurnEndedData,
  PhaseStartedData,
  PhaseEndedData,
  AgentThinkingData,
  AgentToolCallData,
  AgentToolResultData,
  AgentDecisionData,
  FactionSpiceChangedData,
  FactionForcesChangedData,
  FactionCardAddedData,
  FactionCardRemovedData,
  FactionLeaderStatusData,
  StormPositionChangedData,
  SpiceBoardChangedData,
  AllianceChangedData,
  PhaseEventData,
  ConnectedData,
  HeartbeatData,
} from './types';

// Event type enums
export {
  GameLifecycleEvent,
  TurnPhaseEvent,
  AgentActivityEvent,
  StateDeltaEvent,
  WrapperEvent,
  ConnectionEvent,
} from './types';

// Type guards
export {
  isStreamEvent,
  isGameLifecycleEvent,
  isAgentActivityEvent,
  isStateDeltaEvent,
  isConnectionEvent,
} from './types';

// =============================================================================
// CORE MODULES
// =============================================================================

// Event streamer (singleton)
export { eventStreamer, EventStreamer } from './event-streamer';

// Game store (singleton)
export { gameStore, GameStore } from './game-store';

// Session manager (singleton)
export {
  gameSessionManager,
  GameSessionManager,
  type GameSession,
} from './game-session-manager';

// =============================================================================
// STATE EVENT EMITTERS
// =============================================================================

// These are drop-in replacements for mutations that also emit events
export {
  // Spice mutations
  addSpice,
  removeSpice,
  transferSpice,
  addSpiceToTerritory,
  removeSpiceFromTerritory,

  // Force mutations
  shipForces,
  moveForces,
  sendForcesToTanks,
  reviveForces,

  // Card mutations
  drawTreacheryCard,
  discardTreacheryCard,

  // Alliance mutations
  formAlliance,
  breakAlliance,

  // Storm mutations
  moveStorm,

  // Leader mutations
  killLeader,
  reviveLeader,
} from './state-event-emitter';

// =============================================================================
// PHASE EVENT HELPERS
// =============================================================================

export {
  emitPhaseEvent,
  emitRawPhaseEvent,
  emitTurnStarted,
  emitTurnEnded,
  emitPhaseStarted,
  emitPhaseEnded,
} from './phase-event-bridge';

// =============================================================================
// UTILITIES
// =============================================================================

export {
  generateEventId,
  generateGameId,
  generateSessionId,
  extractTimestamp,
  compareIds,
} from './utils/id-generator';

// =============================================================================
// PERSISTENCE (for advanced use cases)
// =============================================================================

export type {
  IEventStore,
  IStateStore,
  IMetadataStore,
  IGameStore,
  FileStoreConfig,
} from './persistence';

export { FileStore, fileStore } from './persistence';
