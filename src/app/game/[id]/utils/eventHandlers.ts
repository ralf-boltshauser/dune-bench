/**
 * Event Handlers - Process different event types and route to state updates
 * Type-safe event processing using types from @/lib/game/stream/types
 * 
 * Uses a handler map pattern for maintainability and extensibility
 */

import type { StreamEvent } from '@/lib/game/stream/types';
import {
  GameLifecycleEvent,
  TurnPhaseEvent,
  StateDeltaEvent,
  WrapperEvent,
  isConnectionEvent,
} from '@/lib/game/stream/types';
import type { GameState } from '@/lib/game/types';
import { deserializeGameState } from '../utils/deserialize-state';

// =============================================================================
// TYPES
// =============================================================================

export interface EventProcessingResult {
  shouldUpdateState: boolean;
  stateUpdate?: Partial<GameState> | ((state: GameState) => GameState);
  metadata?: {
    message?: string;
    phase?: string;
    turn?: number;
  };
}

type EventHandler = (event: StreamEvent) => EventProcessingResult;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate event data structure
 */
function validateEventData(event: StreamEvent): boolean {
  return (
    typeof event.id === 'string' &&
    typeof event.type === 'string' &&
    typeof event.seq === 'number' &&
    event.data !== undefined
  );
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle GAME_STATE_UPDATE wrapper events
 * The state is sent as a serialized object (Maps as {__type: 'Map', entries: [...]})
 * so we need to deserialize it back to GameState with Maps restored.
 */
function handleGameStateUpdate(event: StreamEvent): EventProcessingResult {
  try {
    // event.data.state contains the serialized state object
    const eventData = event.data as { gameId: string; state: unknown };
    const deserializedState = deserializeGameState(eventData.state);
    
    return {
      shouldUpdateState: true,
      stateUpdate: deserializedState,
    };
  } catch (error) {
    console.error('[eventHandlers] Error deserializing game state:', error);
    return {
      shouldUpdateState: false,
      metadata: { message: 'Failed to deserialize game state' },
    };
  }
}

/**
 * Handle GAME_CREATED lifecycle event
 */
function handleGameCreated(event: StreamEvent): EventProcessingResult {
  return {
    shouldUpdateState: true,
    stateUpdate: event.data as Partial<GameState>,
    metadata: { message: 'Game created' },
  };
}

/**
 * Handle GAME_STARTED lifecycle event
 */
function handleGameStarted(_event: StreamEvent): EventProcessingResult {
  return {
    shouldUpdateState: false, // State already updated via GAME_STATE_UPDATE
    metadata: { message: 'Game started' },
  };
}

/**
 * Handle GAME_COMPLETED lifecycle event
 */
function handleGameCompleted(event: StreamEvent): EventProcessingResult {
  const data = event.data as { result?: { winner?: GameState['winner'] } };
  return {
    shouldUpdateState: true,
    stateUpdate: (state: GameState) => ({
      ...state,
      winner: data.result?.winner ?? null,
    }),
    metadata: { message: 'Game completed' },
  };
}

/**
 * Handle TURN_STARTED event
 */
function handleTurnStarted(event: StreamEvent): EventProcessingResult {
  const data = event.data as {
    turn: number;
    maxTurns: number;
    stormOrder: string[];
  };
  return {
    shouldUpdateState: true,
    stateUpdate: (state: GameState) => ({
      ...state,
      turn: data.turn,
      stormOrder: data.stormOrder as GameState['stormOrder'],
    }),
    metadata: { turn: data.turn, message: `Turn ${data.turn} started` },
  };
}

/**
 * Handle PHASE_STARTED event
 */
function handlePhaseStarted(event: StreamEvent): EventProcessingResult {
  const data = event.data as { phase: string; turn: number };
  return {
    shouldUpdateState: true,
    stateUpdate: (state: GameState) => ({
      ...state,
      phase: data.phase as GameState['phase'],
    }),
    metadata: {
      phase: data.phase,
      turn: data.turn,
      message: `Phase ${data.phase} started`,
    },
  };
}

/**
 * Handle PHASE_ENDED event
 */
function handlePhaseEnded(event: StreamEvent): EventProcessingResult {
  const data = event.data as { phase: string; turn: number };
  return {
    shouldUpdateState: false,
    metadata: {
      phase: data.phase,
      turn: data.turn,
      message: `Phase ${data.phase} ended`,
    },
  };
}

/**
 * Handle FACTION_SPICE_CHANGED state delta event
 */
function handleFactionSpiceChanged(event: StreamEvent): EventProcessingResult {
  const data = event.data as {
    faction: string;
    oldValue: number;
    newValue: number;
    reason: string;
  };
  return {
    shouldUpdateState: false, // Rely on GAME_STATE_UPDATE for actual state
    metadata: {
      message: `${data.faction} spice: ${data.oldValue} → ${data.newValue} (${data.reason})`,
    },
  };
}

/**
 * Handle FACTION_FORCES_CHANGED state delta event
 */
function handleFactionForcesChanged(event: StreamEvent): EventProcessingResult {
  const data = event.data as {
    faction: string;
    territory: string;
    sector: number;
    regularDelta: number;
    eliteDelta: number;
    reason: string;
  };
  return {
    shouldUpdateState: false, // Rely on GAME_STATE_UPDATE for actual state
    metadata: {
      message: `${data.faction} forces changed in ${data.territory} (${data.reason})`,
    },
  };
}

/**
 * Handle STORM_POSITION_CHANGED state delta event
 */
function handleStormPositionChanged(event: StreamEvent): EventProcessingResult {
  const data = event.data as {
    oldSector: number;
    newSector: number;
    movement: number;
  };
  return {
    shouldUpdateState: true,
    stateUpdate: (state: GameState) => ({
      ...state,
      stormSector: data.newSector,
    }),
    metadata: {
      message: `Storm moved: sector ${data.oldSector} → ${data.newSector}`,
    },
  };
}

/**
 * Default handler for unknown events
 */
function handleDefault(event: StreamEvent): EventProcessingResult {
  return {
    shouldUpdateState: false,
    metadata: { message: `Event: ${event.type}` },
  };
}

// =============================================================================
// HANDLER MAP
// =============================================================================

/**
 * Map of event types to their handlers
 * This makes it easy to add new event handlers and maintain the code
 */
const EVENT_HANDLERS: Record<string, EventHandler> = {
  // Wrapper events
  [WrapperEvent.GAME_STATE_UPDATE]: handleGameStateUpdate,

  // Lifecycle events
  [GameLifecycleEvent.GAME_CREATED]: handleGameCreated,
  [GameLifecycleEvent.GAME_STARTED]: handleGameStarted,
  [GameLifecycleEvent.GAME_COMPLETED]: handleGameCompleted,

  // Turn/Phase events
  [TurnPhaseEvent.TURN_STARTED]: handleTurnStarted,
  [TurnPhaseEvent.PHASE_STARTED]: handlePhaseStarted,
  [TurnPhaseEvent.PHASE_ENDED]: handlePhaseEnded,

  // State delta events
  [StateDeltaEvent.FACTION_SPICE_CHANGED]: handleFactionSpiceChanged,
  [StateDeltaEvent.FACTION_FORCES_CHANGED]: handleFactionForcesChanged,
  [StateDeltaEvent.STORM_POSITION_CHANGED]: handleStormPositionChanged,
};

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

/**
 * Process a stream event and determine if/how to update state
 */
export function processEvent(event: StreamEvent): EventProcessingResult {
  // Validate event structure
  if (!validateEventData(event)) {
    console.warn('[eventHandlers] Invalid event structure:', event);
    return { shouldUpdateState: false };
  }

  // Skip connection events (they don't affect game state)
  if (isConnectionEvent(event.type)) {
    return { shouldUpdateState: false };
  }

  // Get handler for this event type
  const handler = EVENT_HANDLERS[event.type] || handleDefault;

  try {
    return handler(event);
  } catch (error) {
    console.error(`[eventHandlers] Error processing event ${event.type}:`, error);
    return {
      shouldUpdateState: false,
      metadata: { message: `Error processing ${event.type}` },
    };
  }
}

/**
 * Check if an event should trigger a state update
 */
export function shouldUpdateState(event: StreamEvent): boolean {
  return processEvent(event).shouldUpdateState;
}
