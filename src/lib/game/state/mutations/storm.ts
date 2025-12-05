/**
 * Storm movement and order management mutations.
 */

import { type GameState, Faction } from '../../types';
import { GAME_CONSTANTS } from '../../data';

/**
 * Move the storm to a new sector.
 */
export function moveStorm(state: GameState, newSector: number): GameState {
  return {
    ...state,
    stormSector: newSector % GAME_CONSTANTS.TOTAL_SECTORS,
  };
}

/**
 * Update storm order based on current storm position.
 */
export function updateStormOrder(state: GameState, newOrder: Faction[]): GameState {
  return {
    ...state,
    stormOrder: newOrder,
  };
}

