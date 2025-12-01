/**
 * Centralized faction colors for use across the entire codebase.
 * Used in terminal output, web UI, and all visualizations.
 */

import { Faction } from '../types/enums';

// =============================================================================
// ANSI COLOR CODES (for terminal output)
// =============================================================================

const ANSI_COLORS = {
  // Reset
  reset: '\x1b[0m',

  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

// =============================================================================
// WEB COLORS (hex codes for UI/visualizations)
// =============================================================================

/**
 * Faction colors for web UI (hex codes)
 * Used in React components, SVG visualizations, etc.
 */
export const FACTION_COLORS_WEB: Record<Faction, string> = {
  [Faction.FREMEN]: '#FBBF24',        // yellow (amber-400)
  [Faction.ATREIDES]: '#10B981',      // green (emerald-500)
  [Faction.BENE_GESSERIT]: '#3B82F6', // blue (blue-500)
  [Faction.EMPEROR]: '#EF4444',       // red (red-500)
  [Faction.SPACING_GUILD]: '#F97316', // orange (orange-500)
  [Faction.HARKONNEN]: '#000000',     // black
};

// =============================================================================
// TERMINAL COLORS (ANSI codes for console output)
// =============================================================================

/**
 * Faction colors for terminal output (ANSI codes)
 * Used in logger, console output, etc.
 * Note: ANSI doesn't support true orange, so spacing guild uses brightRed as the closest approximation.
 * Emperor uses regular red to differentiate from spacing guild's brightRed.
 */
export const FACTION_COLORS_TERMINAL: Record<Faction, string> = {
  [Faction.FREMEN]: ANSI_COLORS.brightYellow,        // yellow
  [Faction.ATREIDES]: ANSI_COLORS.brightGreen,        // green
  [Faction.BENE_GESSERIT]: ANSI_COLORS.brightBlue,    // blue
  [Faction.EMPEROR]: ANSI_COLORS.red,                // red (regular red to differentiate from spacing guild)
  [Faction.SPACING_GUILD]: ANSI_COLORS.brightRed,     // orange (ANSI approximation - closest to orange)
  [Faction.HARKONNEN]: ANSI_COLORS.black,             // black
};

/**
 * Faction background colors for terminal output (ANSI codes)
 * Used for badges, highlights, etc.
 * Note: ANSI doesn't support true orange, so spacing guild uses bgRed as the closest approximation.
 * Emperor uses regular bgRed to differentiate from spacing guild's bright background.
 */
export const FACTION_BG_COLORS_TERMINAL: Record<Faction, string> = {
  [Faction.FREMEN]: ANSI_COLORS.bgYellow,
  [Faction.ATREIDES]: ANSI_COLORS.bgGreen,
  [Faction.BENE_GESSERIT]: ANSI_COLORS.bgBlue,
  [Faction.EMPEROR]: ANSI_COLORS.bgRed,              // regular red background
  [Faction.SPACING_GUILD]: ANSI_COLORS.bgRed,        // orange (ANSI approximation - same as emperor, limitation of ANSI)
  [Faction.HARKONNEN]: ANSI_COLORS.bgBlack,
};

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use FACTION_COLORS_WEB instead
 * Kept for backward compatibility during migration
 */
export const FACTION_COLORS = FACTION_COLORS_WEB;

// =============================================================================
// ANSI COLOR UTILITIES (exported for logger use)
// =============================================================================

export const ANSI_RESET = ANSI_COLORS.reset;
export const ANSI_BOLD = ANSI_COLORS.bold;
export const ANSI_DIM = ANSI_COLORS.dim;
export const ANSI_WHITE = ANSI_COLORS.white;
export const ANSI_BLACK = ANSI_COLORS.black;
export const ANSI_YELLOW = ANSI_COLORS.yellow;
export const ANSI_CYAN = ANSI_COLORS.cyan;
export const ANSI_GREEN = ANSI_COLORS.green;
export const ANSI_RED = ANSI_COLORS.red;
export const ANSI_BRIGHT_BLACK = ANSI_COLORS.brightBlack;

