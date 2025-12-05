/**
 * Helper functions for BG-specific test setup
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { getFactionState } from '../../../state';
import { convertBGFightersToAdvisors } from '../../../state/mutations/forces-bene-gesserit';

/**
 * Set advisors on a BG force stack after state creation
 * (since ForcePlacement doesn't support advisors directly)
 * 
 * This converts regular forces to advisors. If advisorCount is greater than
 * the number of forces, it will add more forces first.
 */
export function setBGAdvisors(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  advisorCount: number
): GameState {
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const stack = bgState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  if (stack) {
    const totalForces = (stack.forces.regular || 0) + (stack.forces.elite || 0);
    const currentAdvisors = stack.advisors || 0;
    
    // If we need more advisors, convert fighters to advisors
    if (advisorCount > currentAdvisors) {
      const toConvert = advisorCount - currentAdvisors;
      if (toConvert <= totalForces - currentAdvisors) {
        // Convert fighters to advisors using the mutation function
        state = convertBGFightersToAdvisors(state, territoryId, sector, toConvert);
      } else {
        // Need more forces - add them first, then convert
        const needed = toConvert - (totalForces - currentAdvisors);
        stack.forces.regular = (stack.forces.regular || 0) + needed;
        state = convertBGFightersToAdvisors(state, territoryId, sector, toConvert);
      }
    } else if (advisorCount < currentAdvisors) {
      // If we need fewer advisors, just set directly (for test setup)
      stack.advisors = advisorCount;
    } else {
      // Already correct, but ensure property exists
      stack.advisors = advisorCount;
    }
  }
  return state;
}

