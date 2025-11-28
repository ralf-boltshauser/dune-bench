/**
 * Test State Builder for CHOAM Charity Phase
 * 
 * Helper utilities for creating test game states with specific spice configurations.
 */

import { createGameState } from '../../../state/factory';
import { addSpice, removeSpice, getFactionState } from '../../../state';
import {
  Faction,
  Phase,
  type GameState,
} from '../../../types';

export interface TestStateConfig {
  factions: Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  spice?: Map<Faction, number>;
}

/**
 * Build a test game state with specific spice configuration
 */
export function buildTestState(config: TestStateConfig): GameState {
  let state = createGameState({
    factions: config.factions,
    advancedRules: config.advancedRules ?? false,
  });

  // Set phase and turn
  state.phase = config.phase ?? Phase.CHOAM_CHARITY;
  state.turn = config.turn ?? 1;
  state.setupComplete = true;

  // Set spice for each faction (only if faction is in the game)
  if (config.spice) {
    for (const [faction, desiredAmount] of config.spice.entries()) {
      if (state.factions.has(faction)) {
        const factionState = getFactionState(state, faction);
        const currentSpice = factionState.spice;
        const difference = desiredAmount - currentSpice;
        if (difference > 0) {
          // Add spice
          state = addSpice(state, faction, difference);
        } else if (difference < 0) {
          // Remove spice
          state = removeSpice(state, faction, -difference);
        }
        // If difference is 0, no change needed
      }
    }
  }

  return state;
}

/**
 * Get default spice amounts for testing (high amounts to test non-eligibility)
 */
export function getDefaultSpice(): Map<Faction, number> {
  return new Map([
    [Faction.ATREIDES, 5],
    [Faction.BENE_GESSERIT, 5],
    [Faction.FREMEN, 5],
    [Faction.HARKONNEN, 5],
    [Faction.EMPEROR, 5],
    [Faction.SPACING_GUILD, 5],
  ]);
}

