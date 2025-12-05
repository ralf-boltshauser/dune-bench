/**
 * Bene Gesserit-specific force type conversion mutations.
 */

import { type GameState, TerritoryId, Faction } from '../../types';
import { getFactionState } from '../queries';
import {
  convertAdvisorsToFighters,
  convertFightersToAdvisors,
} from '../force-utils';
import { validateAdvisorFlipToFighters } from '../../rules';
import { updateFactionState } from './common';

/**
 * Convert BG advisors to fighters (flip tokens to battle side).
 * Only applicable to Bene Gesserit faction.
 * 
 * Validates PEACETIME and STORMED_IN restrictions (Rules 2.02.19, 2.02.20).
 * Throws error if restrictions prevent flipping.
 * 
 * @param state Game state
 * @param territoryId Territory where advisors are located
 * @param sector Sector where advisors are located
 * @param count Number of advisors to flip
 * @returns New game state with advisors converted to fighters
 * @throws Error if PEACETIME or STORMED_IN restrictions prevent flipping
 */
export function convertBGAdvisorsToFighters(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState {
  // Validate restrictions before flipping
  const validation = validateAdvisorFlipToFighters(
    state,
    Faction.BENE_GESSERIT,
    territoryId,
    sector
  );
  
  if (!validation.canFlip) {
    throw new Error(
      `Cannot flip advisors to fighters: ${validation.reason} (Rules 2.02.19, 2.02.20)`
    );
  }

  const factionState = getFactionState(state, Faction.BENE_GESSERIT);
  const forces = factionState.forces;

  const onBoard = convertAdvisorsToFighters(forces.onBoard, territoryId, sector, count);

  return updateFactionState(state, Faction.BENE_GESSERIT, {
    forces: { ...forces, onBoard },
  });
}

/**
 * Convert BG fighters to advisors (flip tokens to spiritual side).
 * Only applicable to Bene Gesserit faction.
 */
export function convertBGFightersToAdvisors(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState {
  const factionState = getFactionState(state, Faction.BENE_GESSERIT);
  const forces = factionState.forces;

  const onBoard = convertFightersToAdvisors(forces.onBoard, territoryId, sector, count);

  return updateFactionState(state, Faction.BENE_GESSERIT, {
    forces: { ...forces, onBoard },
  });
}

