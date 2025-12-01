"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Faction, Phase } from "@/lib/game/types/enums";
import type { StreamEvent } from "@/lib/game/stream/types";
import { useGameState } from "../../hooks/useGameState";
import { usePhaseHistory } from "../../hooks/usePhaseHistory";
import EventHistory from "../EventHistory/EventHistory";
import PhaseHistoryEntry from "./PhaseHistoryEntry";
import FactionInspector from "../FactionInspector";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// =============================================================================
// TYPES
// =============================================================================

interface GameSidebarProps {
  events: StreamEvent[];
  currentPhase: Phase | null;
  currentTurn: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Context-aware sidebar component that displays relevant information
 * based on the current game phase
 */
export default function GameSidebar({
  events,
  currentPhase,
  currentTurn,
}: GameSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'phase' | 'history' | 'factions'>('phase');
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const params = useParams();
  const gameId = params?.id as string | null;

  // Get game state for hooks that need it
  const { state: gameState, metadata, isLoading, error } = useGameState(gameId);

  // Track phase history (reconstruct from events for persistence)
  const phaseHistory = usePhaseHistory(currentPhase, currentTurn, events);

  // Check if we have setup data to show
  const hasSetupData = useMemo(() => {
    // Check if there are setup events
    const hasSetupEvents = events.some(event => {
      if (event.type === 'PHASE_EVENT') {
        const phaseEvent = (event.data as { event?: { type: string } }).event;
        return phaseEvent?.type === 'SETUP_STEP' ||
               phaseEvent?.type === 'TRAITOR_SELECTED' ||
               phaseEvent?.type === 'TRAITOR_OPTIONS_AVAILABLE' ||
               phaseEvent?.type === 'FORCES_PLACED';
      }
      return false;
    });
    // Check if game state has setup data (traitors, forces, etc.)
    const hasStateData = gameState && gameState.factions instanceof Map && (
      Array.from(gameState.factions.values()).some(f => f.traitors && f.traitors.length > 0) ||
      (gameState.factions.get(Faction.FREMEN)?.forces.onBoard.length ?? 0) > 0
    );
    return hasSetupEvents || hasStateData;
  }, [events, gameState]);

  // Render phase content with history
  const renderPhaseContent = () => {
    return (
      <div className="space-y-5">
        {/* Current Phase - Most Recent */}
        {currentPhase ? (
          <>
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full border border-blue-200/50">
                  CURRENT
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Turn {currentTurn} • {currentPhase}
                </span>
              </div>
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200/50 rounded-lg p-4 shadow-sm">
                <PhaseHistoryEntry
                  phase={currentPhase}
                  turn={currentTurn}
                  events={events}
                  isHistorical={false}
                  stormOrder={gameState?.stormOrder ?? []}
                />
              </div>
            </div>
            {(phaseHistory.length > 0 || (hasSetupData && currentPhase !== Phase.SETUP)) && <Separator className="bg-slate-200" />}
          </>
        ) : (
          <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm">No active phase</p>
          </div>
        )}

        {/* Historical Phases - Most Recent First */}
        {phaseHistory.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 px-1">
              Previous Phases
            </div>
            {phaseHistory.map((entry) => (
              <div
                key={entry.id}
                className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-600 font-medium">
                    Turn {entry.turn} • {entry.phase}
                  </span>
                </div>
                <PhaseHistoryEntry
                  phase={entry.phase}
                  turn={entry.turn}
                  events={events}
                  isHistorical={true}
                  stormOrder={gameState?.stormOrder ?? []}
                />
              </div>
            ))}
            {hasSetupData && currentPhase !== Phase.SETUP && <Separator className="bg-slate-200" />}
          </div>
        )}

        {/* Setup Phase Info - Oldest at Bottom */}
        {hasSetupData && currentPhase !== Phase.SETUP && (
          <div className="pb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-purple-700 bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-1.5 rounded-full border border-purple-200/50">
                SETUP
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Initial Setup
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <PhaseHistoryEntry
                phase={Phase.SETUP}
                turn={0}
                events={events}
                isHistorical={true}
                stormOrder={gameState?.stormOrder ?? []}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        bg-white/95 backdrop-blur-sm shadow-xl border-r border-slate-200
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isCollapsed ? "w-12" : "w-full sm:w-80 md:w-96 lg:w-[28rem]"}
        ${isCollapsed ? "h-12" : "h-screen lg:h-full"}
        ${isCollapsed ? "lg:h-full" : ""}
        ${isCollapsed ? "lg:w-12" : ""}
        fixed lg:sticky
        top-0 left-0 lg:top-auto lg:left-auto
        z-40
        lg:z-auto
        ${isCollapsed ? "lg:min-h-screen" : ""}
        overflow-hidden
      `}
    >
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
            Game Information
          </h2>
        )}
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="ghost"
          size="icon"
          className={`
            ${isCollapsed ? "mx-auto" : ""}
            hover:bg-slate-100
          `}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </Button>
      </div>

      {/* Tabs */}
      {!isCollapsed && (
        <div className="flex border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
          <Button
            onClick={() => {
              setActiveTab('phase');
              setSelectedFaction(null);
            }}
            variant="ghost"
            className={`
              flex-1 px-3 py-2.5 text-xs font-semibold h-auto rounded-none transition-all
              ${
                activeTab === 'phase'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
              }
            `}
          >
            Phase
          </Button>
          <Button
            onClick={() => {
              setActiveTab('history');
              setSelectedFaction(null);
            }}
            variant="ghost"
            className={`
              flex-1 px-3 py-2.5 text-xs font-semibold h-auto rounded-none transition-all
              ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
              }
            `}
          >
            History
          </Button>
          <Button
            onClick={() => {
              setActiveTab('factions');
              setSelectedFaction(null);
            }}
            variant="ghost"
            className={`
              flex-1 px-3 py-2.5 text-xs font-semibold h-auto rounded-none transition-all
              ${
                activeTab === 'factions'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
              }
            `}
          >
            Factions
          </Button>
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50/30">
          <ScrollArea className="h-full">
            <div className="p-5">
              {activeTab === 'phase' && renderPhaseContent()}
              {activeTab === 'history' && <EventHistory events={events} />}
              {activeTab === 'factions' && (
                <FactionInspector
                  gameState={gameState}
                  metadata={metadata}
                  selectedFaction={selectedFaction}
                  onSelectFaction={setSelectedFaction}
                  isLoading={isLoading}
                  error={error}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </aside>
  );
}

