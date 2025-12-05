/**
 * Storm Validation Utilities
 * 
 * Single source of truth for storm-related validation rules.
 * 
 * @rule 1.01.04 - OBSTRUCTION: Forces may not Ship/Send/Move into, out of, or through a Sector in Storm.
 * 
 * Rule References:
 * - 1.01.04: Base storm obstruction rule (movement/shipment restrictions)
 * - 1.06.03.05: Storm movement restrictions (detailed implementation)
 * - 1.06.02.04: Storm shipment restrictions (detailed implementation)
 * - 2.04.17: Fremen exception (can move through storm)
 */

import { Faction, TerritoryId, type GameState, TERRITORY_DEFINITIONS } from '../types';
import { isSectorInStorm } from '../state';
import { createError, type ValidationError } from './types';

// =============================================================================
// STORM VALIDATION HELPERS
// =============================================================================

/**
 * Check if a faction can move through storm sectors.
 * 
 * Rule 2.04.17: Fremen can move through storm (their ability supersedes base rule).
 * 
 * @param faction The faction attempting movement
 * @returns true if faction can move through storm, false otherwise
 */
export function canMoveThroughStorm(faction: Faction): boolean {
  return faction === Faction.FREMEN;
}

/**
 * Check if a territory is protected from storm (e.g., Polar Sink).
 * 
 * @param territoryId The territory to check
 * @returns true if territory is protected from storm
 */
export function isTerritoryProtectedFromStorm(territoryId: TerritoryId): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  return territory?.protectedFromStorm ?? false;
}

/**
 * Find a safe sector (not in storm) within a territory.
 * 
 * @param state Game state
 * @param territoryId Territory to search
 * @returns Safe sector number, or undefined if all sectors are in storm
 */
export function findSafeSector(
  state: GameState,
  territoryId: TerritoryId
): number | undefined {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory) return undefined;
  
  return territory.sectors.find((s) => !isSectorInStorm(state, s));
}

// =============================================================================
// STORM VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate that a source sector is not in storm (for movement OUT OF).
 * 
 * Rule 1.06.03.05: Cannot move OUT OF storm sector
 * Exception: Fremen can move through storm (Rule 2.04.17)
 * Exception: Polar Sink (has no sectors, so never in storm)
 * 
 * @param state Game state
 * @param faction Faction attempting movement
 * @param territoryId Source territory
 * @param sector Source sector
 * @returns Validation error if invalid, null if valid
 */
export function validateSourceSectorNotInStorm(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number
): ValidationError | null {
  // Fremen exception: can move through storm
  if (canMoveThroughStorm(faction)) {
    return null;
  }

  // Polar Sink exemption: has no sectors, so never in storm (Rule 1.06.03.07)
  // Other protected territories (e.g., strongholds) can still have sectors in storm
  // Protection prevents destruction, but movement restrictions still apply
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (territory && territory.sectors.length === 0) {
    // Polar Sink has no sectors - can never be in storm, so always exempt
    return null;
  }

  // Check if sector is in storm
  if (isSectorInStorm(state, sector)) {
    return createError(
      'SOURCE_IN_STORM',
      `Cannot move forces out of sector ${sector} - it is in the storm`,
      {
        field: 'fromSector',
        suggestion: 'Forces in storm sectors cannot move until the storm moves away (Fremen can move through storm)',
      }
    );
  }

  return null;
}

/**
 * @rule 1.06.05.06 STORM: As defined above in the Storm Phase section, no Force may Move into, out of, or through a Sector in storm.
 * @rule 1.06.06 SAFE HAVEN: The Polar Sink is never in storm.
 * Validate that a destination sector is not in storm (for movement INTO or shipment).
 * Exception: Polar Sink (has no sectors, so never in storm)
 * 
 * @param state Game state
 * @param territoryId Destination territory
 * @param sector Destination sector
 * @param fieldName Field name for error reporting (default: 'toSector')
 * @param context Context for error message (e.g., 'reposition to', 'ship to')
 * @returns Validation error if invalid, null if valid
 */
export function validateDestinationSectorNotInStorm(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  fieldName: string = 'toSector',
  context: string = 'move to'
): ValidationError | null {
  // Fremen exception: can move through storm (movement INTO / THROUGH allowed)
  // Note: Shipment still uses validateSectorNotInStorm separately.
  if (fieldName === 'toSector' && canMoveThroughStorm(Faction.FREMEN as Faction)) {
    // The caller must still decide based on faction; this function is faction-agnostic.
    // Fremen-specific callers should skip calling this or treat errors as non-fatal.
  }

  // Polar Sink exemption: has no sectors, so never in storm (Rule 1.06.03.07)
  // Other protected territories can still have sectors in storm
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (territory && territory.sectors.length === 0) {
    // Polar Sink has no sectors - can never be in storm, so always exempt
    return null;
  }

  // Check if sector is in storm
  if (isSectorInStorm(state, sector)) {
    const safeSector = findSafeSector(state, territoryId);
    
    const errorCode = fieldName === 'toSector' ? 'DESTINATION_IN_STORM' : 'SECTOR_IN_STORM';
    const message = fieldName === 'toSector'
      ? 'Cannot reposition to sector in storm'
      : `Cannot ${context} sector ${sector} - it is currently in the storm`;
    
    return createError(
      errorCode,
      message,
      {
        field: fieldName,
        actual: sector,
        suggestion: safeSector !== undefined 
          ? `Use sector ${safeSector} instead` 
          : territory?.sectors.length === 1 
            ? 'Destination fully blocked by storm'
            : 'All sectors in storm',
      }
    );
  }

  return null;
}

/**
 * Validate that a sector is not in storm (generic check for shipment).
 * 
 * Rule 1.06.02.04: No player may Ship into or out of a Sector in Storm
 * 
 * @param state Game state
 * @param territoryId Territory containing the sector
 * @param sector Sector to validate
 * @returns Validation error if invalid, null if valid
 */
export function validateSectorNotInStorm(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): ValidationError | null {
  return validateDestinationSectorNotInStorm(
    state,
    territoryId,
    sector,
    'sector',
    'ship to'
  );
}

