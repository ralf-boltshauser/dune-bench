"use client";

import { useParams } from "next/navigation";
import { useGameMap } from "../../hooks/useGameMap";
import { usePhaseVisualizations } from "../../hooks/usePhaseVisualizations";
import FactionTokenSlots from "./components/FactionTokenSlots";
import ForceSlots from "./components/ForceSlots";
import PhaseIndicators from "./components/PhaseIndicators";
import SpecialAreas from "./components/SpecialAreas";
import SpiceSlots from "./components/SpiceSlots";
import StormSectors from "./components/StormSectors";
import Territories from "./components/Territories";
import TurnIndicator from "./components/TurnIndicator";

/**
 * GameBoard Component
 *
 * Interactive SVG game board component.
 * Split into multiple sub-components for better maintainability.
 * Each sub-component uses the useGameMap hook to access game state.
 */
export default function GameBoard() {
  const params = useParams();
  const gameId = params?.id as string | null;

  // Get game state - sub-components will also use this hook
  const { gameState, map, events } = useGameMap(gameId);

  // Get phase visualization data
  const { stormAffectedTerritories, spiceBlowTerritories, recentShipments } =
    usePhaseVisualizations(events);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="970"
        height="1099"
        viewBox="0 0 970 1099"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto"
      >
        <g id="Group 9">
          <circle
            id="border"
            cx="483.097"
            cy="556.456"
            r="432.5"
            stroke="black"
          />
          <Territories spiceBlowTerritories={spiceBlowTerritories} />
          <StormSectors
            stormSector={map?.stormSector ?? gameState?.stormSector}
          />
          <SpiceSlots gameState={gameState} />
          <ForceSlots gameState={gameState} recentShipments={recentShipments} />
          <TurnIndicator turn={map?.turn ?? gameState?.turn ?? 1} />
          <PhaseIndicators phase={map?.phase ?? gameState?.phase} />
          <SpecialAreas gameState={gameState} />
          <FactionTokenSlots gameState={gameState} />
        </g>
      </svg>
    </div>
  );
}
