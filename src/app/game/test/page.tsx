"use client";

import type { StreamEvent } from "@/lib/game/stream/types";
import { useEffect, useRef, useState } from "react";
import { useGameState } from "../[id]/hooks/useGameState";
import { useGameStream } from "../[id]/hooks/useGameStream";
import { handleEventToast } from "../[id]/utils/toastHandlers";
import { Button } from "@/components/ui/button";

// =============================================================================
// COMPONENTS
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    disconnected: "bg-gray-500",
    connecting: "bg-yellow-500",
    connected: "bg-green-500",
    error: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${colors[status] || "bg-gray-500"}`}
      />
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  );
}

function EventCard({ event }: { event: StreamEvent }) {
  const isConnectionEvent =
    event.type === "CONNECTED" || event.type === "HEARTBEAT";

  return (
    <div
      className={`p-3 rounded border ${
        isConnectionEvent
          ? "bg-gray-50 border-gray-200"
          : "bg-white border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`font-semibold ${
            isConnectionEvent ? "text-gray-500" : "text-blue-600"
          }`}
        >
          {event.type}
        </span>
        <span className="text-xs text-gray-400">seq: {event.seq}</span>
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

/**
 * Test page for testing SSE connection and state management
 */
export default function GameTestPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const {
    events,
    status,
    error: streamError,
    lastEventId,
    reset: resetStream,
  } = useGameStream(gameId);
  const {
    state,
    isLoading,
    error: stateError,
    refetch: refetchState,
  } = useGameState(gameId);

  const processedEventIdsRef = useRef<Set<string>>(new Set());

  // Handle toast notifications for new events
  useEffect(() => {
    if (events.length === 0) return;

    // Process only new events (not already processed)
    events.forEach((event) => {
      if (!processedEventIdsRef.current.has(event.id)) {
        processedEventIdsRef.current.add(event.id);
        handleEventToast(event);
      }
    });
  }, [events]);

  /**
   * Start a new game
   */
  const startGame = async () => {
    try {
      setIsStarting(true);
      setStartError(null);
      resetStream();
      refetchState();

      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factions: ["ATREIDES", "HARKONNEN"],
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("Game started:", result.gameId);
        setGameId(result.gameId);
      } else {
        throw new Error(result.error || "Failed to start game");
      }
    } catch (err) {
      console.error("Error starting game:", err);
      setStartError(
        err instanceof Error ? err.message : "Failed to start game"
      );
    } finally {
      setIsStarting(false);
    }
  };

  /**
   * Connect to existing game
   */
  const connectToGame = () => {
    const input = prompt("Enter game ID:");
    if (input) {
      setGameId(input);
      resetStream();
      refetchState();
    }
  };

  // Count event types
  const eventCounts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});

  const error = streamError || stateError || startError;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Game Stream Test Page</h1>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={status} />
              {gameId && (
                <span className="text-sm text-gray-500">
                  Game:{" "}
                  <code className="bg-gray-100 px-1 rounded">{gameId}</code>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={startGame}
                disabled={isStarting}
                variant="default"
              >
                {isStarting ? "Starting..." : "Start New Game"}
              </Button>
              <Button
                onClick={connectToGame}
                variant="secondary"
              >
                Connect to Game
              </Button>
            </div>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Connection Info */}
          {gameId && (
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Last Event ID:{" "}
                <code className="bg-gray-100 px-1 rounded">
                  {lastEventId || "none"}
                </code>
              </div>
              <div>
                Events Received: <strong>{events.length}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Game State Display */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <p className="text-gray-500">Loading game state...</p>
          </div>
        ) : state ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="font-semibold mb-3">Game State</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Turn</p>
                <p className="text-lg font-semibold">{state.turn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phase</p>
                <p className="text-lg font-semibold">{state.phase}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Storm Sector</p>
                <p className="text-lg font-semibold">{state.stormSector}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Factions</p>
              <div className="space-y-1">
                {Array.from(state.factions.entries()).map(
                  ([faction, factionState]) => (
                    <div key={faction} className="text-sm">
                      <strong>{faction}:</strong> Spice: {factionState.spice}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : null}

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
          <h2 className="font-semibold mb-4">Events ({events.length})</h2>
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
          <h3 className="font-semibold text-blue-900 mb-2">
            Test Instructions
          </h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>
              Click &quot;Start New Game&quot; to create a game and connect to
              its event stream
            </li>
            <li>Events are streamed in real-time as the game progresses</li>
            <li>
              If disconnected, the client will auto-reconnect and replay missed
              events
            </li>
            <li>Connection events (CONNECTED, HEARTBEAT) have seq: 0</li>
            <li>Game state updates automatically as events arrive</li>
            <li>Open browser DevTools to see detailed logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
