/**
 * Helper functions for mentat pause test scenarios
 */

import { Faction, type GameState } from '../../../types';

/**
 * Create an endgame state (last turn) with specified max turns
 * @throws Error if maxTurns is less than current turn
 */
export function createEndgameState(
  state: GameState,
  maxTurns: number = 10
): GameState {
  if (maxTurns < state.turn) {
    throw new Error(
      `Cannot set maxTurns (${maxTurns}) less than current turn (${state.turn})`
    );
  }
  
  return {
    ...state,
    config: {
      ...state.config,
      maxTurns,
    },
    turn: maxTurns,
  };
}

/**
 * Set storm order for a state
 * @throws Error if order doesn't match game factions
 */
export function setStormOrder(
  state: GameState,
  order: Faction[]
): GameState {
  const gameFactions = new Set(state.factions.keys());
  const orderSet = new Set(order);
  
  // Check that all factions in order are in the game
  for (const faction of order) {
    if (!gameFactions.has(faction)) {
      throw new Error(
        `Faction ${faction} in storm order is not in the game`
      );
    }
  }
  
  // Check that all game factions are in order
  for (const faction of gameFactions) {
    if (!orderSet.has(faction)) {
      throw new Error(
        `Faction ${faction} in game is missing from storm order`
      );
    }
  }
  
  return {
    ...state,
    stormOrder: order,
  };
}

/**
 * Create an endgame state with custom storm order
 */
export function createEndgameStateWithStormOrder(
  state: GameState,
  stormOrder: Faction[],
  maxTurns: number = 10
): GameState {
  return setStormOrder(
    createEndgameState(state, maxTurns),
    stormOrder
  );
}

