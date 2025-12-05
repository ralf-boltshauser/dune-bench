/**
 * Movement execution logic.
 * 
 * Executes validated movements by mutating game state.
 * 
 * Note: The actual state mutation implementation lives in state/mutations/forces.ts
 * to maintain proper separation of concerns. This module re-exports it for
 * convenience and to provide a movement-specific interface.
 */

import { Faction, TerritoryId } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { moveForces as mutateMoveForces } from '../../state/mutations/forces';

/**
 * Execute a movement by moving forces between territories.
 * 
 * This function applies the movement to the game state, handling:
 * - Force stack updates
 * - Bene Gesserit ENLISTMENT rule (Rule 2.02.15)
 * - Bene Gesserit ADAPTIVE FORCE rule (Rule 2.02.21)
 * - Stronghold occupancy validation
 * 
 * @param state - Current game state
 * @param faction - Faction making the movement
 * @param fromTerritory - Source territory ID
 * @param fromSector - Source sector
 * @param toTerritory - Destination territory ID
 * @param toSector - Destination sector
 * @param count - Number of forces to move
 * @param isElite - Whether to move elite forces (default: false)
 * @returns New game state with movement applied
 */
export function executeMovement(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  count: number,
  isElite: boolean = false
): GameState {
  return mutateMoveForces(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    count,
    isElite
  );
}

/**
 * Re-export the underlying moveForces function for backward compatibility.
 * Prefer using executeMovement() for new code.
 */
export { mutateMoveForces as moveForces };

