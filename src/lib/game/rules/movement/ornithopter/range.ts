/**
 * Movement range calculations based on ornithopter access.
 */

import { Faction } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { checkOrnithopterAccess } from './access';

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

