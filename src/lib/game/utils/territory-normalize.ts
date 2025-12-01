/**
 * Territory ID normalization utilities.
 * 
 * Makes territory IDs case-insensitive for easier use by MCP tools and agents.
 * All territory IDs are stored in lowercase in the enum, but we accept any case.
 */

import { TerritoryId, TERRITORY_DEFINITIONS } from '../types';

/**
 * Normalize a territory ID string to the canonical lowercase format.
 * Returns the matching TerritoryId enum value if found, or null if invalid.
 * 
 * @param input - Territory ID in any case (e.g., "Carthag", "CARTHAG", "carthag")
 * @returns Normalized TerritoryId or null if not found
 */
export function normalizeTerritoryId(input: string | TerritoryId | null | undefined): TerritoryId | null {
  if (!input) return null;
  
  // Convert to lowercase string
  const normalized = String(input).toLowerCase().trim();
  
  // Check if it matches any territory ID
  if (normalized in TERRITORY_DEFINITIONS) {
    return normalized as TerritoryId;
  }
  
  // Try to find by matching the value (handles enum values)
  for (const territoryId of Object.values(TerritoryId)) {
    if (territoryId.toLowerCase() === normalized) {
      return territoryId;
    }
  }
  
  return null;
}

/**
 * Normalize a territory ID and throw an error if invalid.
 * Useful for validation functions that require a valid territory.
 * 
 * @param input - Territory ID in any case
 * @param context - Context for error message (e.g., "fromTerritory", "toTerritory")
 * @returns Normalized TerritoryId
 * @throws Error if territory ID is invalid
 */
export function normalizeTerritoryIdOrThrow(
  input: string | TerritoryId | null | undefined,
  context: string = 'territory'
): TerritoryId {
  const normalized = normalizeTerritoryId(input);
  
  if (!normalized) {
    // Provide helpful error with suggestions
    const suggestions = getTerritorySuggestions(String(input || ''));
    const suggestionText = suggestions.length > 0
      ? ` Did you mean: ${suggestions.join(', ')}?`
      : '';
    
    throw new Error(
      `Invalid ${context} ID: "${input}".${suggestionText} ` +
      `Valid territory IDs are lowercase with underscores (e.g., "carthag", "arrakeen", "the_great_flat").`
    );
  }
  
  return normalized;
}

/**
 * Get territory ID suggestions based on input (fuzzy matching).
 * Helps agents find the correct territory ID when they make typos.
 */
function getTerritorySuggestions(input: string): string[] {
  const normalized = input.toLowerCase().trim();
  const suggestions: string[] = [];
  
  // Exact match (case-insensitive)
  for (const territoryId of Object.values(TerritoryId)) {
    if (territoryId.toLowerCase() === normalized) {
      return [territoryId]; // Return exact match immediately
    }
  }
  
  // Partial matches
  for (const territoryId of Object.values(TerritoryId)) {
    const territoryName = TERRITORY_DEFINITIONS[territoryId]?.name || territoryId;
    
    // Check if input is contained in territory ID or name
    if (
      territoryId.toLowerCase().includes(normalized) ||
      territoryName.toLowerCase().includes(normalized) ||
      normalized.includes(territoryId.toLowerCase())
    ) {
      suggestions.push(territoryId);
    }
  }
  
  // Limit to 5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Get all valid territory IDs as an array.
 * Useful for error messages and suggestions.
 */
export function getAllTerritoryIds(): TerritoryId[] {
  return Object.values(TerritoryId);
}

/**
 * Get territory name from ID (for error messages).
 */
export function getTerritoryName(territoryId: TerritoryId | string | null | undefined): string {
  const normalized = normalizeTerritoryId(territoryId);
  if (!normalized) return String(territoryId || 'unknown');
  
  return TERRITORY_DEFINITIONS[normalized]?.name || normalized;
}

