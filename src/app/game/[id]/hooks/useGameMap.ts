'use client';

/**
 * Unified hook for game map state management
 * 
 * This hook:
 * - Connects to SSE stream
 * - Loads initial game state
 * - Processes all events to maintain complete state
 * - Provides easy access to map-specific data
 * 
 * Usage:
 *   const { gameState, map, isLoading, error } = useGameMap(gameId);
 *   // map.turn, map.stormSector, map.spiceFields, map.forces, etc.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent } from '@/lib/game/stream/types';
import { processEvent } from '../utils/eventHandlers';
import { deserializeGameState } from '../utils/deserialize-state';
import { useGameStream } from './useGameStream';

// =============================================================================
// TYPES
// =============================================================================

export interface MapData {
  turn: number;
  phase: GameState['phase'];
  stormSector: number;
  spiceFields: GameState['spiceOnBoard'];
  forces: GameState['factions'];
  setupComplete: boolean;
}

interface GameMapState {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  lastEventId: string | null;
}

type GameMapAction =
  | { type: 'STATE_LOADED'; payload: GameState | null; lastEventId?: string | null }
  | { type: 'EVENT_RECEIVED'; payload: StreamEvent }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'RESET' };

// =============================================================================
// REDUCER
// =============================================================================

function gameMapReducer(
  state: GameMapState,
  action: GameMapAction
): GameMapState {
  switch (action.type) {
    case 'STATE_LOADED': {
      return {
        ...state,
        gameState: action.payload,
        isLoading: false,
        error: null,
        lastEventId: action.lastEventId ?? state.lastEventId,
      };
    }

    case 'EVENT_RECEIVED': {
      const event = action.payload;
      const result = processEvent(event);

      // Handle GAME_STATE_UPDATE - this is the main way state is updated
      if (event.type === WrapperEvent.GAME_STATE_UPDATE && result.shouldUpdateState) {
        const newState = result.stateUpdate as GameState;
        console.log('[useGameMap] GAME_STATE_UPDATE received, updating state');
        return {
          ...state,
          gameState: newState,
          lastEventId: event.id,
        };
      }

      // If no state update needed or no current state, just track the event
      if (!result.shouldUpdateState || !state.gameState) {
        return {
          ...state,
          lastEventId: event.id,
        };
      }

      // Apply state update
      let newState: GameState;
      if (typeof result.stateUpdate === 'function') {
        newState = result.stateUpdate(state.gameState);
      } else {
        // Partial state update
        newState = {
          ...state.gameState,
          ...(result.stateUpdate as Partial<GameState>),
        };
      }

      return {
        ...state,
        gameState: newState,
        lastEventId: event.id,
      };
    }

    case 'LOAD_ERROR': {
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    }

    case 'RESET': {
      return {
        gameState: null,
        isLoading: false,
        error: null,
        lastEventId: null,
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useGameMap(gameId: string | null) {
  const [state, dispatch] = useReducer(gameMapReducer, {
    gameState: null,
    isLoading: true,
    error: null,
    lastEventId: null,
  });
  const [gameStatus, setGameStatus] = useState<string | null>(null);

  const processedEventIdsRef = useRef<Set<string>>(new Set());

  /**
   * Load initial state from API
   */
  const loadInitialState = useCallback(async () => {
    if (!gameId) return;

    try {
      dispatch({ type: 'RESET' });
      const response = await fetch(`/api/game/${gameId}`);

      // Handle 404 gracefully - state might not be saved yet, we'll build from events
      if (response.status === 404) {
        console.log('[useGameMap] State not available yet, will build from events');
        dispatch({ type: 'STATE_LOADED', payload: null, lastEventId: null });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load game state');
      }

      // Validate state structure
      if (!data.state || typeof data.state !== 'object') {
        throw new Error('Invalid game state structure');
      }

      // Deserialize state (convert JSON objects back to Maps)
      const deserializedState = deserializeGameState(data.state);

      // Extract lastEventId and status from API response if available
      const lastEventId = data.lastEventId || null;
      const status = data.status || null;
      setGameStatus(status);

      console.log('[useGameMap] Initial state loaded:', {
        turn: deserializedState.turn,
        phase: deserializedState.phase,
        stormSector: deserializedState.stormSector,
        factionsCount: deserializedState.factions.size,
        spiceCount: deserializedState.spiceOnBoard.length,
        status,
      });

      dispatch({ type: 'STATE_LOADED', payload: deserializedState, lastEventId });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load game state';
      console.error('[useGameMap] Error loading initial state:', err);
      dispatch({ type: 'LOAD_ERROR', payload: errorMessage });
    }
  }, [gameId]);

  /**
   * Handle incoming event from stream
   */
  const handleEvent = useCallback((event: StreamEvent) => {
    // Skip if already processed
    if (processedEventIdsRef.current.has(event.id)) {
      return;
    }

    processedEventIdsRef.current.add(event.id);
    dispatch({ type: 'EVENT_RECEIVED', payload: event });
  }, []);

  // Load initial state when gameId changes
  useEffect(() => {
    if (gameId) {
      loadInitialState();
    }
  }, [gameId, loadInitialState]);

  // Connect to SSE stream - use lastEventId from state to resume from correct position
  const { events, status: streamStatus } = useGameStream(
    gameId,
    state.lastEventId
  );

  // Process events from stream
  useEffect(() => {
    events.forEach((event) => {
      handleEvent(event);
    });
  }, [events, handleEvent]);

  // Compute map-specific data
  const map = useMemo<MapData | null>(() => {
    if (!state.gameState) return null;

    return {
      turn: state.gameState.turn,
      phase: state.gameState.phase,
      stormSector: state.gameState.stormSector,
      spiceFields: state.gameState.spiceOnBoard,
      forces: state.gameState.factions,
      setupComplete: state.gameState.setupComplete ?? false,
    };
  }, [state.gameState]);

  return {
    gameState: state.gameState,
    map,
    isLoading: state.isLoading,
    error: state.error,
    streamStatus,
    gameStatus, // Expose game status from API
    lastEventId: state.lastEventId,
    events, // Expose events for use by other hooks (e.g., phase visualizations)
  };
}

