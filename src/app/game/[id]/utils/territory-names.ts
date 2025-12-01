/**
 * Territory display names
 * Single source of truth for territory name mappings
 */

import type { FremenDistribution } from '../hooks/useSetupInfo';
import { TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { TerritoryId } from '@/lib/game/types';

// =============================================================================
// FREMEN STARTING TERRITORIES
// =============================================================================

/**
 * Display names for Fremen starting territories
 */
export const FREMEN_STARTING_TERRITORY_NAMES: Record<keyof FremenDistribution, string> = {
  sietch_tabr: "Sietch Tabr",
  false_wall_south: "False Wall South",
  false_wall_west: "False Wall West",
};

// =============================================================================
// GENERAL TERRITORY NAMES
// =============================================================================

/**
 * Get display name for any territory
 * Uses TERRITORY_DEFINITIONS as source of truth
 */
export function getTerritoryName(territoryId: TerritoryId): string {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  return territory?.name || territoryId;
}

