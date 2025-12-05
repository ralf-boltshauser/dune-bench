/**
 * Karama Flag Handling
 * 
 * Centralized Karama flag management.
 */

import { getFactionState } from "../../../../state";
import { Faction, type GameState } from "../../../../types";
import { type FactionStateWithKarama } from "../types";

/**
 * Karama flags for a faction.
 */
export interface KaramaFlags {
  karamaBiddingActive: boolean;
  karamaFreeCardActive: boolean;
}

/**
 * Get all Karama flags for a faction.
 */
export function getKaramaFlags(
  state: GameState,
  faction: Faction
): KaramaFlags {
  const factionState = getFactionState(state, faction) as FactionStateWithKarama;
  return {
    karamaBiddingActive: factionState.karamaBiddingActive === true,
    karamaFreeCardActive: factionState.karamaFreeCardActive === true,
  };
}

/**
 * Check if faction has Karama free card active.
 */
export function hasKaramaFreeCard(state: GameState, faction: Faction): boolean {
  return getKaramaFlags(state, faction).karamaFreeCardActive;
}

/**
 * Check if faction has Karama bidding active.
 */
export function hasKaramaBidding(state: GameState, faction: Faction): boolean {
  return getKaramaFlags(state, faction).karamaBiddingActive;
}

/**
 * Clear Karama flags after use.
 */
export function clearKaramaFlags(
  state: GameState,
  faction: Faction
): GameState {
  const newFactions = new Map(state.factions);
  const factionState = getFactionState(state, faction) as FactionStateWithKarama;

  if (!factionState.karamaBiddingActive && !factionState.karamaFreeCardActive) {
    // No flags to clear
    return state;
  }

  const updatedFactionState = { ...factionState } as FactionStateWithKarama;
  if (updatedFactionState.karamaBiddingActive) {
    updatedFactionState.karamaBiddingActive = false;
  }
  if (updatedFactionState.karamaFreeCardActive) {
    updatedFactionState.karamaFreeCardActive = false;
  }

  newFactions.set(faction, updatedFactionState);
  return { ...state, factions: newFactions };
}

