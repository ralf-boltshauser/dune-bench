/**
 * Harkonnen faction-specific leader capture mechanics.
 */

import { type GameState, Faction, LeaderLocation, type Leader } from '../../types';
import { getFactionState } from '../queries';
import { updateFactionState } from './common';
import { addSpice } from './spice';

/**
 * @rule 2.05.10.03 - CAPTURE: Leader added to Harkonnen's Active Leader Pool
 * Capture an enemy leader (Harkonnen ability).
 * After winning battle, Harkonnen can capture one active leader from the loser.
 * The captured leader is transferred to Harkonnen's leader pool.
 */
export function captureLeader(
  state: GameState,
  captor: Faction,
  victim: Faction,
  leaderId: string
): GameState {
  // Remove leader from victim's pool
  const victimState = getFactionState(state, victim);
  const victimLeaders = victimState.leaders.filter((l) => l.definitionId !== leaderId);
  let newState = updateFactionState(state, victim, { leaders: victimLeaders });

  // Find the leader being captured
  const capturedLeader = victimState.leaders.find((l) => l.definitionId === leaderId);
  if (!capturedLeader) {
    throw new Error(`Leader ${leaderId} not found in ${victim}'s leaders`);
  }

  // Add to captor's pool with capture metadata
  const captorState = getFactionState(newState, captor);
  const captorLeaders = [
    ...captorState.leaders,
    {
      ...capturedLeader,
      faction: captor, // Now controlled by captor
      location: LeaderLocation.LEADER_POOL,
      capturedBy: captor,
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, captor, { leaders: captorLeaders });

  return newState;
}

/**
 * @rule 2.05.10.02 - KILL: Place leader face-down in tanks, gain 2 spice
 * @rule 2.05.12 - TYING UP LOOSE ENDS: Killed captured leaders go to original faction's tanks
 * Kill a captured leader for 2 spice (Harkonnen ability).
 * The leader goes face-down into tanks and Harkonnen gains 2 spice.
 */
export function killCapturedLeader(
  state: GameState,
  captor: Faction,
  leaderId: string
): GameState {
  const captorState = getFactionState(state, captor);
  const leader = captorState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found in ${captor}'s leaders`);
  }

  if (!leader.capturedBy) {
    throw new Error(`Leader ${leaderId} is not captured`);
  }

  const originalFaction = leader.originalFaction;

  // Remove from captor's pool
  const captorLeaders = captorState.leaders.filter((l) => l.definitionId !== leaderId);
  let newState = updateFactionState(state, captor, { leaders: captorLeaders });

  // Add to original faction's tanks (face down per rules: "Place the Leader Disc face down")
  const originalState = getFactionState(newState, originalFaction);
  const originalLeaders = [
    ...originalState.leaders,
    {
      ...leader,
      faction: originalFaction, // Return to original faction
      location: LeaderLocation.TANKS_FACE_DOWN,
      capturedBy: null,
      hasBeenKilled: true,
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, originalFaction, { leaders: originalLeaders });

  // Grant 2 spice to captor
  newState = addSpice(newState, captor, 2);

  return newState;
}

/**
 * @rule 2.05.10.03 - CAPTURE: Return captured leader after use if not killed
 * Return a captured leader to their original owner after being used in battle.
 * Per rules: "After it is used in a battle, if it wasn't killed during that battle,
 * the leader is returned to the Active Leader Pool of the player who last had it."
 */
export function returnCapturedLeader(state: GameState, leaderId: string): GameState {
  // Find which faction currently has this leader
  let currentHolder: Faction | null = null;
  let leader: Leader | null = null;

  for (const [faction, factionState] of state.factions) {
    const foundLeader = factionState.leaders.find((l) => l.definitionId === leaderId);
    if (foundLeader) {
      currentHolder = faction;
      leader = foundLeader;
      break;
    }
  }

  if (!currentHolder || !leader) {
    throw new Error(`Leader ${leaderId} not found in any faction's leaders`);
  }

  if (!leader.capturedBy) {
    // Not a captured leader, no action needed
    return state;
  }

  const originalFaction = leader.originalFaction;

  // Remove from current holder's pool
  const currentHolderState = getFactionState(state, currentHolder);
  const currentHolderLeaders = currentHolderState.leaders.filter(
    (l) => l.definitionId !== leaderId
  );
  let newState = updateFactionState(state, currentHolder, {
    leaders: currentHolderLeaders,
  });

  // Return to original faction's pool
  const originalState = getFactionState(newState, originalFaction);
  const originalLeaders = [
    ...originalState.leaders,
    {
      ...leader,
      faction: originalFaction, // Back to original faction
      location: LeaderLocation.LEADER_POOL,
      capturedBy: null, // No longer captured
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, originalFaction, { leaders: originalLeaders });

  return newState;
}

/**
 * @rule 2.05.11 - PRISON BREAK: Return all captured leaders when all own leaders killed
 * Prison Break: Return all captured leaders when all of Harkonnen's own leaders are killed.
 * Per rules: "When all your own leaders have been killed, you must return all captured
 * leaders immediately to the players who last had them as an Active Leader."
 */
export function returnAllCapturedLeaders(state: GameState, captor: Faction): GameState {
  const captorState = getFactionState(state, captor);
  let newState = state;

  // Find all captured leaders
  const capturedLeaders = captorState.leaders.filter((l) => l.capturedBy !== null);

  for (const leader of capturedLeaders) {
    newState = returnCapturedLeader(newState, leader.definitionId);
  }

  return newState;
}

