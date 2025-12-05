/**
 * Pathfinding between territories.
 * Uses BFS to find shortest path avoiding storm and respecting occupancy limits.
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { canPassThroughTerritory } from '../territory-rules/storm-checks';
import { canTransitThroughStronghold } from '../territory-rules/occupancy';

/**
 * Find a path between territories avoiding storm and respecting occupancy limits.
 * Uses BFS to find shortest path.
 */
export function findPath(
  from: TerritoryId,
  to: TerritoryId,
  state: GameState,
  movingFaction: Faction
): TerritoryId[] | null {
  // Same territory repositioning - valid path is just the territory itself
  if (from === to) return [from];

  const visited = new Set<TerritoryId>();
  const queue: { territory: TerritoryId; path: TerritoryId[] }[] = [
    { territory: from, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDef = TERRITORY_DEFINITIONS[current.territory];

    if (!currentDef) continue;

    for (const adjId of currentDef.adjacentTerritories) {
      if (visited.has(adjId)) continue;

      const adjDef = TERRITORY_DEFINITIONS[adjId];
      if (!adjDef) continue;

      // Check if path is blocked by storm
      if (!canPassThroughTerritory(state, adjId)) continue;

      // Check occupancy limit for strongholds (can't move THROUGH if 2+ other factions)
      // This prevents finding paths that go through full strongholds
      if (!canTransitThroughStronghold(state, adjId, movingFaction, adjId === to)) {
        continue;
      }

      const newPath = [...current.path, adjId];

      if (adjId === to) {
        return newPath;
      }

      visited.add(adjId);
      queue.push({ territory: adjId, path: newPath });
    }
  }

  return null; // No path found
}

