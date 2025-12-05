/**
 * Storm-related territory checks for pathfinding and movement.
 */

import { TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { isSectorInStorm } from '@/lib/game/state';

/**
 * Check if a territory can be passed through (not blocked by storm).
 * Used for pathfinding - can pass if at least one sector is not in storm.
 */
export function canPassThroughTerritory(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory) return false;

  // Protected territories can always be passed through
  if (territory.protectedFromStorm) return true;

  // Territories with no sectors can be passed through
  if (territory.sectors.length === 0) return true;

  // Can pass through if at least one sector is not in storm
  return territory.sectors.some((s) => !isSectorInStorm(state, s));
}

/**
 * Check if a territory is completely blocked by storm.
 */
export function isTerritoryBlockedByStorm(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  return !canPassThroughTerritory(state, territoryId);
}

