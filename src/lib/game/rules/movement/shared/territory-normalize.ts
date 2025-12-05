/**
 * Territory ID normalization helpers.
 * Provides consistent territory validation with fuzzy matching suggestions.
 */

import { TerritoryId } from '@/lib/game/types';
import { normalizeTerritoryId, getAllTerritoryIds } from '../../../utils/territory-normalize';
import { createError, type ValidationError } from '../../types';

/**
 * Normalize and validate a territory ID with fuzzy matching suggestions.
 * Returns the normalized ID or creates an error with suggestions.
 */
export function normalizeAndValidateTerritoryId(
  territoryId: TerritoryId | string,
  fieldName: string
): { normalized: TerritoryId | null; error: ValidationError | null } {
  const normalized = normalizeTerritoryId(territoryId);
  
  if (!normalized) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(territoryId).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    
    const error = createError(
      'INVALID_TERRITORY',
      `Territory "${territoryId}" does not exist.${suggestionText} Valid territory IDs are lowercase with underscores (e.g., "carthag", "arrakeen", "the_great_flat").`,
      {
        field: fieldName,
        actual: territoryId,
        suggestion: 'Use lowercase territory ID with underscores (e.g., "carthag" not "Carthag" or "CARTHAG")',
      }
    );
    
    return { normalized: null, error };
  }
  
  return { normalized, error: null };
}

/**
 * Create territory suggestion text for fuzzy matching.
 */
export function createTerritorySuggestionText(territoryId: string): string {
  const suggestions = getAllTerritoryIds()
    .filter(id => id.toLowerCase().includes(territoryId.toLowerCase()))
    .slice(0, 3)
    .map(id => `"${id}"`)
    .join(', ');
  return suggestions ? ` Did you mean: ${suggestions}?` : '';
}

