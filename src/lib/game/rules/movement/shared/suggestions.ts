/**
 * Suggestion generation helpers (shared utilities).
 * Note: Shipment-specific suggestions are in shipment/suggestions.ts to avoid circular dependencies.
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { findSafeSector } from '../../storm-validation';

/**
 * Find a nearby territory not in storm.
 */
export function findNearestSafeTerritory(
  state: GameState,
  fromTerritory: TerritoryId,
  faction: Faction
): string {
  const territory = TERRITORY_DEFINITIONS[fromTerritory];
  if (!territory) return 'Try a different territory';

  for (const adjId of territory.adjacentTerritories) {
    const adj = TERRITORY_DEFINITIONS[adjId];
    if (adj) {
      const safeSector = findSafeSector(state, adjId);
      if (safeSector !== undefined) {
        return `Try ${adj.name} sector ${safeSector} instead`;
      }
    }
  }

  return 'Wait for storm to pass';
}

