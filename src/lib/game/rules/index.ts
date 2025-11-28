/**
 * Public exports for the rules validation engine.
 * Import from '@/lib/game/rules' to access all validation functions.
 */

// Types
export {
  type ValidationResult,
  type ValidationError,
  type ValidationErrorCode,
  type ShipmentSuggestion,
  type MovementSuggestion,
  type BidSuggestion,
  type RevivalSuggestion,
  type BattleResult,
  type BattleSideResult,
  validResult,
  invalidResult,
  createError,
  combineResults,
} from './types';

// Movement validation
export {
  validateShipment,
  validateMovement,
  validateCrossShip,
  validateOffPlanetShipment,
  calculateShipmentCost,
  checkOrnithopterAccess,
  getMovementRange,
  getMovementRangeForFaction,
  findPath,
  getReachableTerritories,
  getTerritoriesWithinDistance,
} from './movement';

// Combat validation and resolution
export {
  type BattlePlanSuggestion,
  validateBattlePlan,
  resolveBattle,
  resolveTwoTraitorsBattle,
  canCallTraitor,
} from './combat';

// Revival validation
export {
  type RevivalLimits,
  type LeaderRevivalSuggestion,
  getRevivalLimits,
  validateForceRevival,
  validateLeaderRevival,
} from './revival';

// Bidding validation
export {
  validateBiddingEligibility,
  validateBid,
  validateAllyBidSupport,
  getEligibleBidders,
  getStartingBidder,
} from './bidding';

// Victory checks
export {
  checkVictoryConditions,
  checkFremenSpecialVictory,
  checkGuildSpecialVictory,
  getVictoryContext,
} from './victory';
