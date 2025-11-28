/**
 * Test State Builder for Storm Phase Tests
 * 
 * Helper utilities for creating test game states with specific storm phase configurations.
 */

import { createGameState } from '../../../state/factory';
import {
  shipForces,
  addSpice,
  addSpiceToTerritory,
  getFactionState,
  moveStorm,
} from '../../../state';
import {
  Faction,
  Phase,
  TerritoryId,
  type GameState,
} from '../../../types';
import { buildTestState as buildBaseTestState, getDefaultSpice } from '../../battle/helpers/test-state-builder';
import { addCardToHand } from '../../battle/helpers/test-state-builder';

export interface ForcePlacement {
  faction: Faction;
  territory: TerritoryId;
  sector: number;
  regular: number;
  elite?: number;
}

export interface SpicePlacement {
  territory: TerritoryId;
  sector: number;
  amount: number;
}

export interface TestStateConfig {
  factions: Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  stormSector?: number;
  playerPositions?: Map<Faction, number>; // Custom player positions
  forces?: ForcePlacement[];
  spice?: Map<Faction, number>;
  territorySpice?: SpicePlacement[];
  cards?: Array<{ faction: Faction; cardId: string }>; // Cards to add to hands
  shieldWallDestroyed?: boolean; // For testing Family Atomics effects
}

/**
 * Build a test game state for storm phase testing
 */
export function buildTestState(config: TestStateConfig): GameState {
  // Use base test state builder
  let state = buildBaseTestState({
    factions: config.factions,
    phase: config.phase ?? Phase.STORM,
    turn: config.turn ?? 1,
    advancedRules: config.advancedRules ?? true,
    forces: config.forces,
    spice: config.spice ?? getDefaultSpice(),
    territorySpice: config.territorySpice,
  });

  // Set storm sector
  if (config.stormSector !== undefined) {
    state = moveStorm(state, config.stormSector);
  }

  // Set custom player positions if provided
  if (config.playerPositions) {
    state.playerPositions = new Map(config.playerPositions);
  }

  // Set shield wall destroyed state
  if (config.shieldWallDestroyed !== undefined) {
    state.shieldWallDestroyed = config.shieldWallDestroyed;
  }

  // Add cards to hands
  if (config.cards) {
    for (const { faction, cardId } of config.cards) {
      state = addCardToHand(state, faction, cardId);
    }
  }

  return state;
}

/**
 * Set player position for a faction
 */
export function setPlayerPosition(
  state: GameState,
  faction: Faction,
  sector: number
): GameState {
  const newState = { ...state };
  newState.playerPositions = new Map(state.playerPositions);
  newState.playerPositions.set(faction, sector);
  return newState;
}

