/**
 * Pathfinding and distance calculations for movement.
 * 
 * @rule 1.06.05.05 SECTORS: Sectors have no effect on movement. Forces can Move into or through a Territory ignoring all Sectors. A Sector's only function is to regulate the movement and coverage of the storm and spice collection.
 * @rule 1.06.05.07 Many territories occupy several Sectors, so that a player may Move into and out of a Territory that is partly in the storm, so long as the group does not pass through the part covered by the storm.
 * Provides functions for finding paths between territories, calculating
 * reachable territories, and distance calculations (ignoring storm).
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { canPassThroughTerritory, canTransitThroughStronghold } from './territory-rules';

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

