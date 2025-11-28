/**
 * Tool System Types
 *
 * Core type definitions for the AI agent tool system.
 * Tools wrap game validation and state mutation functions
 * for use with Vercel AI SDK agents.
 */

import type { Faction, TerritoryId, GameState } from '../types';
import { Phase } from '../types';

// =============================================================================
// TOOL EXECUTION CONTEXT
// =============================================================================

/**
 * Context provided to every tool execution.
 * Contains everything a tool needs to validate and execute actions.
 */
export interface ToolContext {
  /** Current game state (immutable - tools return new state) */
  state: GameState;

  /** The faction executing this tool */
  faction: Faction;

  /** Current game phase */
  phase: Phase;

  /** Callback to update game state after successful action */
  updateState: (newState: GameState) => void;
}

/**
 * Factory function type for creating tool context.
 */
export type ToolContextFactory = () => ToolContext;

// =============================================================================
// TOOL RESULT TYPES
// =============================================================================

/**
 * Result returned by all tools.
 * Provides consistent structure for AI to understand outcomes.
 */
export interface ToolResult<T = unknown> {
  /** Whether the action succeeded */
  success: boolean;

  /** Result data on success */
  data?: T;

  /** Error details on failure */
  error?: ToolError;

  /** Human-readable message for the AI */
  message: string;

  /** Whether the game state was modified */
  stateUpdated: boolean;
}

/**
 * Structured error information for AI agents.
 */
export interface ToolError {
  /** Machine-readable error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Suggestion for how to fix the error */
  suggestion?: string;

  /** The field that caused the error */
  field?: string;

  /** The invalid value that was provided */
  providedValue?: unknown;

  /** Valid range or options */
  validRange?: {
    min?: number;
    max?: number;
    options?: string[];
  };
}

// =============================================================================
// TOOL CATEGORIES
// =============================================================================

/**
 * Categories of tools available to agents.
 */
export enum ToolCategory {
  /** Read-only information tools */
  INFORMATION = 'information',

  /** Setup phase actions (traitor selection, BG prediction) */
  SETUP = 'setup',

  /** Storm phase actions */
  STORM = 'storm',

  /** Bidding phase actions */
  BIDDING = 'bidding',

  /** Revival phase actions */
  REVIVAL = 'revival',

  /** Shipment phase actions */
  SHIPMENT = 'shipment',

  /** Movement phase actions */
  MOVEMENT = 'movement',

  /** Battle phase actions */
  BATTLE = 'battle',

  /** Nexus/Alliance actions */
  NEXUS = 'nexus',
}

/**
 * Maps phases to their available tool categories.
 */
export const PHASE_TO_TOOL_CATEGORY: Record<Phase, ToolCategory[]> = {
  [Phase.SETUP]: [ToolCategory.INFORMATION, ToolCategory.SETUP],
  [Phase.STORM]: [ToolCategory.INFORMATION, ToolCategory.STORM],
  [Phase.SPICE_BLOW]: [ToolCategory.INFORMATION, ToolCategory.NEXUS],
  [Phase.CHOAM_CHARITY]: [ToolCategory.INFORMATION],
  [Phase.BIDDING]: [ToolCategory.INFORMATION, ToolCategory.BIDDING],
  [Phase.REVIVAL]: [ToolCategory.INFORMATION, ToolCategory.REVIVAL],
  [Phase.SHIPMENT_MOVEMENT]: [
    ToolCategory.INFORMATION,
    ToolCategory.SHIPMENT,
    ToolCategory.MOVEMENT,
  ],
  [Phase.BATTLE]: [ToolCategory.INFORMATION, ToolCategory.BATTLE],
  [Phase.SPICE_COLLECTION]: [], // Automatic phase - no tools needed
  [Phase.MENTAT_PAUSE]: [ToolCategory.INFORMATION, ToolCategory.NEXUS],
};

// =============================================================================
// INFORMATION TOOL RESULT TYPES
// =============================================================================

/**
 * Game state summary for AI consumption.
 */
export interface GameStateSummary {
  turn: number;
  phase: Phase;
  stormSector: number;
  stormOrder: Faction[];
  factionCount: number;
  activeAlliances: Array<{ factions: [Faction, Faction] }>;
  strongholdControl: Record<string, Faction | null>;
  spiceOnBoard: Array<{ territory: TerritoryId; sector: number; amount: number }>;
}

/**
 * Faction-specific information.
 */
export interface FactionInfo {
  faction: Faction;
  spice: number;
  spiceBribes: number;
  reserveForces: { regular: number; elite: number };
  forcesOnBoard: Array<{
    territory: TerritoryId;
    sector: number;
    regular: number;
    elite: number;
  }>;
  forcesInTanks: { regular: number; elite: number };
  leaders: Array<{
    id: string;
    name: string;
    strength: number;
    location: string;
    canBeUsedInBattle: boolean;
  }>;
  handSize: number;
  maxHandSize: number;
  allyId: Faction | null;
  controlledStrongholds: TerritoryId[];
}

/**
 * Territory information.
 */
export interface TerritoryInfo {
  id: TerritoryId;
  name: string;
  type: string;
  sectors: number[];
  inStorm: boolean;
  spice: number;
  occupants: Array<{
    faction: Faction;
    sector: number;
    regular: number;
    elite: number;
  }>;
  isStronghold: boolean;
  canShipTo: boolean;
  canMoveTo: boolean;
}

/**
 * Valid actions summary for current context.
 */
export interface ValidActionsInfo {
  phase: Phase;
  canAct: boolean;
  availableActions: string[];
  context: Record<string, unknown>;
}

// =============================================================================
// ACTION TOOL PARAMETER TYPES
// =============================================================================

/**
 * Storm dial parameters.
 */
export interface StormDialParams {
  dial: number;
}

/**
 * Bidding parameters.
 */
export interface BidParams {
  amount: number;
}

/**
 * Revival parameters.
 */
export interface ReviveForceParams {
  count: number;
}

export interface ReviveLeaderParams {
  leaderId: string;
}

/**
 * Shipment parameters.
 */
export interface ShipForcesParams {
  territoryId: string;
  sector: number;
  count: number;
  useElite?: boolean;
}

/**
 * Movement parameters.
 */
export interface MoveForcesParams {
  fromTerritoryId: string;
  fromSector: number;
  toTerritoryId: string;
  toSector: number;
  count: number;
}

/**
 * Battle plan parameters.
 */
export interface BattlePlanParams {
  leaderId: string | null;
  forcesDialed: number;
  weaponCardId: string | null;
  defenseCardId: string | null;
  useKwisatzHaderach?: boolean;
  useCheapHero?: boolean;
}

/**
 * Battle choice parameters (for aggressor).
 */
export interface ChooseBattleParams {
  territoryId: string;
  opponentFaction: string;
}

/**
 * Traitor call parameters.
 */
export interface CallTraitorParams {
  leaderId: string;
}

/**
 * Alliance parameters.
 */
export interface AllianceParams {
  targetFaction: string;
}

// =============================================================================
// TOOL DEFINITION HELPERS
// =============================================================================

/**
 * Helper to create successful tool result.
 */
export function successResult<T>(
  message: string,
  data?: T,
  stateUpdated = true
): ToolResult<T> {
  return {
    success: true,
    data,
    message,
    stateUpdated,
  };
}

/**
 * Helper to create failed tool result.
 */
export function failureResult(
  message: string,
  error: ToolError,
  stateUpdated = false
): ToolResult<never> {
  return {
    success: false,
    error,
    message,
    stateUpdated,
  };
}

/**
 * Helper to convert validation errors to tool errors.
 */
export function validationToToolError(
  validationError: {
    code: string;
    message: string;
    suggestion?: string;
    field?: string;
    actual?: unknown;
    expected?: unknown;
  }
): ToolError {
  // Extract min/max from expected if it's an object with those properties
  let validRange: { min?: number; max?: number } | undefined;
  if (validationError.expected && typeof validationError.expected === 'object') {
    const exp = validationError.expected as Record<string, unknown>;
    if ('min' in exp || 'max' in exp) {
      validRange = {
        min: typeof exp.min === 'number' ? exp.min : undefined,
        max: typeof exp.max === 'number' ? exp.max : undefined,
      };
    }
  }

  return {
    code: validationError.code,
    message: validationError.message,
    suggestion: validationError.suggestion,
    field: validationError.field,
    providedValue: validationError.actual,
    validRange,
  };
}
