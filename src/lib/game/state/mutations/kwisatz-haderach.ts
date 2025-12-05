/**
 * Kwisatz Haderach mutations (Atreides faction ability).
 *
 * @rule 2.01.10 THE SLEEPER HAS AWAKENED: The Kwisatz Haderach card starts out inactive and the Kwisatz Haderach token may not be used. Use the Kwisatz Haderach card and counter token to secretly keep track of Force losses. Once you have lost 7 or more Forces in a battle or battles, the Kwisatz Haderach token becomes active for the rest of the game.
 */

import { type GameState, TerritoryId, Faction } from '../../types';
import { getFactionState } from '../queries';
import { updateFactionState } from './common';

/**
 * @rule 2.01.10
 * Update Kwisatz Haderach state after Atreides loses forces in battle.
 * Activates KH if total losses reach 7+.
 */
export function updateKwisatzHaderach(
  state: GameState,
  forcesLost: number
): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) return state;

  const newCount = atreides.kwisatzHaderach.forcesLostCount + forcesLost;
  const shouldActivate = newCount >= 7 && !atreides.kwisatzHaderach.isActive;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      forcesLostCount: newCount,
      isActive: shouldActivate ? true : atreides.kwisatzHaderach.isActive,
    },
  });
}

/**
 * Mark Kwisatz Haderach as used in a territory this turn.
 */
export function markKwisatzHaderachUsed(
  state: GameState,
  territoryId: TerritoryId
): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      usedInTerritoryThisTurn: territoryId,
    },
  });
}

/**
 * Kill Kwisatz Haderach (PROPHECY BLINDED - only killed by lasgun/shield explosion).
 */
export function killKwisatzHaderach(state: GameState): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach || atreides.kwisatzHaderach.isDead) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      isDead: true,
    },
  });
}

/**
 * @rule 2.01.14 REAWAKEN: Revive Kwisatz Haderach
 * When killed, the Kwisatz Haderach must be revived like any other leader. When all other leaders have died once and/or become unavailable you may use your one leader revival action to revive this token instead of a leader.
 * Cost: 2 spice (KH strength is +2).
 */
export function reviveKwisatzHaderach(state: GameState): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach || !atreides.kwisatzHaderach.isDead) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      isDead: false,
    },
  });
}

/**
 * Reset Kwisatz Haderach turn state (called at end of battle phase).
 */
export function resetKwisatzHaderachTurnState(state: GameState): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      usedInTerritoryThisTurn: null,
    },
  });
}

