/**
 * Bene Gesserit Advisor Flipping Validation Rules
 * 
 * Validates restrictions on flipping advisors to fighters:
 * @rule 2.02.18 PEACETIME: Cannot flip with ally present
 * @rule 2.02.19 STORMED IN: Cannot flip under storm
 * 
 * These restrictions apply to all flip abilities:
 * - ENLISTMENT (Rule 2.02.14)
 * - TAKE UP ARMS (Rule 2.02.16)
 * - WARTIME (Rule 2.02.17)
 * - UNIVERSAL STEWARDS (Rule 2.02.21)
 */

import { Faction, TerritoryId, type GameState } from '../types';
import { getAlly, getForcesInTerritory, isSectorInStorm } from '../state';

// =============================================================================
// PEACETIME RESTRICTION (Rule 2.02.19)
// =============================================================================

/**
 * Check if PEACETIME restriction prevents flipping advisors to fighters.
 * @rule 2.02.18
 * 
 * Rule 2.02.18: "Advisors can not flip to fighters with an ally present."
 * 
 * @param state Game state
 * @param faction Bene Gesserit faction
 * @param territoryId Territory where advisors are located
 * @returns true if PEACETIME restriction applies (cannot flip), false if can flip
 */
export function isPEACETIMERestrictionActive(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId
): boolean {
  const ally = getAlly(state, faction);
  if (!ally) {
    // No ally = no PEACETIME restriction
    return false;
  }

  // Check if ally has forces in same territory (any sector)
  // PEACETIME checks territory-level, not sector-level
  const allyStack = getForcesInTerritory(state, ally, territoryId);
  return allyStack !== undefined; // Ally has forces = PEACETIME applies
}

// =============================================================================
// STORMED IN RESTRICTION (Rule 2.02.20)
// =============================================================================

/**
 * Check if STORMED IN restriction prevents flipping advisors to fighters.
 * @rule 2.02.19
 * 
 * Rule 2.02.19: "Advisors can not flip to fighters under storm."
 * 
 * @param state Game state
 * @param sector Sector where advisors are located
 * @returns true if STORMED IN restriction applies (cannot flip), false if can flip
 */
export function isSTORMEDINRestrictionActive(
  state: GameState,
  sector: number
): boolean {
  return isSectorInStorm(state, sector);
}

// =============================================================================
// COMBINED VALIDATION
// =============================================================================

/**
 * Validation result for advisor flipping restrictions.
 */
export interface AdvisorFlipValidationResult {
  /** Whether advisors can flip to fighters */
  canFlip: boolean;
  /** Reason why flipping is blocked (if canFlip is false) */
  reason?: string;
  /** Which restriction is blocking (if any) */
  restriction?: 'PEACETIME' | 'STORMED_IN' | 'BOTH';
}

/**
 * Validate if advisors can flip to fighters, checking both PEACETIME and STORMED IN restrictions.
 * 
 * @param state Game state
 * @param faction Bene Gesserit faction
 * @param territoryId Territory where advisors are located
 * @param sector Sector where advisors are located
 * @returns Validation result indicating if flip is allowed
 */
export function validateAdvisorFlipToFighters(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number
): AdvisorFlipValidationResult {
  const peacetime = isPEACETIMERestrictionActive(state, faction, territoryId);
  const stormedIn = isSTORMEDINRestrictionActive(state, sector);

  if (peacetime && stormedIn) {
    return {
      canFlip: false,
      reason: 'PEACETIME: Ally present in territory. STORMED IN: Advisors in storm sector.',
      restriction: 'BOTH',
    };
  }

  if (peacetime) {
    return {
      canFlip: false,
      reason: 'PEACETIME: Advisors cannot flip to fighters with an ally present in the same territory.',
      restriction: 'PEACETIME',
    };
  }

  if (stormedIn) {
    return {
      canFlip: false,
      reason: 'STORMED IN: Advisors cannot flip to fighters under storm.',
      restriction: 'STORMED_IN',
    };
  }

  return {
    canFlip: true,
  };
}




