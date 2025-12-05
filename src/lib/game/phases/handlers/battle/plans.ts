/**
 * Battle Plans Module
 *
 * Handles creation and validation of battle plans.
 */

import {
  Faction,
  type BattlePlan,
  type GameState,
  type TerritoryId,
} from "../../../types";
import {
  getAvailableLeaders,
  getFactionState,
  getForceCountInTerritory,
  hasCheapHero,
} from "../../../state";
import { getBattleCapableForces } from "./utils";

/**
 * Create a default battle plan (used when a player fails to submit a valid plan).
 * 
 * When forces are available, dials at least 1 force (or all forces if only 1-2 available)
 * to ensure battles are meaningful even when agents fail to respond.
 * 
 * @param faction The faction creating the plan
 * @param state Game state (optional - if not provided, uses 0 forces)
 * @param territoryId Territory ID (optional - required if state is provided)
 * @param sector Sector number (optional - for sector-specific force counting, especially BG)
 */
export function createDefaultBattlePlan(
  faction: Faction,
  state?: GameState,
  territoryId?: TerritoryId,
  sector?: number
): BattlePlan {
  let forcesDialed = 0;
  let leaderId: string | null = null;
  let cheapHeroUsed = false;

  // If state and territory are provided, calculate available forces and dial at least 1
  if (state && territoryId !== undefined) {
    const factionState = getFactionState(state, faction);
    
    // Get battle-capable forces (for BG, excludes advisors; for others, includes all forces)
    const forcesInTerritory =
      sector !== undefined
        ? getBattleCapableForces(state, faction, territoryId, sector)
        : getForceCountInTerritory(state, faction, territoryId);

    // Dial at least 1 force if available, or all forces if only 1-2 available
    if (forcesInTerritory > 0) {
      // Dial all forces if 1-2 available, otherwise dial at least 1
      forcesDialed =
        forcesInTerritory <= 2
          ? forcesInTerritory
          : Math.max(1, Math.floor(forcesInTerritory / 2));
    }

    // Choose leader / Cheap Hero in a rule-correct way
    const availableLeaders = getAvailableLeaders(state, faction);
    const hasLeaders = availableLeaders.length > 0;
    const hasCheapHeroCard = hasCheapHero(state, faction);

    if (hasLeaders) {
      // Pick the strongest available leader by strength
      const bestLeader = availableLeaders.reduce((best, current) =>
        current.strength > best.strength ? current : best
      );
      leaderId = bestLeader.definitionId;
    } else if (hasCheapHeroCard) {
      // No leaders but Cheap Hero available – must use Cheap Hero in lieu of leader
      cheapHeroUsed = true;
    }
  }
  
  return {
    factionId: faction,
    leaderId,
    forcesDialed,
    spiceDialed: 0,
    weaponCardId: null,
    defenseCardId: null,
    kwisatzHaderachUsed: false,
    cheapHeroUsed,
    // Announce no leader only when we truly have neither leaders nor Cheap Hero available
    announcedNoLeader: !leaderId && !cheapHeroUsed,
  };
}

/**
 * Sanitize a battle plan for logging (remove sensitive details for opponent).
 */
export function sanitizePlanForLog(
  plan: BattlePlan | null
): Record<string, unknown> | null {
  if (!plan) return null;
  return {
    factionId: plan.factionId,
    leaderId: plan.leaderId ? "[redacted]" : null,
    forcesDialed: "[redacted]",
    weaponCardId: plan.weaponCardId ? "[redacted]" : null,
    defenseCardId: plan.defenseCardId ? "[redacted]" : null,
    announcedNoLeader: plan.announcedNoLeader,
  };
}

