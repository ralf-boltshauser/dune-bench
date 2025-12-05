import { type GameState, Faction } from "../../../../types";

/**
 * Form an alliance between two factions
 * @rule 1.10.01.02
 * @rule 1.10.01.04
 */
export function formAlliance(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): GameState {
  const factions = new Map(state.factions);

  const state1 = factions.get(faction1);
  const state2 = factions.get(faction2);

  if (state1 && state2) {
    factions.set(faction1, { ...state1, allyId: faction2 });
    factions.set(faction2, { ...state2, allyId: faction1 });
  }

  return { ...state, factions };
}

/**
 * Break an alliance for a faction
 * @rule 1.10.01.06
 */
export function breakAlliance(state: GameState, faction: Faction): GameState {
  const factions = new Map(state.factions);
  const factionState = factions.get(faction);

  if (factionState?.allyId) {
    const allyState = factions.get(factionState.allyId);
    if (allyState) {
      factions.set(factionState.allyId, { ...allyState, allyId: null });
    }
    factions.set(faction, { ...factionState, allyId: null });
  }

  return { ...state, factions };
}

/**
 * Validate that a target faction is available for alliance
 * @rule 1.10.01.05
 */
export function validateAllianceTarget(
  state: GameState,
  targetFaction: Faction
): boolean {
  const targetState = state.factions.get(targetFaction);
  return targetState !== undefined && targetState.allyId === null;
}

