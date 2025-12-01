/**
 * Toast Helper Functions
 * 
 * Shared utilities for toast notifications
 */

import { FACTION_NAMES, Faction } from '@/lib/game/types';
import { FACTION_COLORS_WEB } from '@/lib/game/constants/faction-colors';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default toast duration in milliseconds
 */
export const TOAST_DURATIONS = {
  SHORT: 2500,
  MEDIUM: 3000,
  LONG: 4000,
  EXTRA_LONG: 5000,
  VERY_LONG: 10000,
} as const;

/**
 * Phase events that should trigger toasts
 */
export const IMPORTANT_PHASE_EVENTS = [
  'BATTLE_STARTED',
  'BATTLE_RESOLVED',
  'BID_PLACED',
  'CARD_WON',
  'FORCES_REVIVED',
  'LEADER_REVIVED',
  'FORCES_SHIPPED',
  'FORCES_MOVED',
  'SPICE_COLLECTED',
  'STORM_MOVED',
  'SPICE_PLACED',
  'SHAI_HULUD_APPEARED',
  'VICTORY_ACHIEVED',
  // Setup phase events
  'TRAITOR_SELECTED',
  'TRAITOR_OPTIONS_AVAILABLE',
  'SETUP_STEP',
  'FORCES_PLACED',
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get faction display name from enum value
 * 
 * @param faction - Faction enum value or string
 * @returns Display name or original value if not found
 */
export function getFactionName(faction: string): string {
  return FACTION_NAMES[faction as Faction] || faction;
}

/**
 * Format phase name for display (e.g., "STORM_PHASE" -> "Storm Phase")
 * 
 * @param phase - Phase string in SCREAMING_SNAKE_CASE
 * @returns Formatted phase name
 */
export function formatPhaseName(phase: string): string {
  return phase
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a unique toast ID for an event
 * 
 * @param prefix - Prefix for the ID (e.g., "agent-thinking")
 * @param identifier - Unique identifier (faction, territory, etc.)
 * @param eventId - Event ID
 * @returns Unique toast ID
 */
export function generateToastId(
  prefix: string,
  identifier: string,
  eventId: string
): string {
  return `${prefix}-${identifier}-${eventId}`;
}

/**
 * Format delta value for display (e.g., 5 -> "+5", -3 -> "-3")
 * 
 * @param delta - The delta value
 * @returns Formatted string with sign
 */
export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * Get toast style options for a faction
 * 
 * @param faction - The faction to get colors for
 * @returns Toast style options with faction colors
 */
export function getFactionToastStyle(faction: Faction): {
  style: {
    background: string;
    color: string;
    border?: string;
  };
} {
  const factionColor = FACTION_COLORS_WEB[faction];
  
  // For Harkonnen (black), use a dark gray background with white text and border
  if (faction === Faction.HARKONNEN) {
    return {
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid #333',
      },
    };
  }
  
  // For other factions, use the faction color as background
  // Determine text color based on brightness (light or dark)
  const isLightColor = isColorLight(factionColor);
  
  return {
    style: {
      background: factionColor,
      color: isLightColor ? '#000' : '#fff',
    },
  };
}

/**
 * Check if a color is light (for determining text color)
 * 
 * @param color - Hex color string
 * @returns True if color is light, false if dark
 */
function isColorLight(color: string): boolean {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if luminance is greater than 0.5 (light color)
  return luminance > 0.5;
}

