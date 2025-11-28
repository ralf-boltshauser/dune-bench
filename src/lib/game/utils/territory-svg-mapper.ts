/**
 * Utilities for mapping between TerritoryId and SVG element IDs.
 * Handles conversion between game territory IDs and SVG visualization IDs.
 */

import { TerritoryId, TERRITORY_DEFINITIONS } from '../types';
import type { ForceSlotMapping } from '../types/territories';

/**
 * Convert TerritoryId enum value to SVG kebab-case format.
 * Example: TerritoryId.CIELAGO_SOUTH -> "cielago-south"
 */
export function territoryIdToSvgId(territoryId: TerritoryId): string {
  return territoryId.toLowerCase().replace(/_/g, '-');
}

/**
 * Convert SVG kebab-case ID to TerritoryId enum value.
 * Example: "cielago-south" -> TerritoryId.CIELAGO_SOUTH
 */
export function svgIdToTerritoryId(svgId: string): TerritoryId | null {
  const territoryId = svgId.toUpperCase().replace(/-/g, '_') as TerritoryId;
  return Object.values(TerritoryId).includes(territoryId) ? territoryId : null;
}

/**
 * Get the force slot group ID for a territory and sector.
 * Returns the SVG element ID for the force slot group.
 */
export function getForceSlotGroupId(territoryId: TerritoryId, sector: number): string | null {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory || !territory.forceSlots) return null;
  
  const mapping = territory.forceSlots.find(slot => slot.sector === sector);
  return mapping ? mapping.slotGroupId : null;
}

/**
 * Get all force slot mappings for a territory.
 */
export function getForceSlotMappings(territoryId: TerritoryId): ForceSlotMapping[] {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  return territory?.forceSlots || [];
}

/**
 * Get the spice slot ID for a territory.
 */
export function getSpiceSlotId(territoryId: TerritoryId): string | null {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  return territory?.spiceSlotId || null;
}

