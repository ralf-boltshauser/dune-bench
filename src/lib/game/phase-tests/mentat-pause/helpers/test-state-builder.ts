/**
 * Test State Builder for Mentat Pause Phase
 * 
 * Extends the battle phase test state builder with mentat pause specific helpers.
 */

import { buildTestState as buildBaseTestState, type TestStateConfig } from '../../battle/helpers/test-state-builder';
import { getFactionState } from '../../../state';
import { Faction, Phase, type GameState } from '../../../types';

/**
 * Set spice bribes for a faction
 * @throws Error if faction is not in the game
 */
export function setSpiceBribes(
  state: GameState,
  faction: Faction,
  amount: number
): GameState {
  if (!state.factions.has(faction)) {
    throw new Error(`Faction ${faction} is not in the game`);
  }
  
  if (amount < 0) {
    throw new Error(`Bribe amount cannot be negative: ${amount}`);
  }
  
  const factionState = getFactionState(state, faction);
  const newFactions = new Map(state.factions);
  const updatedFactionState = { ...factionState, spiceBribes: amount };
  newFactions.set(faction, updatedFactionState);
  return { ...state, factions: newFactions };
}

/**
 * Build a test state for mentat pause phase
 */
export function buildTestState(config: TestStateConfig & {
  bribes?: Map<Faction, number>; // Spice bribes per faction
}): GameState {
  let state = buildBaseTestState({
    ...config,
    phase: config.phase ?? Phase.MENTAT_PAUSE,
  });

  // Set bribes if provided
  if (config.bribes) {
    for (const [faction, amount] of config.bribes.entries()) {
      if (!state.factions.has(faction)) {
        throw new Error(`Cannot set bribes for faction ${faction} - not in game`);
      }
      state = setSpiceBribes(state, faction, amount);
    }
  }

  return state;
}

