/**
 * Validation and resolution types for the rules engine.
 * Designed to be agent-friendly with clear errors and actionable suggestions.
 */

import { Faction, TerritoryId } from "../types";

// =============================================================================
// VALIDATION RESULT
// =============================================================================

/**
 * Result of validating a game action.
 * Provides detailed feedback for agents to understand and correct invalid actions.
 *
 * @template T - Type of suggestions (e.g., ShipmentSuggestion, MovementSuggestion)
 */
export interface ValidationResult<T = unknown> {
  /** Whether the action is valid and can be executed */
  valid: boolean;

  /** List of errors explaining why the action is invalid */
  errors: ValidationError[];

  /** Warnings about legal but potentially suboptimal choices */
  warnings: string[];

  /** Alternative valid actions the agent could take instead */
  suggestions?: T[];

  /** Additional context to help the agent make better decisions */
  context: Record<string, unknown>;
}

/**
 * Detailed error information for invalid actions.
 * Designed to help agents understand exactly what went wrong and how to fix it.
 */
export interface ValidationError {
  /** Machine-readable error code (e.g., "INSUFFICIENT_SPICE", "TERRITORY_IN_STORM") */
  code: ValidationErrorCode;

  /** Human-readable error message */
  message: string;

  /** Which parameter/field caused the error */
  field?: string;

  /** The value that was provided */
  actual?: unknown;

  /** What values would be valid (can be a range, list, or single value) */
  expected?: unknown;

  /** Specific suggestion for how to fix this error */
  suggestion?: string;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export type ValidationErrorCode =
  // General
  | "INVALID_FACTION"
  | "INVALID_TERRITORY"
  | "INVALID_PHASE"
  | "NOT_YOUR_TURN"

  // Movement/Shipment
  | "INSUFFICIENT_RESERVES"
  | "INSUFFICIENT_SPICE"
  | "INSUFFICIENT_FORCES"
  | "TERRITORY_IN_STORM"
  | "SECTOR_IN_STORM"
  | "SOURCE_IN_STORM"
  | "DESTINATION_IN_STORM"
  | "INVALID_DESTINATION"
  | "OCCUPANCY_LIMIT_EXCEEDED"
  | "NO_PATH_AVAILABLE"
  | "MOVEMENT_BLOCKED_BY_STORM"
  | "EXCEEDS_MOVEMENT_RANGE"
  | "NO_FORCES_TO_MOVE"
  | "CANNOT_SHIP_FROM_BOARD"
  | "CANNOT_SHIP_FIGHTERS_TO_ADVISORS"
  | "ALREADY_SHIPPED_THIS_TURN"
  | "ALREADY_MOVED_THIS_TURN"

  // Combat
  | "NO_FORCES_IN_TERRITORY"
  | "FORCES_DIALED_EXCEEDS_AVAILABLE"
  | "FORCES_DIALED_MINIMUM"
  | "NO_LEADER_AVAILABLE"
  | "LEADER_ALREADY_USED"
  | "LEADER_NOT_IN_POOL"
  | "INVALID_WEAPON_CARD"
  | "INVALID_DEFENSE_CARD"
  | "CARD_NOT_IN_HAND"
  | "MUST_PLAY_LEADER_OR_CHEAP_HERO"
  | "MUST_PLAY_LEADER"
  | "MUST_PLAY_CHEAP_HERO"
  | "MUST_ANNOUNCE_NO_LEADER"
  | "CANNOT_PLAY_TREACHERY_WITHOUT_LEADER"
  | "VOICE_VIOLATION"
  | "KH_NOT_ACTIVE"
  | "KH_ALREADY_USED"
  | "INVALID_SPICE_DIALING"

  // Revival
  | "REVIVAL_LIMIT_EXCEEDED"
  | "NO_FORCES_IN_TANKS"
  | "NO_LEADERS_IN_TANKS"
  | "CANNOT_REVIVE_LEADER_YET"
  | "LEADER_FACE_DOWN"
  | "ELITE_REVIVAL_LIMIT_EXCEEDED"
  | "ELITE_REVIVAL_ALREADY_USED"

  // Bidding
  | "HAND_FULL"
  | "BID_TOO_LOW"
  | "BID_EXCEEDS_SPICE"
  | "NOT_ELIGIBLE_TO_BID"
  | "ALREADY_PASSED"
  | "SELF_OUTBID_NOT_ALLOWED"

  // Alliance
  | "ALREADY_ALLIED"
  | "CANNOT_ALLY_DURING_PHASE"
  | "NO_NEXUS_OCCURRING"

  // Faction abilities
  | "ABILITY_NOT_AVAILABLE"
  | "ABILITY_ALREADY_USED"
  | "KARAMA_REQUIRED"
  | "INVALID_VOICE_COMMAND"
  | "INVALID_PRESCIENCE_TARGET"
  | "PRESCIENCE_COMMITMENT_VIOLATION";

// =============================================================================
// SUGGESTION TYPES
// =============================================================================

/** Suggested shipment action */
export interface ShipmentSuggestion {
  territoryId: TerritoryId;
  sector: number;
  forceCount: number;
  cost: number;
  isStronghold: boolean;
}

/** Suggested movement action */
export interface MovementSuggestion {
  fromTerritory: TerritoryId;
  fromSector: number;
  toTerritory: TerritoryId;
  toSector: number;
  forceCount: number;
  pathLength: number;
}

/** Suggested bid action */
export interface BidSuggestion {
  amount: number;
  remainingSpice: number;
  isMinimumBid: boolean;
}

/** Suggested revival action */
export interface RevivalSuggestion {
  regularForces: number;
  eliteForces: number;
  cost: number;
  isFreeRevival: boolean;
}

// =============================================================================
// BATTLE RESOLUTION
// =============================================================================

/** Complete result of a battle resolution */
export interface BattleResult {
  /** The faction that won the battle (null in two-traitors case) */
  winner: Faction | null;

  /** The faction that lost the battle (null in two-traitors case) */
  loser: Faction | null;

  /** Final battle total for the winner */
  winnerTotal: number;

  /** Final battle total for the loser */
  loserTotal: number;

  /** Whether the battle was decided by a traitor */
  traitorRevealed: boolean;

  /** Which faction revealed a traitor (if any) */
  traitorRevealedBy: Faction | null;

  /** Whether a lasgun/shield explosion occurred */
  lasgunjShieldExplosion: boolean;

  /** Whether both leaders were traitors (TWO TRAITORS rule) */
  twoTraitors?: boolean;

  /** Details about each side's resolution */
  aggressorResult: BattleSideResult;
  defenderResult: BattleSideResult;

  /** Spice payouts */
  spicePayouts: {
    faction: Faction;
    amount: number;
    reason: string;
  }[];

  /** Summary for logging/display */
  summary: string;
}

/** Result for one side of a battle */
export interface BattleSideResult {
  faction: Faction;

  /** Forces committed (dialed) */
  forcesDialed: number;

  /** Forces lost (goes to tanks) */
  forcesLost: number;

  /** Leader used (null if Cheap Hero or no leader) */
  leaderUsed: string | null;

  /** Whether the leader was killed */
  leaderKilled: boolean;

  /** Leader strength added to total (0 if killed) */
  leaderStrength: number;

  /** Whether Kwisatz Haderach was used (Atreides only) */
  kwisatzHaderachUsed: boolean;

  /** Weapon card played */
  weaponPlayed: string | null;

  /** Whether the weapon killed the opponent's leader */
  weaponEffective: boolean;

  /** Defense card played */
  defensePlayed: string | null;

  /** Whether the defense protected the leader */
  defenseEffective: boolean;

  /** Cards to discard after battle */
  cardsToDiscard: string[];

  /** Cards that can be kept */
  cardsToKeep: string[];

  /** Final battle total */
  total: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Create a successful validation result */
export function validResult<T>(
  context: Record<string, unknown> = {},
  warnings: string[] = []
): ValidationResult<T> {
  return {
    valid: true,
    errors: [],
    warnings,
    context,
  };
}

/** Create a failed validation result with errors */
export function invalidResult<T>(
  errors: ValidationError[],
  context: Record<string, unknown> = {},
  suggestions?: T[]
): ValidationResult<T> {
  return {
    valid: false,
    errors,
    warnings: [],
    suggestions,
    context,
  };
}

/** Create a single validation error */
export function createError(
  code: ValidationErrorCode,
  message: string,
  options: Partial<Omit<ValidationError, "code" | "message">> = {}
): ValidationError {
  return {
    code,
    message,
    ...options,
  };
}

/** Combine multiple validation results */
export function combineResults<T>(
  results: ValidationResult<T>[]
): ValidationResult<T> {
  const valid = results.every((r) => r.valid);
  const errors = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);
  const suggestions = results.flatMap((r) => r.suggestions ?? []);
  const context = results.reduce(
    (acc, r) => ({ ...acc, ...r.context }),
    {} as Record<string, unknown>
  );

  return {
    valid,
    errors,
    warnings,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    context,
  };
}
