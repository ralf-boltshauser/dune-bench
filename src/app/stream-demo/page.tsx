'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface StreamEvent {
  id: string;
  type: string;
  gameId: string;
  timestamp: number;
  seq: number;
  data: unknown;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Custom hook for managing SSE connection with reconnection support
 */
function useGameStream(gameId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Track last event ID for reconnection
  const lastEventIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to the SSE stream
   */
  const connect = useCallback(() => {
    if (!gameId) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    setError(null);

    // Build URL with lastEventId for reconnection
    let url = `/api/game/${gameId}/stream`;
    if (lastEventIdRef.current) {
      url += `?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
      console.log(`Reconnecting from event: ${lastEventIdRef.current}`);
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setStatus('connected');
      setError(null);
    };

    eventSource.onmessage = (e) => {
      try {
        const event: StreamEvent = JSON.parse(e.data);
        console.log(`Received event: ${event.type} (seq: ${event.seq})`);

        // Track last event ID for reconnection (skip connection events)
        if (event.seq > 0) {
          lastEventIdRef.current = event.id;
        }

        setEvents((prev) => [...prev, event]);
      } catch (err) {
        console.error('Error parsing event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setStatus('error');
      setError('Connection error');

      // EventSource will auto-reconnect, but we can also handle it manually
      // The browser's EventSource auto-reconnect doesn't pass lastEventId by default
      eventSource.close();

      // Manual reconnection with lastEventId after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting reconnection...');
        connect();
      }, 2000);
    };
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
    setEvents([]);
    disconnect();
  }, [disconnect]);

  // Connect when gameId changes
  useEffect(() => {
    if (gameId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [gameId, connect, disconnect]);

  return {
    events,
    status,
    error,
    lastEventId: lastEventIdRef.current,
    reset,
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  );
}

function EventCard({ event }: { event: StreamEvent }) {
  const isConnectionEvent = event.type === 'CONNECTED' || event.type === 'HEARTBEAT';

  return (
    <div
      className={`p-3 rounded border ${
        isConnectionEvent
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`font-semibold ${
            isConnectionEvent ? 'text-gray-500' : 'text-blue-600'
          }`}
        >
          {event.type}
        </span>
        <span className="text-xs text-gray-400">
          seq: {event.seq}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
      <pre className="text-xs overflow-x-auto bg-gray-50 p-2 rounded">
        {JSON.stringify(event.data, null, 2)}
      </pre>
    </div>
  );
}

// =============================================================================
// PAGE
// =============================================================================

export default function StreamDemoPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { events, status, error, lastEventId, reset } = useGameStream(gameId);

  /**
   * Start a new game
   */
  const startGame = async () => {
    try {
      setIsStarting(true);
      setStartError(null);
      reset();

      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factions: ['ATREIDES', 'HARKONNEN'],
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Game started:', result.gameId);
        setGameId(result.gameId);
      } else {
        throw new Error(result.error || 'Failed to start game');
      }
    } catch (err) {
      console.error('Error starting game:', err);
      setStartError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  // Count event types
  const eventCounts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">SSE Stream Demo</h1>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={status} />
              {gameId && (
                <span className="text-sm text-gray-500">
                  Game: <code className="bg-gray-100 px-1 rounded">{gameId}</code>
                </span>
              )}
            </div>
            <button
              onClick={startGame}
              disabled={isStarting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Starting...' : 'Start New Game'}
            </button>
          </div>

          {/* Error Messages */}
          {(error || startError) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {startError || error}
            </div>
          )}

          {/* Connection Info */}
          {gameId && (
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Last Event ID:{' '}
                <code className="bg-gray-100 px-1 rounded">
                  {lastEventId || 'none'}
                </code>
              </div>
              <div>
                Events Received: <strong>{events.length}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Event Type Summary */}
        {Object.keys(eventCounts).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="font-semibold mb-3">Event Summary</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventCounts).map(([type, count]) => (
                <span
                  key={type}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Event List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="font-semibold mb-4">
            Events ({events.length})
          </h2>
          <div className="max-h-[600px] overflow-y-auto space-y-3">
            {events.length === 0 ? (
              <p className="text-gray-500">
                No events yet. Click &quot;Start New Game&quot; to begin.
              </p>
            ) : (
              events.map((event, index) => (
                <EventCard key={`${event.id}-${index}`} event={event} />
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>Click &quot;Start New Game&quot; to create a game and connect to its event stream</li>
            <li>Events are streamed in real-time as the game progresses</li>
            <li>If disconnected, the client will auto-reconnect and replay missed events</li>
            <li>Connection events (CONNECTED, HEARTBEAT) have seq: 0</li>
            <li>Open browser DevTools to see detailed logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
