/**
 * Ornithopter access checking.
 * Rule 2.02.12 (COEXISTENCE): Advisors cannot grant ornithopters - only fighters count.
 */

import { Faction, ORNITHOPTER_TERRITORIES } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionState } from '@/lib/game/state';

/**
 * Check if faction has access to ornithopters (force in Arrakeen or Carthag).
 * Rule 2.02.12 (COEXISTENCE): Advisors cannot grant ornithopters - only fighters count.
 */
export function checkOrnithopterAccess(state: GameState, faction: Faction): boolean {
  const factionState = getFactionState(state, faction);
  
  return ORNITHOPTER_TERRITORIES.some((territoryId) => {
    // Check if faction has any fighters (not advisors) in this territory
    const stack = factionState.forces.onBoard.find(
      (s) => s.territoryId === territoryId
    );
    if (!stack) return false;
    
    const totalForces = stack.forces.regular + stack.forces.elite;
    const advisors = stack.advisors ?? 0;
    return (totalForces - advisors) > 0; // Only fighters count
  });
}

