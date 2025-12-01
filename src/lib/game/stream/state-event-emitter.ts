/**
 * State Event Emitter - Wraps state mutations to emit delta events
 *
 * This module provides event-emitting wrappers for state mutation functions.
 * When state changes, it emits events that can be streamed to the frontend.
 *
 * Key improvements:
 * - DRY helper functions for common patterns
 * - Synchronous mutations (no unnecessary async)
 * - Proper single-event emission for transfers
 */

import { eventStreamer } from './event-streamer';
import { StateDeltaEvent } from './types';
import type { GameState, Faction, TerritoryId } from '../types';
import { getFactionState } from '../state/queries';
import {
  addSpice as mutAddSpice,
  removeSpice as mutRemoveSpice,
  addSpiceToTerritory as mutAddSpiceToTerritory,
  removeSpiceFromTerritory as mutRemoveSpiceFromTerritory,
  shipForces as mutShipForces,
  moveForces as mutMoveForces,
  sendForcesToTanks as mutSendForcesToTanks,
  reviveForces as mutReviveForces,
  drawTreacheryCard as mutDrawTreacheryCard,
  discardTreacheryCard as mutDiscardTreacheryCard,
  formAlliance as mutFormAlliance,
  breakAlliance as mutBreakAlliance,
  moveStorm as mutMoveStorm,
  killLeader as mutKillLeader,
  reviveLeader as mutReviveLeader,
  transferSpice as mutTransferSpice,
} from '../state/mutations';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Emit an event without blocking the mutation
 * Fire-and-forget pattern to avoid making all mutations async
 */
function emitEvent<T>(
  type: StateDeltaEvent,
  gameId: string,
  data: T
): void {
  eventStreamer.emit(type, gameId, data).catch((error) => {
    console.error(`[StateEventEmitter] Failed to emit ${type}:`, error);
  });
}

// =============================================================================
// SPICE MUTATIONS
// =============================================================================

/**
 * Add spice to a faction and emit event
 */
export function addSpice(
  state: GameState,
  faction: Faction,
  amount: number,
  reason: string = 'unknown'
): GameState {
  const oldValue = getFactionState(state, faction).spice;
  const newState = mutAddSpice(state, faction, amount);
  const newValue = getFactionState(newState, faction).spice;

  emitEvent(StateDeltaEvent.FACTION_SPICE_CHANGED, state.gameId, {
    faction,
    oldValue,
    newValue,
    reason,
  });

  return newState;
}

/**
 * Remove spice from a faction and emit event
 */
export function removeSpice(
  state: GameState,
  faction: Faction,
  amount: number,
  reason: string = 'unknown'
): GameState {
  const oldValue = getFactionState(state, faction).spice;
  const newState = mutRemoveSpice(state, faction, amount);
  const newValue = getFactionState(newState, faction).spice;

  emitEvent(StateDeltaEvent.FACTION_SPICE_CHANGED, state.gameId, {
    faction,
    oldValue,
    newValue,
    reason,
  });

  return newState;
}

/**
 * Transfer spice between factions and emit a single transfer event
 * (Not two separate add/remove events)
 */
export function transferSpice(
  state: GameState,
  from: Faction,
  to: Faction,
  amount: number,
  reason: string = 'transfer'
): GameState {
  const fromOldValue = getFactionState(state, from).spice;
  const toOldValue = getFactionState(state, to).spice;

  // Use the actual transfer mutation
  const newState = mutTransferSpice(state, from, to, amount);

  const fromNewValue = getFactionState(newState, from).spice;
  const toNewValue = getFactionState(newState, to).spice;

  // Emit single event for the sender
  emitEvent(StateDeltaEvent.FACTION_SPICE_CHANGED, state.gameId, {
    faction: from,
    oldValue: fromOldValue,
    newValue: fromNewValue,
    reason: `${reason} (to ${to})`,
  });

  // Emit single event for the receiver
  emitEvent(StateDeltaEvent.FACTION_SPICE_CHANGED, state.gameId, {
    faction: to,
    oldValue: toOldValue,
    newValue: toNewValue,
    reason: `${reason} (from ${from})`,
  });

  return newState;
}

/**
 * Add spice to territory and emit event
 */
export function addSpiceToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): GameState {
  const newState = mutAddSpiceToTerritory(state, territoryId, sector, amount);

  emitEvent(StateDeltaEvent.SPICE_BOARD_CHANGED, state.gameId, {
    territory: territoryId,
    sector,
    amount,
    action: 'added' as const,
  });

  return newState;
}

/**
 * Remove spice from territory and emit event
 */
export function removeSpiceFromTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): GameState {
  const newState = mutRemoveSpiceFromTerritory(state, territoryId, sector, amount);

  emitEvent(StateDeltaEvent.SPICE_BOARD_CHANGED, state.gameId, {
    territory: territoryId,
    sector,
    amount,
    action: 'removed' as const,
  });

  return newState;
}

// =============================================================================
// FORCE MUTATIONS
// =============================================================================

/**
 * Helper to emit force change event
 */
function emitForceChange(
  gameId: string,
  faction: Faction,
  territory: string,
  sector: number,
  regularDelta: number,
  eliteDelta: number,
  reason: string
): void {
  emitEvent(StateDeltaEvent.FACTION_FORCES_CHANGED, gameId, {
    faction,
    territory,
    sector,
    regularDelta,
    eliteDelta,
    reason,
  });
}

/**
 * Ship forces and emit event
 */
export function shipForces(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number,
  isElite: boolean = false,
  isAdvisor: boolean = false
): GameState {
  const newState = mutShipForces(state, faction, territoryId, sector, count, isElite, isAdvisor);

  emitForceChange(
    state.gameId,
    faction,
    territoryId,
    sector,
    isElite ? 0 : count,
    isElite ? count : 0,
    'shipped'
  );

  return newState;
}

/**
 * Move forces and emit events for both source and destination
 */
export function moveForces(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const newState = mutMoveForces(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    count,
    isElite
  );

  // Emit removal from source
  emitForceChange(
    state.gameId,
    faction,
    fromTerritory,
    fromSector,
    isElite ? 0 : -count,
    isElite ? -count : 0,
    'moved_from'
  );

  // Emit addition to destination
  emitForceChange(
    state.gameId,
    faction,
    toTerritory,
    toSector,
    isElite ? 0 : count,
    isElite ? count : 0,
    'moved_to'
  );

  return newState;
}

/**
 * Send forces to tanks (killed) and emit event
 */
export function sendForcesToTanks(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const newState = mutSendForcesToTanks(state, faction, territoryId, sector, count, isElite);

  emitForceChange(
    state.gameId,
    faction,
    territoryId,
    sector,
    isElite ? 0 : -count,
    isElite ? -count : 0,
    'killed'
  );

  return newState;
}

/**
 * Revive forces and emit event
 */
export function reviveForces(
  state: GameState,
  faction: Faction,
  count: number,
  isElite: boolean = false
): GameState {
  const newState = mutReviveForces(state, faction, count, isElite);

  emitForceChange(
    state.gameId,
    faction,
    'reserves',
    0,
    isElite ? 0 : count,
    isElite ? count : 0,
    'revived'
  );

  return newState;
}

// =============================================================================
// CARD MUTATIONS
// =============================================================================

/**
 * Draw treachery card and emit event
 */
export function drawTreacheryCard(
  state: GameState,
  faction: Faction
): GameState {
  const newState = mutDrawTreacheryCard(state, faction);
  const factionState = getFactionState(newState, faction);
  const lastCard = factionState.hand[factionState.hand.length - 1];

  if (lastCard) {
    emitEvent(StateDeltaEvent.FACTION_CARD_ADDED, state.gameId, {
      faction,
      cardId: lastCard.definitionId,
      source: 'deck',
      cardType: lastCard.type,
    });
  }

  return newState;
}

/**
 * Discard treachery card and emit event
 */
export function discardTreacheryCard(
  state: GameState,
  faction: Faction,
  cardId: string,
  reason: string = 'discarded'
): GameState {
  const newState = mutDiscardTreacheryCard(state, faction, cardId);

  emitEvent(StateDeltaEvent.FACTION_CARD_REMOVED, state.gameId, {
    faction,
    cardId,
    destination: 'discard',
    reason,
  });

  return newState;
}

// =============================================================================
// ALLIANCE MUTATIONS
// =============================================================================

/**
 * Form alliance and emit event
 */
export function formAlliance(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): GameState {
  const newState = mutFormAlliance(state, faction1, faction2);

  emitEvent(StateDeltaEvent.ALLIANCE_CHANGED, state.gameId, {
    type: 'formed' as const,
    factions: [faction1, faction2],
    details: { turn: state.turn },
  });

  return newState;
}

/**
 * Break alliance and emit event
 */
export function breakAlliance(
  state: GameState,
  faction: Faction
): GameState {
  const factionState = getFactionState(state, faction);
  const allyId = factionState.allyId;

  if (!allyId) {
    return state;
  }

  const newState = mutBreakAlliance(state, faction);

  emitEvent(StateDeltaEvent.ALLIANCE_CHANGED, state.gameId, {
    type: 'broken' as const,
    factions: [faction, allyId],
    details: { turn: state.turn },
  });

  return newState;
}

// =============================================================================
// STORM MUTATIONS
// =============================================================================

/**
 * Move storm and emit event
 */
export function moveStorm(
  state: GameState,
  newSector: number,
  movement: number
): GameState {
  const oldSector = state.stormSector;
  const newState = mutMoveStorm(state, newSector);

  emitEvent(StateDeltaEvent.STORM_POSITION_CHANGED, state.gameId, {
    oldSector,
    newSector: newState.stormSector,
    movement,
  });

  return newState;
}

// =============================================================================
// LEADER MUTATIONS
// =============================================================================

/**
 * Kill leader and emit event
 */
export function killLeader(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const newState = mutKillLeader(state, faction, leaderId);

  emitEvent(StateDeltaEvent.FACTION_LEADER_STATUS, state.gameId, {
    faction,
    leaderId,
    newStatus: 'killed',
    details: { location: 'tanks' },
  });

  return newState;
}

/**
 * Revive leader and emit event
 */
export function reviveLeader(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const newState = mutReviveLeader(state, faction, leaderId);

  emitEvent(StateDeltaEvent.FACTION_LEADER_STATUS, state.gameId, {
    faction,
    leaderId,
    newStatus: 'revived',
    details: { location: 'leader_pool' },
  });

  return newState;
}
