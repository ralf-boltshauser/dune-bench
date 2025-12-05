/**
 * Karama interrupt mutations.
 * 
 * Note: Query functions (hasActiveKaramaInterrupt, allKaramaResponsesReceived, getKaramaInterruptor)
 * are located in queries.ts to maintain separation of concerns.
 */

import { type GameState, Faction } from '../../types';

/**
 * Create a Karama interrupt opportunity.
 * Called when a faction uses an ability that can be cancelled/prevented.
 * 
 * @param state - Current game state
 * @param interruptType - Type of interrupt ('cancel' or 'prevent')
 * @param targetFaction - Faction whose ability is being interrupted
 * @param abilityName - Name of the ability being interrupted
 * @param abilityContext - Additional context about the ability
 * @returns New game state with Karama interrupt created
 */
export function createKaramaInterrupt(
  state: GameState,
  interruptType: 'cancel' | 'prevent',
  targetFaction: Faction,
  abilityName: string,
  abilityContext: Record<string, unknown> = {}
): GameState {
  // Eligible factions are all except the target
  const eligibleFactions = Array.from(state.factions.keys()).filter((f) => f !== targetFaction);

  return {
    ...state,
    karamaState: {
      interruptType,
      targetFaction,
      abilityName,
      abilityContext,
      eligibleFactions,
      responses: new Map(),
      interrupted: false,
      interruptor: null,
      turn: state.turn,
      phase: state.phase,
    },
  };
}

/**
 * Clear the Karama interrupt state.
 * Called after all factions have responded or an interrupt occurred.
 * 
 * @param state - Current game state
 * @returns New game state with Karama interrupt cleared
 */
export function clearKaramaInterrupt(state: GameState): GameState {
  return {
    ...state,
    karamaState: null,
  };
}

