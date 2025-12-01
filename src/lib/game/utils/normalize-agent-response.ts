/**
 * Helper utilities for normalizing territory IDs in agent responses.
 * 
 * Since agent responses come from outside the tool system (e.g., in phase handlers),
 * they need manual normalization. This provides a centralized way to do that.
 */

import type { TerritoryId } from '../types';
import { normalizeTerritoryId } from './territory-normalize';

/**
 * Normalize territory IDs in an agent response data object.
 * Handles both new format (fromTerritoryId/toTerritoryId) and legacy format (from/to.territory).
 * 
 * @param data - Agent response data object
 * @returns Normalized data with TerritoryId types, or null if normalization fails
 */
export function normalizeTerritoryIdsInResponse(
  data: Record<string, unknown>
): { normalized: true; data: Record<string, unknown> } | { normalized: false; error: string } {
  const result: Record<string, unknown> = { ...data };

  // New format: fromTerritoryId, toTerritoryId, territoryId
  if (data.fromTerritoryId) {
    const normalized = normalizeTerritoryId(data.fromTerritoryId as string | TerritoryId);
    if (!normalized) {
      return {
        normalized: false,
        error: `Invalid fromTerritoryId: "${data.fromTerritoryId}"`,
      };
    }
    result.fromTerritoryId = normalized;
  }

  if (data.toTerritoryId) {
    const normalized = normalizeTerritoryId(data.toTerritoryId as string | TerritoryId);
    if (!normalized) {
      return {
        normalized: false,
        error: `Invalid toTerritoryId: "${data.toTerritoryId}"`,
      };
    }
    result.toTerritoryId = normalized;
  }

  if (data.territoryId) {
    const normalized = normalizeTerritoryId(data.territoryId as string | TerritoryId);
    if (!normalized) {
      return {
        normalized: false,
        error: `Invalid territoryId: "${data.territoryId}"`,
      };
    }
    result.territoryId = normalized;
  }

  // Legacy format: from.territory, to.territory
  if (data.from && typeof data.from === 'object' && 'territory' in data.from) {
    const fromData = data.from as { territory?: string; sector?: number };
    if (fromData.territory) {
      const normalized = normalizeTerritoryId(fromData.territory);
      if (!normalized) {
        return {
          normalized: false,
          error: `Invalid from.territory: "${fromData.territory}"`,
        };
      }
      result.from = { ...fromData, territory: normalized };
    }
  }

  if (data.to && typeof data.to === 'object' && 'territory' in data.to) {
    const toData = data.to as { territory?: string; sector?: number };
    if (toData.territory) {
      const normalized = normalizeTerritoryId(toData.territory);
      if (!normalized) {
        return {
          normalized: false,
          error: `Invalid to.territory: "${toData.territory}"`,
        };
      }
      result.to = { ...toData, territory: normalized };
    }
  }

  return { normalized: true, data: result };
}

