/**
 * Shared types for GameBoard components
 * Single source of truth for component prop types
 */

import type { GameState } from "@/lib/game/types";
import type { TerritoryId } from "@/lib/game/types/territories";
import type { RecentShipment } from "../../../hooks/usePhaseVisualizations";

/**
 * Base props for all GameBoard sub-components
 */
export interface GameBoardComponentProps {
  gameState?: GameState | null;
}

/**
 * Props for components that display territory-based data
 */
export interface TerritoryVisualizationProps extends GameBoardComponentProps {
  stormAffectedTerritories?: Set<TerritoryId>;
  spiceBlowTerritories?: Set<TerritoryId>;
}

/**
 * Props for components that display force-related data
 */
export interface ForceVisualizationProps extends GameBoardComponentProps {
  recentShipments?: RecentShipment[];
}

