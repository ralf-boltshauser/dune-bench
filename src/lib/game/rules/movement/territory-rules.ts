/**
 * Territory-specific movement rules.
 * 
 * Handles territory validation, stronghold occupancy rules, and storm checks.
 */

import { Faction, TerritoryId, TerritoryType, STRONGHOLD_TERRITORIES, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionsOccupyingTerritory, isSectorInStorm } from '@/lib/game/state';
import { normalizeAndValidateTerritoryId, createTerritorySuggestionText } from './shared/territory-normalize';
import { createError, type ValidationError } from '../types';
import { createInvalidSectorError, createOccupancyError } from './shared/error-helpers';

// =============================================================================
// TERRITORY VALIDATION
// =============================================================================

/**
 * Validate a territory ID and return normalized version or error.
 */
export function validateTerritoryId(
  territoryId: TerritoryId | string,
  fieldName: string
): { normalized: TerritoryId | null; error: ValidationError | null } {
  return normalizeAndValidateTerritoryId(territoryId, fieldName);
}

/**
 * Validate a sector for a territory.
 */
export function validateSector(
  sector: number,
  territoryId: TerritoryId,
  fieldName: string = 'sector'
): { valid: boolean; error: ValidationError | null } {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory) {
    return {
      valid: false,
      error: createError('INVALID_TERRITORY', `Territory ${territoryId} not found`, { field: fieldName }),
    };
  }

  if (!territory.sectors.includes(sector) && territory.sectors.length > 0) {
    return {
      valid: false,
      error: createInvalidSectorError(sector, territory.name, territory.sectors, fieldName),
    };
  }

  return { valid: true, error: null };
}

/**
 * Create a territory not found error with fuzzy matching.
 */
export function createTerritoryNotFoundError(
  territoryId: string,
  fieldName: string,
  context?: string
): ValidationError {
  const suggestionText = createTerritorySuggestionText(territoryId);
  const contextText = context ? ` ${context}` : '';
  
  return createError(
    'INVALID_TERRITORY',
    `Territory "${territoryId}" does not exist.${suggestionText}${contextText}`,
    {
      field: fieldName,
      actual: territoryId,
      suggestion: 'Use lowercase territory ID with underscores (e.g., "carthag" not "Carthag" or "CARTHAG")',
    }
  );
}

// =============================================================================
// STRONGHOLD OCCUPANCY RULES
// =============================================================================

/**
 * Check if a faction can enter a stronghold.
 * Returns whether entry is allowed and an error if not.
 */
export function canEnterStronghold(
  state: GameState,
  territoryId: TerritoryId,
  faction: Faction
): { allowed: boolean; error: ValidationError | null } {
  if (!STRONGHOLD_TERRITORIES.includes(territoryId)) {
    return { allowed: true, error: null };
  }

  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  const occupants = getFactionsOccupyingTerritory(state, territoryId);
  
  if (occupants.length >= 2 && !occupants.includes(faction)) {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    const error = createOccupancyError(
      territory?.name || territoryId,
      occupants,
      'territoryId',
      'Choose a different stronghold or wait for battle resolution'
    );
    return { allowed: false, error };
  }

  return { allowed: true, error: null };
}

/**
 * Check if a faction can transit through a stronghold.
 * Used for pathfinding - cannot pass through if 2+ other factions.
 */
export function canTransitThroughStronghold(
  state: GameState,
  territoryId: TerritoryId,
  movingFaction: Faction,
  isDestination: boolean = false
): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory || territory.type !== TerritoryType.STRONGHOLD) {
    return true;
  }

  // Can always enter destination, but cannot transit through
  if (isDestination) {
    return true;
  }

  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  const factionsInTerritory = getFactionsOccupyingTerritory(state, territoryId);
  const otherFactions = factionsInTerritory.filter(f => f !== movingFaction);
  
  // Can't pass through if 2+ other factions
  return otherFactions.length < 2;
}

// =============================================================================
// STORM CHECKS
// =============================================================================

/**
 * Check if a territory can be passed through (not blocked by storm).
 * Used for pathfinding - can pass if at least one sector is not in storm.
 */
export function canPassThroughTerritory(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory) return false;

  // Protected territories can always be passed through
  if (territory.protectedFromStorm) return true;

  // Territories with no sectors can be passed through
  if (territory.sectors.length === 0) return true;

  // Can pass through if at least one sector is not in storm
  return territory.sectors.some((s) => !isSectorInStorm(state, s));
}

/**
 * Check if a territory is completely blocked by storm.
 */
export function isTerritoryBlockedByStorm(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  return !canPassThroughTerritory(state, territoryId);
}

