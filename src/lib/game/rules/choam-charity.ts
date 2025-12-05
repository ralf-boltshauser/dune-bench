/**
 * CHOAM Charity validation rules.
 * Handles eligibility checks and charity amount calculations.
 */

import { Faction, type GameState } from '../types';
import { getFactionState } from '../state';
import { GAME_CONSTANTS } from '../data';

// =============================================================================
// ELIGIBILITY
// =============================================================================

export interface CharityEligibility {
  isEligible: boolean;
  reason: string;
}

/**
 * Check if a faction is eligible for CHOAM Charity.
 * 
 * Rule 1.03.01: Players with 0 or 1 spice can claim CHOAM Charity
 * @rule 2.02.09 (Advanced): Bene Gesserit always eligible regardless of spice
 */
export function isEligibleForCharity(
  state: GameState,
  faction: Faction
): CharityEligibility {
  const factionState = getFactionState(state, faction);
  const currentSpice = factionState.spice;

  // Check Bene Gesserit advanced ability
  if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
    // Rule 2.02.09: Bene Gesserit always receive at least 2 spice regardless of holdings
    return {
      isEligible: true,
      reason: 'Bene Gesserit (Advanced) - always eligible',
    };
  }

  // Standard eligibility: 0 or 1 spice
  if (currentSpice <= GAME_CONSTANTS.CHOAM_CHARITY_THRESHOLD) {
    return {
      isEligible: true,
      reason: `${currentSpice} spice (will receive up to 2 spice)`,
    };
  }

  return {
    isEligible: false,
    reason: `${currentSpice} spice (not eligible)`,
  };
}

/**
 * Get all factions eligible for CHOAM Charity.
 */
export function getEligibleFactions(state: GameState): Faction[] {
  const eligible: Faction[] = [];

  for (const [faction] of state.factions) {
    const eligibility = isEligibleForCharity(state, faction);
    if (eligibility.isEligible) {
      eligible.push(faction);
    }
  }

  return eligible;
}

// =============================================================================
// CHARITY AMOUNT CALCULATION
// =============================================================================

/**
 * Calculate the charity amount a faction should receive.
 * 
 * @rule 1.03.01 COLLECTING CHOAM CHARITY: All players with 0 or 1 spice can collect spice from the bank to bring their total to 2 by calling out "CHOAM Charity". -2.02.09
 * - Standard: 0 spice → 2 spice, 1 spice → 1 spice
 * - Bene Gesserit (Advanced): Always receive at least 2 spice
 * 
 * @param state - Current game state
 * @param faction - Faction claiming charity
 * @param currentSpice - Current spice amount (to avoid re-fetching)
 * @returns Amount of spice to award
 */
export function calculateCharityAmount(
  state: GameState,
  faction: Faction,
  currentSpice: number
): number {
  // Check Bene Gesserit advanced ability
  if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
    // Rule 2.02.09: Bene Gesserit always receive at least 2 spice
    return 2;
  }

  // Standard: Bring to 2 spice total
  // 0 spice → receives 2 spice (0 → 2)
  // 1 spice → receives 1 spice (1 → 2)
  return Math.max(0, GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT - currentSpice);
}

/**
 * Get charity amount with potential modifiers (for future variants).
 * Currently returns the base amount, but can be extended for:
 * - Homeworlds variant: Low Threshold bonus (+1 spice)
 * - Other variant rules
 */
export function getCharityAmount(
  state: GameState,
  faction: Faction,
  currentSpice: number
): number {
  const baseAmount = calculateCharityAmount(state, faction, currentSpice);

  // TODO(#homeworlds-variant): Homeworlds variant - Low Threshold bonus (+1 spice)
  // When Homeworlds variant is implemented, add +1 spice bonus for Low Threshold faction
  // if (state.config.variants?.homeworlds) {
  //   const factionState = getFactionState(state, faction);
  //   if (isAtLowThreshold(factionState)) {
  //     return baseAmount + 1;
  //   }
  // }

  return baseAmount;
}

