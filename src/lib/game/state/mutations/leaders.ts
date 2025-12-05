/**
 * General leader lifecycle management mutations.
 */

import { type GameState, Faction, TerritoryId, LeaderLocation } from '../../types';
import { getFactionState } from '../queries';
import { updateFactionState } from './common';

/**
 * Kill a leader (send to tanks).
 *
 * IMPORTANT: Per battle.md line 23, leaders with LeaderLocation.ON_BOARD are protected
 * from game effects (storm, sandworms, etc.) but NOT from battle deaths or
 * Lasgun/Shield explosions (KH PROPHECY BLINDED ability).
 *
 * @param allowProtected - Set to true to bypass protection (e.g., for Lasgun/Shield explosions)
 */
export function killLeader(
  state: GameState,
  faction: Faction,
  leaderId: string,
  allowProtected: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      // Check if leader is protected from game effects
      // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
      // Territory where they were used. (Game effects do not kill these leaders while there.)"
      if (!allowProtected && l.location === LeaderLocation.ON_BOARD) {
        // Leader is protected - don't kill them
        console.warn(
          `[killLeader] Leader ${leaderId} of ${faction} is protected (ON_BOARD) - skipping kill`
        );
        return l;
      }

      return {
        ...l,
        location: l.hasBeenKilled
          ? LeaderLocation.TANKS_FACE_DOWN
          : LeaderLocation.TANKS_FACE_UP,
        hasBeenKilled: true,
        usedThisTurn: false,
        usedInTerritoryId: null,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

/**
 * Revive a leader from tanks.
 * @rule 1.05.03.04
 */
export function reviveLeader(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.LEADER_POOL,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

/**
 * Mark a leader as used in battle this turn.
 */
export function markLeaderUsed(
  state: GameState,
  faction: Faction,
  leaderId: string,
  territoryId: TerritoryId
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.ON_BOARD,
        usedThisTurn: true,
        usedInTerritoryId: territoryId,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

/**
 * Reset all leaders' turn state (called at end of battle phase).
 */
export function resetLeaderTurnState(state: GameState, faction: Faction): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => ({
    ...l,
    usedThisTurn: false,
    usedInTerritoryId: null,
    location:
      l.location === LeaderLocation.ON_BOARD ? LeaderLocation.LEADER_POOL : l.location,
  }));

  return updateFactionState(state, faction, { leaders });
}

/**
 * Return a leader to the pool immediately (used when traitor is revealed).
 * Per rules: when a traitor is revealed, the winner's leader returns to pool immediately.
 */
export function returnLeaderToPool(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.LEADER_POOL,
        usedThisTurn: false,
        usedInTerritoryId: null,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

