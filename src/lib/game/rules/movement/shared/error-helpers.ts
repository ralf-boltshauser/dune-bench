/**
 * Common error creation patterns for movement and shipment validation.
 * Provides standardized error messages and structure.
 */

import { Faction } from '@/lib/game/types';
import { createError, type ValidationError } from '../../types';

// Re-export createError for convenience
export { createError };

/**
 * Create an insufficient forces error.
 */
export function createInsufficientForcesError(
  requested: number,
  available: number,
  location: string,
  fieldName: string = 'forceCount'
): ValidationError {
  return createError(
    'NO_FORCES_TO_MOVE',
    `Cannot move ${requested} forces, only ${available} available in ${location}`,
    {
      field: fieldName,
      actual: requested,
      expected: `1-${available}`,
      suggestion: available > 0 ? `Move ${available} forces instead` : 'No forces available',
    }
  );
}

/**
 * Create an insufficient reserves error.
 */
export function createInsufficientReservesError(
  requested: number,
  available: number
): ValidationError {
  return createError(
    'INSUFFICIENT_RESERVES',
    `Cannot ship ${requested} forces, only ${available} available in reserves`,
    {
      field: 'forceCount',
      actual: requested,
      expected: `1-${available}`,
      suggestion: available > 0 ? `Ship ${available} forces instead` : 'No forces available to ship',
    }
  );
}

/**
 * Create an insufficient spice error.
 */
export function createInsufficientSpiceError(
  cost: number,
  available: number,
  fieldName: string = 'forceCount',
  suggestion?: string
): ValidationError {
  return createError(
    'INSUFFICIENT_SPICE',
    `Costs ${cost} spice but you only have ${available}`,
    {
      field: fieldName,
      actual: cost,
      expected: `<= ${available}`,
      suggestion: suggestion || 'Not enough spice',
    }
  );
}

/**
 * Create an occupancy limit error.
 */
export function createOccupancyError(
  territoryName: string,
  occupants: Faction[],
  fieldName: string = 'territoryId',
  suggestion?: string
): ValidationError {
  return createError(
    'OCCUPANCY_LIMIT_EXCEEDED',
    `${territoryName} already has 2 factions occupying it`,
    {
      field: fieldName,
      actual: occupants,
      expected: 'Maximum 2 factions per stronghold',
      suggestion: suggestion || 'Choose a different territory or wait for an occupant to leave',
    }
  );
}

/**
 * Create an invalid sector error.
 */
export function createInvalidSectorError(
  sector: number,
  territoryName: string,
  validSectors: number[],
  fieldName: string = 'sector'
): ValidationError {
  return createError(
    'INVALID_TERRITORY',
    `Sector ${sector} is not part of ${territoryName}`,
    {
      field: fieldName,
      actual: sector,
      expected: validSectors,
      suggestion: `Use one of these sectors: ${validSectors.join(', ')}`,
    }
  );
}

