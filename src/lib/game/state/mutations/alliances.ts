/**
 * Alliance management mutations.
 */

import { type GameState, Faction, AllianceStatus, type Alliance } from '../../types';
import { getFactionState } from '../queries';
import { updateFactionState } from './common';

/**
 * Form an alliance between two factions.
 */
export function formAlliance(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): GameState {
  // Update both factions
  let newState = updateFactionState(state, faction1, {
    allianceStatus: AllianceStatus.ALLIED,
    allyId: faction2,
  });
  newState = updateFactionState(newState, faction2, {
    allianceStatus: AllianceStatus.ALLIED,
    allyId: faction1,
  });

  // Record alliance
  const alliance: Alliance = {
    factions: [faction1, faction2],
    formedOnTurn: state.turn,
  };

  return {
    ...newState,
    alliances: [...newState.alliances, alliance],
  };
}

/**
 * Break an alliance.
 */
export function breakAlliance(state: GameState, faction: Faction): GameState {
  const factionState = getFactionState(state, faction);
  const allyId = factionState.allyId;
  if (!allyId) return state;

  // Update both factions
  let newState = updateFactionState(state, faction, {
    allianceStatus: AllianceStatus.UNALLIED,
    allyId: null,
  });
  newState = updateFactionState(newState, allyId, {
    allianceStatus: AllianceStatus.UNALLIED,
    allyId: null,
  });

  // Remove alliance from list
  return {
    ...newState,
    alliances: newState.alliances.filter(
      (a) => !a.factions.includes(faction) || !a.factions.includes(allyId)
    ),
  };
}

