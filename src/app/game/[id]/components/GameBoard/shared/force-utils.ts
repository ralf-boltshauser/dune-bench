/**
 * Shared utilities for force slot rendering
 * DRY utilities for visualizing forces on the game board
 */

import type { GameState, Faction } from "@/lib/game/types";
import type { TerritoryId } from "@/lib/game/types/territories";
import { getTotalForces } from "@/lib/game/state/force-utils";
import { getForceSlotGroupId } from "@/lib/game/utils/territory-svg-mapper";
import { FACTION_COLORS_WEB } from "@/lib/game/constants/faction-colors";

/**
 * Force data for a specific location (territory + sector)
 */
export interface LocationForce {
  faction: Faction;
  count: number;
  slotIndex: number;
}

/**
 * Forces organized by location key (territory-sector)
 */
export type ForcesByLocation = Map<string, LocationForce[]>;

/**
 * Collect all forces from game state, organized by location
 */
export function collectForcesByLocation(
  gameState: GameState | null | undefined
): ForcesByLocation {
  const forcesByLocation = new Map<string, LocationForce[]>();

  if (!gameState) {
    return forcesByLocation;
  }

  // Process all faction forces
  // First, aggregate forces by faction within each location
  // This handles cases where multiple stacks exist for the same faction in the same location
  const factionForcesByLocation = new Map<string, Map<Faction, number>>();
  
  for (const [faction, factionState] of gameState.factions) {
    for (const stack of factionState.forces.onBoard) {
      const totalCount = getTotalForces(stack.forces);
      if (totalCount === 0) continue;

      const key = `${stack.territoryId}-${stack.sector}`;
      if (!factionForcesByLocation.has(key)) {
        factionForcesByLocation.set(key, new Map());
      }

      const factionForces = factionForcesByLocation.get(key)!;
      const currentCount = factionForces.get(faction) || 0;
      factionForces.set(faction, currentCount + totalCount);
    }
  }

  // Now convert to LocationForce[] format, one entry per faction per location
  for (const [locationKey, factionForces] of factionForcesByLocation) {
    const locationForces: LocationForce[] = [];
    let slotIndex = 0;
    
    for (const [faction, totalCount] of factionForces) {
      locationForces.push({
        faction,
        count: totalCount,
        slotIndex,
      });
      slotIndex++;
    }
    
    forcesByLocation.set(locationKey, locationForces);
  }

  return forcesByLocation;
}

/**
 * Get force slot group ID for a location
 */
export function getLocationSlotGroupId(
  territoryId: TerritoryId,
  sector: number
): string | null {
  return getForceSlotGroupId(territoryId, sector);
}

/**
 * Get faction color for rendering
 */
export function getFactionColor(faction: Faction): string {
  return FACTION_COLORS_WEB[faction] || "#000000";
}

/**
 * Parse location key into territory and sector
 */
export function parseLocationKey(
  locationKey: string
): { territoryId: TerritoryId; sector: number } | null {
  const [territoryIdStr, sectorStr] = locationKey.split("-");
  if (!territoryIdStr || !sectorStr) return null;

  const territoryId = territoryIdStr as TerritoryId;
  const sector = parseInt(sectorStr, 10);
  if (isNaN(sector)) return null;

  return { territoryId, sector };
}

