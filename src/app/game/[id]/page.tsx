"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GameBoard from "./components/GameBoard/GameBoard";
import PhaseIndicator from "./components/PhaseIndicator";
import GameSidebar from "./components/GameSidebar";
import { useGameMap } from "./hooks/useGameMap";
import { usePhaseVisualizations } from "./hooks/usePhaseVisualizations";
import { handleEventToast } from "./utils/toastHandlers";
import { GameLifecycleEvent } from "@/lib/game/stream/types";
import type { StreamEvent } from "@/lib/game/stream/types";

// =============================================================================
// COMPONENT
// =============================================================================

function ConnectionStatus({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; pulse: string }> = {
    disconnected: { bg: "bg-slate-400", text: "text-slate-700", pulse: "" },
    connecting: { bg: "bg-amber-400", text: "text-amber-700", pulse: "animate-pulse" },
    connected: { bg: "bg-emerald-500", text: "text-emerald-700", pulse: "" },
    error: { bg: "bg-red-500", text: "text-red-700", pulse: "" },
  };

  const statusConfig = colors[status] || colors.disconnected;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/50">
      <div
        className={`w-2.5 h-2.5 rounded-full ${statusConfig.bg} ${statusConfig.pulse} shadow-sm`}
      />
      <span className={`text-xs font-medium capitalize ${statusConfig.text} tracking-wide`}>
        {status}
      </span>
    </div>
  );
}

/**
 * Main GameView component
 * Uses unified useGameMap hook for state management and connects to SSE stream
 */
export default function GameView() {
  const params = useParams();
  const gameId = params?.id as string | null;
  
  // Unified hook for game state and map data
  // This hook manages the SSE connection internally and exposes events
  const { gameState, map, isLoading, error: stateError, streamStatus, gameStatus, events } = useGameMap(gameId);
  
  // Resume button state
  const [isResuming, setIsResuming] = useState(false);
  
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  // Extract phase visualization state from events (for animations)
  const {
    currentPhase: phaseFromEvents,
    currentTurn: turnFromEvents,
  } = usePhaseVisualizations(events);

  // Use map data as source of truth, fallback to event-based values
  const currentTurn = map?.turn ?? turnFromEvents ?? 1;
  const currentPhase = map?.phase ?? phaseFromEvents;

  // Debug logging
  useEffect(() => {
    if (gameState) {
      console.log('[GameView] Game state updated:', {
        turn: gameState.turn,
        phase: gameState.phase,
        stormSector: gameState.stormSector,
        factionsCount: gameState.factions.size,
        forcesOnBoard: Array.from(gameState.factions.values()).reduce(
          (sum, f) => sum + f.forces.onBoard.length,
          0
        ),
        spiceCount: gameState.spiceOnBoard.length,
        setupComplete: gameState.setupComplete,
      });
    }
  }, [gameState]);

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

  // Handle resume button click
  const handleResume = async () => {
    if (!gameId || isResuming) return;

    setIsResuming(true);
    try {
      const response = await fetch(`/api/game/${gameId}/resume`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to resume game');
      }

      // Show success message
      if (gameId) {
        const resumeEvent: StreamEvent<{ message: string }> = {
          id: `resume-${Date.now()}`,
          type: GameLifecycleEvent.GAME_RESUMED,
          gameId,
          seq: 0,
          timestamp: Date.now(),
          data: { message: 'Game resumed successfully' },
        };
        handleEventToast(resumeEvent);
      }

      // Reload the page after a short delay to refresh state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resuming game:', error);
      alert(error instanceof Error ? error.message : 'Failed to resume game');
    } finally {
      setIsResuming(false);
    }
  };

  // Determine if resume button should be shown
  // Show button if:
  // 1. Game state exists and game is not completed
  // 2. Game is not currently running
  // 3. Either status is 'paused' or stream is disconnected (indicating game stopped)
  const shouldShowResume = 
    gameState && 
    !gameState.winner && 
    gameStatus !== 'running' &&
    gameStatus !== 'completed' &&
    (gameStatus === 'paused' || 
     gameStatus === 'error' ||
     (streamStatus === 'disconnected' && gameStatus !== 'running'));

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Game View</h1>
          <p className="text-red-600">No game ID provided</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Dune Game View</h1>
          <p className="text-gray-500">Loading game state...</p>
        </div>
      </div>
    );
  }

  if (stateError) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Dune Game View</h1>
          <p className="text-red-600">Error: {stateError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
        {/* Sidebar - Desktop: left, Mobile: top overlay */}
        <div className="lg:flex-shrink-0">
          <GameSidebar
            events={events}
            currentPhase={currentPhase ?? null}
            currentTurn={currentTurn}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {/* Compact header with phase info and connection status */}
          <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex-shrink-0 transition-all duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
              <PhaseIndicator phase={currentPhase ?? null} turn={currentTurn} />
              <div className="flex items-center gap-2">
                {shouldShowResume && (
                  <button
                    onClick={handleResume}
                    disabled={isResuming}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    {isResuming ? 'Resuming...' : 'Continue Game'}
                  </button>
                )}
                <ConnectionStatus status={streamStatus} />
              </div>
            </div>
          </div>

          {/* Map and game content */}
          <div className="flex-1 relative overflow-auto p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="relative transition-all duration-300 ease-out">
                <GameBoard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
