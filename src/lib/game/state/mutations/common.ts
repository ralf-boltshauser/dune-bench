/**
 * Shared utility functions for state mutations.
 * Single source of truth for common functionality used across all mutation modules.
 */

import {
  type GameState,
  type FactionState,
  type GameAction,
  type GameActionType,
  Faction,
} from '../../types';
import { getFactionState } from '../queries';

/**
 * Deep clone a Map
 */
function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(map);
}

/**
 * Update a faction's state immutably.
 * Core utility used by most mutations.
 * 
 * @param state - Current game state
 * @param faction - Faction whose state to update
 * @param updates - Partial faction state updates to apply
 * @returns New game state with updated faction state
 * @internal - Exported for use by other mutation modules only
 */
export function updateFactionState(
  state: GameState,
  faction: Faction,
  updates: Partial<FactionState>
): GameState {
  const newFactions = cloneMap(state.factions);
  const currentState = getFactionState(state, faction);
  newFactions.set(faction, { ...currentState, ...updates });
  return { ...state, factions: newFactions };
}

/**
 * Generate a unique action ID
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an action to the game state.
 * 
 * Creates a new action entry in the action log with a unique ID, timestamp,
 * and current turn/phase information.
 * 
 * @param state - Current game state
 * @param type - Type of action being logged
 * @param factionId - Faction that performed the action (null for system actions)
 * @param data - Additional action data
 * @returns New game state with action logged
 */
export function logAction(
  state: GameState,
  type: GameActionType,
  factionId: Faction | null,
  data: Record<string, unknown> = {}
): GameState {
  const action: GameAction = {
    id: generateActionId(),
    turn: state.turn,
    phase: state.phase,
    factionId,
    type,
    data,
    timestamp: Date.now(),
  };
  return {
    ...state,
    actionLog: [...state.actionLog, action],
  };
}

