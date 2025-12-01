/**
 * Constants for map visualization
 */

import { TerritoryType } from '@/lib/game/types/enums';
// Note: FACTION_COLORS should be imported from @/app/components/constants
// This file only contains map-specific constants

export const TERRITORY_COLORS: Record<TerritoryType, string> = {
  [TerritoryType.SAND]: '#F9DFA9',
  [TerritoryType.ROCK]: '#806959',
  [TerritoryType.POLAR_SINK]: '#ADF8FF',
  [TerritoryType.STRONGHOLD]: '#753D33',
};

export const STORM_COLOR = '#ef4444'; // red-500
export const STORM_OPACITY = '0.5';
export const STORM_SECTOR_COLOR = '#dc2626'; // red-600
export const STORM_SECTOR_STROKE_WIDTH = '5';
export const STORM_SECTOR_FILL_OPACITY = '0.5';

export const SPICE_BLOW_COLOR = '#fbbf24'; // amber-400
export const SPICE_BLOW_OPACITY = '0.7';

export const SPICE_COLOR = '#FFD700'; // Gold
export const SPICE_OPACITY = '0.3';

export const TURN_HIGHLIGHT_COLOR = '#FFD700'; // Gold
export const TURN_HIGHLIGHT_OPACITY = '0.6';
export const TURN_STROKE_COLOR = '#FFA500'; // Orange
export const TURN_TEXT_COLOR = '#FF6600'; // Orange

export const PLAYER_TOKEN_STROKE_WIDTH = '4';
export const PLAYER_TOKEN_FILL_OPACITY = '0.3';

// =============================================================================
// ANIMATION
// =============================================================================

export const SPICE_BLOW_BLINK_INTERVAL_MS = 500;

