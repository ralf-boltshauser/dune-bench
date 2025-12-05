/**
 * Phase and turn progression mutations.
 */

import { type GameState, Faction, Phase } from '../../types';

/**
 * Set the list of currently active factions.
 * Central helper so phase handlers don't need to mutate GameState shape directly.
 */
export function setActiveFactions(
  state: GameState,
  factions: Faction[]
): GameState {
  return {
    ...state,
    activeFactions: factions,
  };
}

/**
 * Advance to the next phase.
 */
export function advancePhase(state: GameState, nextPhase: Phase): GameState {
  return {
    ...state,
    phase: nextPhase,
    activeFactions: [],
    // Clear phase-specific state
    stormPhase: null,
    biddingPhase: null,
    battlePhase: null,
  };
}

/**
 * Advance to the next turn.
 */
export function advanceTurn(state: GameState): GameState {
  return {
    ...state,
    turn: state.turn + 1,
    phase: Phase.STORM,
    nexusOccurring: false,
  };
}

