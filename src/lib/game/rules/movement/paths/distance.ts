/**
 * Distance calculations (ignoring storm).
 * Used for Fremen special shipment validation.
 */

import { TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';

/**
 * Get all territories within N distance of a starting territory (ignoring storm).
 * Used for Fremen special shipment validation.
 */
export function getTerritoriesWithinDistance(
  from: TerritoryId,
  distance: number
): Set<TerritoryId> {
  const reachable = new Set<TerritoryId>();
  const visited = new Set<TerritoryId>();
  const queue: { territory: TerritoryId; distance: number }[] = [
    { territory: from, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance > distance) continue;
    if (visited.has(current.territory)) continue;

    visited.add(current.territory);
    if (current.territory !== from) {
      reachable.add(current.territory);
    }

    const currentDef = TERRITORY_DEFINITIONS[current.territory];
    if (!currentDef) continue;

    for (const adjId of currentDef.adjacentTerritories) {
      if (!visited.has(adjId)) {
        queue.push({ territory: adjId, distance: current.distance + 1 });
      }
    }
  }

  return reachable;
}

