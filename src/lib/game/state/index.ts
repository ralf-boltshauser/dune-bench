/**
 * Public exports for game state management.
 * Import from '@/lib/game/state' to access state factory, queries, and mutations.
 */

// Factory
export {
  createGameState,
  shuffle,
  calculateStormOrder,
  getDefaultPlayerPositions,
  type CreateGameOptions,
} from './factory';

// Queries
export {
  getFactionState,
  getFactionSpice,
  getFactionHandSize,
  getFactionMaxHandSize,
  canFactionBid,
  getAvailableLeaders,
  hasAvailableLeaders,
  getLeadersInTanks,
  canReviveLeader,
  getReserveForceCount,
  getForcesInTerritory,
  getForceCountInTerritory,
  getFactionsInTerritory,
  getTotalForcesOnBoard,
  getForcesInTanks,
  isTerritoryInStorm,
  isSectorInStorm,
  getSpiceInTerritory,
  getStrongholdOccupancy,
  canShipToTerritory,
  getControlledStrongholds,
  getOccupiedStrongholds,
  checkStrongholdVictory,
  hasKaramaCard,
  hasCheapHero,
  getWeaponCards,
  getDefenseCards,
  areAllied,
  getAlly,
  getPublicFactionState,
  getFirstPlayer,
  getNextInStormOrder,
  isEarlierInStormOrder,
} from './queries';

// Mutations
export {
  logAction,
  advancePhase,
  advanceTurn,
  addSpice,
  removeSpice,
  transferSpice,
  addSpiceToTerritory,
  removeSpiceFromTerritory,
  destroySpiceInTerritory,
  shipForces,
  moveForces,
  sendForcesToTanks,
  reviveForces,
  killLeader,
  reviveLeader,
  markLeaderUsed,
  resetLeaderTurnState,
  drawTreacheryCard,
  discardTreacheryCard,
  formAlliance,
  breakAlliance,
  moveStorm,
  updateStormOrder,
  addDeal,
  removeDeal,
  recordWinAttempt,
} from './mutations';

// Force utilities
export {
  emptyForceCount,
  getTotalForces,
  isForceCountEmpty,
  addToForceCount,
  subtractFromForceCount,
  mergeForceCount,
  createForceStack,
  isStackEmpty,
  findStack,
  findStacksInTerritory,
  removeEmptyStacks,
  updateStackForces,
  addToStack,
  removeFromStack,
  moveStackForces,
  totalForcesOnBoard,
  getForcesAt,
} from './force-utils';
