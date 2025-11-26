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
  calculateShipmentCost,
  checkOrnithopterAccess,
  getMovementRange,
  findPath,
  getReachableTerritories,
} from './movement';

// Combat validation and resolution
export {
  type BattlePlanSuggestion,
  validateBattlePlan,
  resolveBattle,
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
