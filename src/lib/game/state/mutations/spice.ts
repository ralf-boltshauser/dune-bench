/**
 * Spice management mutations (faction treasury and board).
 */

import { type GameState, Faction, TerritoryId, type SpiceLocation } from '../../types';
import { getFactionState } from '../queries';
import { updateFactionState } from './common';

/**
 * Add spice to a faction.
 */
export function addSpice(state: GameState, faction: Faction, amount: number): GameState {
  const factionState = getFactionState(state, faction);
  return updateFactionState(state, faction, {
    spice: factionState.spice + amount,
  });
}

/**
 * Remove spice from a faction.
 */
export function removeSpice(state: GameState, faction: Faction, amount: number): GameState {
  const factionState = getFactionState(state, faction);
  const newAmount = Math.max(0, factionState.spice - amount);
  return updateFactionState(state, faction, { spice: newAmount });
}

/**
 * Transfer spice between factions.
 */
export function transferSpice(
  state: GameState,
  from: Faction,
  to: Faction,
  amount: number
): GameState {
  let newState = removeSpice(state, from, amount);
  newState = addSpice(newState, to, amount);
  return newState;
}

/**
 * Add spice to a territory on the board.
 */
export function addSpiceToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): GameState {
  const existing = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existing) {
    return {
      ...state,
      spiceOnBoard: state.spiceOnBoard.map((s) =>
        s.territoryId === territoryId && s.sector === sector
          ? { ...s, amount: s.amount + amount }
          : s
      ),
    };
  }

  return {
    ...state,
    spiceOnBoard: [...state.spiceOnBoard, { territoryId, sector, amount }],
  };
}

/**
 * Remove spice from a territory.
 */
export function removeSpiceFromTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): GameState {
  return {
    ...state,
    spiceOnBoard: state.spiceOnBoard
      .map((s) => {
        if (s.territoryId === territoryId && s.sector === sector) {
          const newAmount = s.amount - amount;
          return newAmount > 0 ? { ...s, amount: newAmount } : null;
        }
        return s;
      })
      .filter((s): s is SpiceLocation => s !== null),
  };
}

/**
 * Destroy all spice in a territory (sandworm or storm).
 * 
 * If sector is provided, destroys all spice in that specific sector of the territory.
 * If sector is undefined, destroys all spice in the entire territory.
 */
export function destroySpiceInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector?: number
): GameState {
  // Filter logic: Keep spice if it's in a different territory OR
  // (if sector is specified, keep if it's in a different sector of the same territory)
  // This removes all spice matching the territory and (if specified) sector
  return {
    ...state,
    spiceOnBoard: state.spiceOnBoard.filter(
      (s) => {
        // Different territory: keep it
        if (s.territoryId !== territoryId) {
          return true;
        }
        // Same territory: check sector
        if (sector === undefined) {
          // No sector specified: remove all spice in this territory
          return false;
        }
        // Sector specified: keep only if different sector
        return s.sector !== sector;
      }
    ),
  };
}

