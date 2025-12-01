/**
 * Shared display helper functions
 * Single source of truth for common display logic
 */

import { getLeaderDefinition } from '@/lib/game/data';
import { TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { TerritoryId } from '@/lib/game/types';

// =============================================================================
// LEADER HELPERS
// =============================================================================

/**
 * Get display name for a leader by ID
 * Falls back to leaderId if definition not found
 */
export function getLeaderDisplayName(leaderId: string): string {
  const leaderDef = getLeaderDefinition(leaderId);
  return leaderDef?.name ?? leaderId;
}

// =============================================================================
// TERRITORY HELPERS
// =============================================================================

/**
 * Get display name for a territory by ID
 * Falls back to territoryId if definition not found
 */
export function getTerritoryDisplayName(territoryId: string | undefined): string {
  if (!territoryId) return "Unknown";
  const territory = TERRITORY_DEFINITIONS[territoryId as TerritoryId];
  return territory?.name || territoryId;
}

// =============================================================================
// TIME HELPERS
// =============================================================================

/**
 * Format timestamp to localized time string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

