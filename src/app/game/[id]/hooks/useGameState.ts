'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState } from '@/lib/game/types';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent } from '@/lib/game/stream/types';
import { deserializeGameState } from '../utils/deserialize-state';
import { useGameStream } from './useGameStream';
import { isConnectionEvent } from '@/lib/game/stream/types';

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing game state - simple approach:
 * - Load full state from API on mount
 * - Refetch full state when events indicate changes
 * - Events are used for notifications/toasts, not incremental updates
 */
export function useGameState(gameId: string | null) {
  const [state, setState] = useState<GameState | null>(null);
  const [metadata, setMetadata] = useState<{ factions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  
  // Track processed event IDs to avoid duplicate refetches
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  // Debounce refetches to avoid too many API calls
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we have state to avoid clearing it on 404
  const hasStateRef = useRef<boolean>(false);

  /**
   * Fetch full game state from API
   */
  const fetchState = useCallback(async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/game/${gameId}`);

      // Handle 404 gracefully - state might not be saved yet
      // But don't clear existing state if we already have it (preserve state during temporary API issues)
      if (response.status === 404) {
        console.log('[useGameState] State not available yet (404)');
        // Only set state to null if we don't have any state yet (initial load)
        // If we already have state, keep it to avoid clearing the UI
        if (!hasStateRef.current) {
          setState(null);
        }
        setIsLoading(false);
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

      // Extract lastEventId from API response if available
      const lastEventId = data.lastEventId || null;

      console.log('[useGameState] State loaded:', {
        hasFactions: !!deserializedState.factions,
        factionsIsMap: deserializedState.factions instanceof Map,
        factionsSize: deserializedState.factions instanceof Map ? deserializedState.factions.size : 'N/A',
        turn: deserializedState.turn,
        phase: deserializedState.phase,
      });

      setState(deserializedState);
      hasStateRef.current = true; // Mark that we have state
      // Also store metadata (useful when state.factions is empty)
      if (data.metadata) {
        setMetadata({ factions: data.metadata.factions || [] });
      }
      setLastEventId(lastEventId);
      setIsLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load game state';
      console.error('[useGameState] Error loading state:', err);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [gameId]);

  /**
   * Refetch state when events indicate changes
   * Debounced to avoid too many API calls
   */
  const handleStateChangeEvent = useCallback(() => {
    // Clear any pending refetch
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }

    // Debounce refetch by 100ms to batch rapid events
    refetchTimeoutRef.current = setTimeout(() => {
      fetchState();
    }, 100);
  }, [fetchState]);

  // Load initial state when gameId changes
  useEffect(() => {
    if (gameId) {
      processedEventIdsRef.current.clear();
      hasStateRef.current = false; // Reset state tracking when gameId changes
      fetchState();
    }
  }, [gameId, fetchState]);

  // Connect to SSE stream for event notifications
  const { events, status: streamStatus } = useGameStream(
    gameId,
    lastEventId
  );

  // Process events - use GAME_STATE_UPDATE events directly, refetch for others
  useEffect(() => {
    events.forEach((event) => {
      // Skip connection events
      if (isConnectionEvent(event.type)) {
        return;
      }

      // Skip if already processed
      if (processedEventIdsRef.current.has(event.id)) {
        return;
      }

      processedEventIdsRef.current.add(event.id);
      setLastEventId(event.id);

      // Handle GAME_STATE_UPDATE events directly (they contain full state)
      if (event.type === WrapperEvent.GAME_STATE_UPDATE) {
        try {
          const eventData = event.data as { gameId: string; state: unknown };
          const deserializedState = deserializeGameState(eventData.state);
          
          console.log('[useGameState] GAME_STATE_UPDATE received, updating state directly:', {
            hasFactions: !!deserializedState.factions,
            factionsIsMap: deserializedState.factions instanceof Map,
            factionsSize: deserializedState.factions instanceof Map ? deserializedState.factions.size : 'N/A',
          });
          
          setState(deserializedState);
          hasStateRef.current = true; // Mark that we have state
          setIsLoading(false);
          setError(null);
        } catch (error) {
          console.error('[useGameState] Error deserializing GAME_STATE_UPDATE:', error);
          // Fall back to refetch on error
          handleStateChangeEvent();
        }
      } else {
        // For other events, refetch state (debounced)
        handleStateChangeEvent();
      }
    });
  }, [events, handleStateChangeEvent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    metadata,
    isLoading,
    error,
    lastEventId,
    streamStatus,
    refetch: fetchState,
  };
}

