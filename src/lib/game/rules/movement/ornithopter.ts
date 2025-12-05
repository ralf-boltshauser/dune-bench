/**
 * Ornithopter access and movement range calculations.
 * 
 * Handles checking ornithopter access and calculating movement range
 * based on faction abilities and ornithopter access.
 */

import { Faction, ORNITHOPTER_TERRITORIES, type GameState } from '@/lib/game/types';
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

/**
 * Get the movement range for a faction based on ornithopter access.
 *
 * @param hasOrnithoptersOverride - Optional override for ornithopter access (used when checking from phase start)
 */
export function getMovementRange(
  state: GameState,
  faction: Faction,
  hasOrnithoptersOverride?: boolean
): number {
  // Use override if provided (for phase-start ornithopter access), otherwise check current state
  const hasOrnithopters = hasOrnithoptersOverride !== undefined
    ? hasOrnithoptersOverride
    : checkOrnithopterAccess(state, faction);

  return getMovementRangeForFaction(faction, hasOrnithopters);
}

/**
 * Calculate movement range for a faction based on ornithopter access.
 * Fremen get 2 territories base, all others get 1. Ornithopters grant 3 territories total.
 */
export function getMovementRangeForFaction(faction: Faction, hasOrnithopters: boolean): number {
  // Ornithopters grant 3 territories to ANY faction (including Fremen)
  if (hasOrnithopters) return 3;

  // Fremen base movement is 2 territories (without ornithopters)
  if (faction === Faction.FREMEN) return 2;

  // All other factions: 1 territory without ornithopters
  return 1;
}

