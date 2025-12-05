/**
 * Movement suggestion generation.
 */

import { Faction, TerritoryId, STRONGHOLD_TERRITORIES, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getForceCountInTerritory, getFactionsOccupyingTerritory } from '@/lib/game/state';
import { findSafeSector } from '../../storm-validation';
import type { MovementSuggestion } from '../../types';
import { getReachableTerritories } from '../paths';

/**
 * Generate valid movement alternatives.
 */
export function generateMovementSuggestions(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  range: number
): MovementSuggestion[] {
  const suggestions: MovementSuggestion[] = [];
  const forcesAvailable = getForceCountInTerritory(state, faction, fromTerritory);

  if (forcesAvailable === 0) return [];

  const reachable = getReachableTerritories(state, fromTerritory, range, faction);

  for (const [territoryId, distance] of reachable) {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    if (!territory) continue;

    // Find a safe sector (fallback to first sector if all are in storm - pathfinding handles this)
    const safeSector = findSafeSector(state, territoryId) ?? territory.sectors[0];
    if (safeSector === undefined) continue;

    // Check occupancy for strongholds
    // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
    if (STRONGHOLD_TERRITORIES.includes(territoryId)) {
      const occupants = getFactionsOccupyingTerritory(state, territoryId);
      if (occupants.length >= 2 && !occupants.includes(faction)) continue;
    }

    suggestions.push({
      fromTerritory,
      fromSector,
      toTerritory: territoryId,
      toSector: safeSector,
      forceCount: forcesAvailable,
      pathLength: distance,
    });
  }

  // Sort by strategic value (strongholds first, then by distance)
  suggestions.sort((a, b) => {
    const aIsStronghold = STRONGHOLD_TERRITORIES.includes(a.toTerritory) ? 0 : 1;
    const bIsStronghold = STRONGHOLD_TERRITORIES.includes(b.toTerritory) ? 0 : 1;
    if (aIsStronghold !== bIsStronghold) return aIsStronghold - bIsStronghold;
    return a.pathLength - b.pathLength;
  });

  return suggestions.slice(0, 5);
}

