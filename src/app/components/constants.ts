/**
 * Shared constants for UI components
 */

import { Faction } from "@/lib/game/types/enums";
import { FACTION_COLORS_WEB } from "@/lib/game/constants/faction-colors";

// =============================================================================
// FACTION COLORS (for UI visualization)
// =============================================================================

// Re-export faction colors from centralized constants
export const FACTION_COLORS = FACTION_COLORS_WEB;

// =============================================================================
// PANEL POSITIONS
// =============================================================================

export interface PanelPosition {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  transform?: string;
}

/**
 * Position panels around the map (clockwise from top)
 */
export const PANEL_POSITIONS: Record<Faction, PanelPosition> = {
  [Faction.ATREIDES]: { top: "20px", left: "50%", transform: "translateX(-50%)" },
  [Faction.BENE_GESSERIT]: { top: "20px", right: "20px" },
  [Faction.EMPEROR]: { bottom: "20px", right: "20px" },
  [Faction.FREMEN]: { bottom: "20px", left: "50%", transform: "translateX(-50%)" },
  [Faction.HARKONNEN]: { bottom: "20px", left: "20px" },
  [Faction.SPACING_GUILD]: { top: "20px", left: "20px" },
};

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const SPICE_COLOR = "#D4AF37"; // Gold color for spice
export const PANEL_MIN_WIDTH = 200;
export const PANEL_MAX_WIDTH = 250;
export const PANEL_PADDING = 3;
export const LEADERS_MAX_HEIGHT = 120;

