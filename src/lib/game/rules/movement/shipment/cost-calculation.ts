/**
 * Shipment cost calculations.
 * Single source of truth for all cost-related logic.
 */

import { Faction, TerritoryId, STRONGHOLD_TERRITORIES } from '@/lib/game/types';
import { GAME_CONSTANTS } from '../../../data';

/**
 * Calculate shipment cost based on territory type and faction.
 * @rule 2.06.06 HALF PRICE SHIPPING: Guild pays only half the normal price (rounded up) when shipping Forces.
 */
export function calculateShipmentCost(
  territoryId: TerritoryId,
  forceCount: number,
  faction: Faction
): number {
  const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);
  const baseRate = isStronghold
    ? GAME_CONSTANTS.COST_SHIP_TO_STRONGHOLD
    : GAME_CONSTANTS.COST_SHIP_TO_TERRITORY;

  // Guild pays half price (rounded up)
  if (faction === Faction.SPACING_GUILD) {
    return Math.ceil((baseRate * forceCount) / 2);
  }

  return baseRate * forceCount;
}

/**
 * Calculate how many forces can be afforded with given spice.
 */
export function calculateAffordableForces(
  territoryId: TerritoryId,
  spice: number,
  faction: Faction
): number {
  const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);
  const baseRate = isStronghold
    ? GAME_CONSTANTS.COST_SHIP_TO_STRONGHOLD
    : GAME_CONSTANTS.COST_SHIP_TO_TERRITORY;

  if (faction === Faction.SPACING_GUILD) {
    // Guild pays half, so can afford twice as many
    return Math.floor((spice * 2) / baseRate);
  }

  return Math.floor(spice / baseRate);
}

