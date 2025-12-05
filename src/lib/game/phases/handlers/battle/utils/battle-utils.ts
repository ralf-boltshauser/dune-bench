/**
 * Battle Utilities
 *
 * Single source of truth for common battle calculations and operations.
 * Eliminates code duplication across battle phase modules.
 */

import { Faction, TerritoryId, type GameState } from "../../../../types";
import type { CurrentBattle } from "../../../types";
import { getFactionState, getForceCountInTerritory } from "../../../../state";
import { getBGFightersInSector } from "../../../../state/queries";

/**
 * Get battle-capable forces for a faction in a territory/sector.
 * For BG: only counts fighters (excludes advisors).
 * For others: counts all forces.
 */
export function getBattleCapableForces(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number
): number {
  if (faction === Faction.BENE_GESSERIT) {
    // BG: Only fighters can battle (advisors are non-combatants)
    return getBGFightersInSector(state, territoryId, sector);
  }

  // Other factions: Count all forces in sector
  const factionState = getFactionState(state, faction);
  const forceStack = factionState.forces.onBoard.find(
    (f) => f.territoryId === territoryId && f.sector === sector
  );
  return forceStack ? forceStack.forces.regular + forceStack.forces.elite : 0;
}

/**
 * Check if a faction has battle-capable forces in a territory/sector.
 */
export function isBattleCapable(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number
): boolean {
  return getBattleCapableForces(state, faction, territoryId, sector) > 0;
}

/**
 * Count forces for a faction in a battle context.
 * Uses the battle's territory and sector.
 */
export function countForcesInBattle(
  state: GameState,
  faction: Faction,
  battle: CurrentBattle
): number {
  return getBattleCapableForces(state, faction, battle.territoryId, battle.sector);
}

/**
 * Create a new battle context with default values.
 */
export function createBattleContext(
  territoryId: TerritoryId,
  sector: number,
  aggressor: Faction,
  defender: Faction
): CurrentBattle {
  return {
    territoryId,
    sector,
    aggressor,
    defender,
    aggressorPlan: null,
    defenderPlan: null,
    prescienceUsed: false,
    prescienceTarget: null,
    prescienceOpponent: null,
    prescienceResult: null,
    prescienceBlocked: false,
    voiceUsed: false,
    voiceCommand: null,
    traitorCalled: false,
    traitorCalledBy: null,
    traitorCallsByBothSides: false,
  };
}

/**
 * Filter factions to only those that are battle-capable in a territory/sector.
 */
export function filterBattleCapableFactions(
  state: GameState,
  factions: Faction[],
  territoryId: TerritoryId,
  sector: number
): Faction[] {
  return factions.filter((faction) =>
    isBattleCapable(state, faction, territoryId, sector)
  );
}

