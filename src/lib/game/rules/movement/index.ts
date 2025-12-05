/**
 * Movement and shipment validation rules.
 * 
 * This module provides all movement and shipment validation functions,
 * organized into smaller, maintainable sub-modules.
 * 
 * @module movement
 */

// Movement validation
export {
  validateMovement,
  generateMovementSuggestions,
} from './validation';

// Movement execution
export {
  executeMovement,
  moveForces,
} from './execution';

// Ornithopter access and range
export {
  checkOrnithopterAccess,
  getMovementRange,
  getMovementRangeForFaction,
} from './ornithopter';

// Pathfinding
export {
  findPath,
  getReachableTerritories,
  getTerritoriesWithinDistance,
} from './paths';

// Territory rules
export {
  validateTerritoryId,
  validateSector,
  createTerritoryNotFoundError,
  canEnterStronghold,
  canTransitThroughStronghold,
  canPassThroughTerritory,
  isTerritoryBlockedByStorm,
} from './territory-rules';

// Types
export type {
  MovementSuggestion,
  MovementValidationContext,
  ValidationResult,
  ValidationError,
} from './types';

// Shipment validation (keep for backward compatibility)
export {
  validateShipment,
  validateCrossShip,
  validateOffPlanetShipment,
  calculateShipmentCost,
} from './shipment';
