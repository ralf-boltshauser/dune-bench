/**
 * Movement-specific types and interfaces.
 * 
 * Re-exports shared validation types and defines movement-specific types.
 */

import { TerritoryId } from '@/lib/game/types';
import type { ValidationResult, ValidationError } from '../types';

/**
 * Suggested movement action.
 * Provides alternative valid movements when the requested move is invalid.
 */
export interface MovementSuggestion {
  fromTerritory: TerritoryId;
  fromSector: number;
  toTerritory: TerritoryId;
  toSector: number;
  forceCount: number;
  pathLength: number;
}

/**
 * Context information provided with movement validation results.
 */
export interface MovementValidationContext {
  fromTerritory: TerritoryId;
  toTerritory: TerritoryId;
  forcesAvailable: number;
  requestedForces: number;
  hasOrnithopters: boolean;
  movementRange: number;
  stormSector: number;
  pathLength?: number;
  pathTerritories?: TerritoryId[];
  isRepositioning?: boolean;
}

// Re-export shared types for convenience
export type { ValidationResult, ValidationError } from '../types';

