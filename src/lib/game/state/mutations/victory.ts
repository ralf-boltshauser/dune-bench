/**
 * Victory tracking mutations.
 */

import { type GameState, Faction } from '../../types';

/**
 * Record a win attempt for tiebreaker tracking.
 */
export function recordWinAttempt(state: GameState, faction: Faction): GameState {
  const newAttempts = new Map(state.winAttempts);
  newAttempts.set(faction, (newAttempts.get(faction) || 0) + 1);
  return { ...state, winAttempts: newAttempts };
}

