/**
 * Calculate reachable territories within movement range.
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { canPassThroughTerritory } from '../territory-rules/storm-checks';
import { canTransitThroughStronghold } from '../territory-rules/occupancy';

/**
 * Get all territories reachable within movement range.
 */
export function getReachableTerritories(
  state: GameState,
  from: TerritoryId,
  range: number,
  movingFaction: Faction
): Map<TerritoryId, number> {
  const reachable = new Map<TerritoryId, number>();
  const visited = new Set<TerritoryId>();
  const queue: { territory: TerritoryId; distance: number }[] = [
    { territory: from, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance > range) continue;
    if (visited.has(current.territory)) continue;

    visited.add(current.territory);
    if (current.territory !== from) {
      reachable.set(current.territory, current.distance);
    }

    const currentDef = TERRITORY_DEFINITIONS[current.territory];
    if (!currentDef) continue;

    for (const adjId of currentDef.adjacentTerritories) {
      const adjDef = TERRITORY_DEFINITIONS[adjId];
      if (!adjDef) continue;

      // Check storm blocking
      if (!canPassThroughTerritory(state, adjId)) continue;

      // Check occupancy limit for strongholds (can't move THROUGH if 2+ other factions)
      if (!canTransitThroughStronghold(state, adjId, movingFaction, false)) {
        // Special case: if we're directly adjacent to a full stronghold, mark it as unreachable
        if (current.territory === from && current.distance === 0) {
          continue;
        } else {
          // Can't use it as a transit point
          continue;
        }
      }

      if (!visited.has(adjId)) {
        queue.push({ territory: adjId, distance: current.distance + 1 });
      }
    }
  }

  return reachable;
}

