"use client";

import { useParams } from "next/navigation";
import { Phase } from "@/lib/game/types/enums";
import type { StreamEvent } from "@/lib/game/stream/types";
import { useSetupInfo } from "../../hooks/useSetupInfo";
import { useGameState } from "../../hooks/useGameState";
import TraitorSelectionCard from "./TraitorSelectionCard";
import TraitorOptionsVisualization from "./TraitorOptionsVisualization";
import FremenDistributionCard from "./FremenDistributionCard";
import PlayerPositionsCard from "./PlayerPositionsCard";

// =============================================================================
// TYPES
// =============================================================================

interface SetupInfoProps {
  events: StreamEvent[];
  currentPhase: Phase | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Main container component for setup phase information
 * Shows setup information whenever setup data exists, even if we're past the setup phase
 */
export default function SetupInfo({ events, currentPhase }: SetupInfoProps) {
  // Get gameId from URL params
  const params = useParams();
  const gameId = params?.id as string | null;
  
  // Get game state
  const { state: gameState } = useGameState(gameId);

  // Extract setup information from events and state
  const setupInfo = useSetupInfo(events, gameState);

  // Check if we have any setup data to display
  const hasSetupData = 
    setupInfo.traitorSelections.size > 0 ||
    setupInfo.fremenDistribution !== null ||
    setupInfo.playerPositions.size > 0;

  // Check if there are setup events in the stream
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

  // Show setup info if:
  // 1. We're currently in SETUP phase, OR
  // 2. We have setup data (even if phase has moved on), OR
  // 3. We have setup events in the stream
  const shouldShow = currentPhase === Phase.SETUP || hasSetupData || hasSetupEvents;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Setup Phase</h2>
        <p className="text-sm text-slate-500">Initial game configuration and traitor selection</p>
      </div>

      {/* Player Positions Card - Most Recent */}
      {setupInfo.playerPositions.size > 0 && (
        <PlayerPositionsCard playerPositions={setupInfo.playerPositions} />
      )}

      {/* Fremen Distribution Card */}
      {setupInfo.fremenDistribution && (
        <FremenDistributionCard distribution={setupInfo.fremenDistribution} />
      )}

      {/* Traitor Selection Cards */}
      <div className="space-y-4">
        {Array.from(setupInfo.traitorSelections.entries()).map(([faction, selection]) => (
          <TraitorSelectionCard
            key={faction}
            faction={faction}
            availableTraitors={selection.availableTraitors}
            selectedTraitor={selection.selectedTraitor}
          />
        ))}
      </div>

      {/* Traitor Options Visualization - Oldest */}
      <TraitorOptionsVisualization
        traitorSelections={setupInfo.traitorSelections}
      />
    </div>
  );
}

