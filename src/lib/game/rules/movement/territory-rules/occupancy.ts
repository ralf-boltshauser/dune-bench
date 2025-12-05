/**
 * Stronghold occupancy rules.
 * Single source of truth for occupancy validation.
 */

import { Faction, TerritoryId, TerritoryType, STRONGHOLD_TERRITORIES, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionsOccupyingTerritory } from '@/lib/game/state';
import { type ValidationError } from '../../types';
import { createOccupancyError } from '../shared/error-helpers';

/**
 * @rule 1.06.03.05 OCCUPANCY LIMIT: No player may Ship into a stronghold already occupied by two other player's Forces.
 * Check if a faction can enter a stronghold.
 * Returns whether entry is allowed and an error if not.
 */
export function canEnterStronghold(
  state: GameState,
  territoryId: TerritoryId,
  faction: Faction
): { allowed: boolean; error: ValidationError | null } {
  if (!STRONGHOLD_TERRITORIES.includes(territoryId)) {
    return { allowed: true, error: null };
  }

  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  const occupants = getFactionsOccupyingTerritory(state, territoryId);
  
  if (occupants.length >= 2 && !occupants.includes(faction)) {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    const error = createOccupancyError(
      territory?.name || territoryId,
      occupants,
      'territoryId',
      'Choose a different stronghold or wait for battle resolution'
    );
    return { allowed: false, error };
  }

  return { allowed: true, error: null };
}

/**
 * Check if a faction can transit through a stronghold.
 * Used for pathfinding - cannot pass through if 2+ other factions.
 */
export function canTransitThroughStronghold(
  state: GameState,
  territoryId: TerritoryId,
  movingFaction: Faction,
  isDestination: boolean = false
): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory || territory.type !== TerritoryType.STRONGHOLD) {
    return true;
  }

  // Can always enter destination, but cannot transit through
  if (isDestination) {
    return true;
  }

  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  const factionsInTerritory = getFactionsOccupyingTerritory(state, territoryId);
  const otherFactions = factionsInTerritory.filter(f => f !== movingFaction);
  
  // Can't pass through if 2+ other factions
  return otherFactions.length < 2;
}

