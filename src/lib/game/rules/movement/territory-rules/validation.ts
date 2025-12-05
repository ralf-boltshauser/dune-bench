/**
 * Territory validation helpers.
 * Single source of truth for territory and sector validation.
 */

import { TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import { normalizeAndValidateTerritoryId, createTerritorySuggestionText } from '../shared/territory-normalize';
import { createError, type ValidationError } from '../../types';
import { createInvalidSectorError } from '../shared/error-helpers';

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

