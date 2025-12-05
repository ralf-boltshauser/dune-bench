/**
 * Shipment suggestion generation.
 */

import { Faction, TerritoryId, STRONGHOLD_TERRITORIES, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionState, getReserveForceCount, getFactionsOccupyingTerritory } from '@/lib/game/state';
import { findSafeSector } from '../../storm-validation';
import type { ShipmentSuggestion } from '../../types';
import { calculateShipmentCost } from './cost-calculation';

/**
 * Generate valid shipment alternatives for the agent.
 */
export function generateShipmentSuggestions(
  state: GameState,
  faction: Faction,
  preferredCount: number
): ShipmentSuggestion[] {
  const suggestions: ShipmentSuggestion[] = [];
  const factionState = getFactionState(state, faction);
  const reserves = getReserveForceCount(state, faction);
  const maxForces = Math.min(reserves, preferredCount);

  if (maxForces <= 0) return [];

  // Check each stronghold first (cheaper)
  for (const territoryId of STRONGHOLD_TERRITORIES) {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
    const occupants = getFactionsOccupyingTerritory(state, territoryId);

    // Skip if full (and we're not there)
    if (occupants.length >= 2 && !occupants.includes(faction)) continue;

    // Find a safe sector
    const safeSector = findSafeSector(state, territoryId);
    if (safeSector === undefined) continue;

    const cost = calculateShipmentCost(territoryId, maxForces, faction);
    if (cost <= factionState.spice) {
      suggestions.push({
        territoryId,
        sector: safeSector,
        forceCount: maxForces,
        cost,
        isStronghold: true,
      });
    }
  }

  // Limit suggestions
  return suggestions.slice(0, 5);
}

