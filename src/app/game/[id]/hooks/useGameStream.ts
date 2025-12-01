'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StreamEvent } from '@/lib/game/stream/types';

// =============================================================================
// TYPES
// =============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseGameStreamReturn {
  events: StreamEvent[];
  status: ConnectionStatus;
  error: string | null;
  lastEventId: string | null;
  connect: () => void;
  disconnect: () => void;
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Log debug message only in development
 */
function debugLog(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[useGameStream] ${message}`, ...args);
  }
}

/**
 * Log error message
 */
function logError(message: string, error?: unknown): void {
  console.error(`[useGameStream] ${message}`, error);
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for managing SSE connection with reconnection support
 * Extracted and enhanced from stream-demo/page.tsx
 * 
 * @param gameId - The game ID to stream events for
 * @param initialLastEventId - Optional last event ID to resume from (from initial state load)
 */
export function useGameStream(
  gameId: string | null,
  initialLastEventId?: string | null
): UseGameStreamReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  // Track refs for cleanup and reconnection
  const lastEventIdRef = useRef<string | null>(initialLastEventId ?? null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const hasConnectedWithLastEventIdRef = useRef<boolean>(false);

  /**
   * Connect to the SSE stream
   */
  const connect = useCallback(() => {
    if (!gameId || !isMountedRef.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setStatus('connecting');
    setError(null);

    // Build URL with lastEventId for reconnection
    let url = `/api/game/${gameId}/stream`;
    if (lastEventIdRef.current) {
      url += `?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
      debugLog('Reconnecting from event:', lastEventIdRef.current);
    }

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isMountedRef.current) {
          eventSource.close();
          return;
        }
        debugLog('SSE connection opened');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      eventSource.onmessage = (e) => {
        if (!isMountedRef.current) return;

        try {
          const event: StreamEvent = JSON.parse(e.data);
          debugLog('Received event:', event.type, `(seq: ${event.seq})`);

          // Validate event structure
          if (!event.id || !event.type || typeof event.seq !== 'number') {
            throw new Error('Invalid event structure');
          }

          // Track last event ID for reconnection (skip connection events)
          if (event.seq > 0) {
            lastEventIdRef.current = event.id;
            setLastEventId(event.id);
          }

          setEvents((prev) => [...prev, event]);
        } catch (err) {
          logError('Error parsing event:', err);
          setError('Failed to parse event');
        }
      };

      eventSource.onerror = (err) => {
        if (!isMountedRef.current) return;

        logError('SSE error:', err);
        setStatus('error');
        setError('Connection error');

        // Close the connection
        eventSource.close();

        // Attempt reconnection with exponential backoff
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current - 1);
          debugLog(`Attempting reconnection (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          setError(`Connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        }
      };
    } catch (err) {
      logError('Failed to create EventSource:', err);
      setStatus('error');
      setError('Failed to establish connection');
    }
  }, [gameId]);

  /**
   * Disconnect from the stream
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  /**
   * Reset the stream (clear events and reconnect)
   */
  const reset = useCallback(() => {
    lastEventIdRef.current = null;
    setLastEventId(null);
    setEvents([]);
    reconnectAttemptsRef.current = 0;
    disconnect();
  }, [disconnect]);

  // Update lastEventIdRef when initialLastEventId becomes available and reconnect if needed
  useEffect(() => {
    if (initialLastEventId !== undefined && initialLastEventId !== null && gameId) {
      // If we connected without lastEventId, reconnect now with it to avoid replaying all events
      if (!hasConnectedWithLastEventIdRef.current && lastEventIdRef.current !== initialLastEventId) {
        lastEventIdRef.current = initialLastEventId;
        setLastEventId(initialLastEventId);
        debugLog('Initial lastEventId available, reconnecting to resume from:', initialLastEventId);
        
        // Clear events to avoid duplicates (stream will send events from lastEventId onwards)
        setEvents([]);
        
        // Reconnect with the lastEventId
        if (eventSourceRef.current) {
          disconnect();
        }
        connect();
        hasConnectedWithLastEventIdRef.current = true;
      }
    }
  }, [initialLastEventId, gameId, connect, disconnect]);

  // Connect when gameId changes
  useEffect(() => {
    isMountedRef.current = true;
    if (gameId) {
      // Reset connection tracking when gameId changes
      hasConnectedWithLastEventIdRef.current = false;
      
      // If we have an initialLastEventId, update the ref before connecting
      if (initialLastEventId !== undefined && initialLastEventId !== null) {
        lastEventIdRef.current = initialLastEventId;
        hasConnectedWithLastEventIdRef.current = true;
      }
      connect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
      hasConnectedWithLastEventIdRef.current = false;
    };
  }, [gameId, connect, disconnect]);

  return {
    events,
    status,
    error,
    lastEventId,
    connect,
    disconnect,
    reset,
  };
}

