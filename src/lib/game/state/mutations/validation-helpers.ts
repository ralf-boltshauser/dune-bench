/**
 * Shared validation utilities for state mutations.
 * Single source of truth for post-mutation validation patterns.
 * 
 * These helpers eliminate code duplication and ensure consistent validation behavior.
 */

import { type GameState, TerritoryId, Faction, STRONGHOLD_TERRITORIES } from '../../types';
import { validateStrongholdOccupancy, validateHandSize } from '../queries';

/**
 * Validate stronghold occupancy after a mutation operation.
 * 
 * This is a defensive validation that catches violations even if pre-validation
 * is bypassed or buggy. Throws an error if the stronghold occupancy limit is exceeded.
 * 
 * @param state - The game state after mutation
 * @param territoryId - The territory to validate
 * @param operation - Description of the operation (e.g., "shipment", "movement")
 * @throws Error if stronghold occupancy limit is exceeded
 * 
 * @example
 * ```ts
 * const newState = updateFactionState(state, faction, updates);
 * validateStrongholdAfterMutation(newState, territoryId, 'shipment');
 * return newState;
 * ```
 */
export function validateStrongholdAfterMutation(
  state: GameState,
  territoryId: TerritoryId,
  operation: string
): void {
  if (!STRONGHOLD_TERRITORIES.includes(territoryId)) {
    return; // Not a stronghold, no validation needed
  }

  const violations = validateStrongholdOccupancy(state);
  const violation = violations.find((v) => v.territoryId === territoryId);

  if (violation) {
    throw new Error(
      `CRITICAL: Stronghold occupancy violation after ${operation}. ` +
        `${territoryId} has ${violation.count} factions: ${violation.factions.join(', ')}. ` +
        `Maximum 2 factions allowed per stronghold.`
    );
  }
}

/**
 * Validate hand size after a card mutation operation.
 * 
 * This is a defensive validation that ensures hand size limits are not exceeded
 * after adding cards to a faction's hand.
 * 
 * @param state - The game state after mutation
 * @param faction - The faction whose hand to validate
 * @throws Error if hand size limit is exceeded
 * 
 * @example
 * ```ts
 * const newState = updateFactionState(state, faction, { hand: newHand });
 * validateHandSizeAfterMutation(newState, faction);
 * return newState;
 * ```
 */
export function validateHandSizeAfterMutation(
  state: GameState,
  faction: Faction
): void {
  validateHandSize(state, faction);
}

