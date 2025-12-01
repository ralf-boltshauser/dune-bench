/**
 * Pending Battles Management Module
 * 
 * Handles updating pending battles after battles are resolved.
 */

import { getBGFightersInSector, getFactionsInTerritoryAndSector } from "../../../state";
import { Faction, TerritoryId, type GameState } from "../../../types";
import { type PendingBattle } from "../../types";

/**
 * Update pending battles after a battle is resolved.
 * Removes factions that no longer have forces in the territory/sector,
 * and removes the battle entirely if fewer than 2 factions remain.
 * 
 * This handles the MULTIPLE BATTLES rule: when 3+ players are in the same
 * territory, the aggressor can continue fighting as long as they have forces.
 */
export function updatePendingBattlesAfterBattle(
  pendingBattles: PendingBattle[],
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): PendingBattle[] {
  // Get current factions in this territory/sector
  const currentFactions = getFactionsInTerritoryAndSector(state, territoryId, sector);
  
  // Filter to only battle-capable factions
  const battleCapableFactions = currentFactions.filter((faction) => {
    if (faction === Faction.BENE_GESSERIT) {
      // BG: Only fighters (not advisors) can battle
      return getBGFightersInSector(state, territoryId, sector) > 0;
    }
    // Other factions: Check if they have any forces
    const factionState = state.factions.get(faction);
    if (!factionState) return false;
    
    const stack = factionState.forces.onBoard.find(
      (s) => s.territoryId === territoryId && s.sector === sector
    );
    if (!stack) return false;
    
    return stack.forces.regular + stack.forces.elite > 0;
  });

  // Update all battles in this territory
  return pendingBattles
    .map((battle) => {
      if (battle.territoryId !== territoryId || battle.sector !== sector) {
        return battle; // Not this battle, keep as-is
      }

      // Filter factions to only those still present and battle-capable
      const remainingFactions = battle.factions.filter((faction) =>
        battleCapableFactions.includes(faction)
      );

      // If fewer than 2 factions remain, remove this battle
      if (remainingFactions.length < 2) {
        return null;
      }

      // Update with remaining factions
      return {
        ...battle,
        factions: remainingFactions,
      };
    })
    .filter((battle): battle is PendingBattle => battle !== null);
}

