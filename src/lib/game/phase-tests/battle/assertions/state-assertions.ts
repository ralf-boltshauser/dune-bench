/**
 * State Validation Assertions
 * 
 * Assertions for validating game state after battle phase.
 */

import { getFactionState } from '../../../state';
import { Faction, TerritoryId, BattleSubPhase, LeaderLocation } from '../../../types';
import type { ScenarioResult } from '../scenarios/base-scenario';
import type { BattleAssertion } from './battle-assertions';

/**
 * Assert that a faction has a specific number of forces in a territory
 */
export function assertForcesCount(
  faction: Faction,
  territory: TerritoryId,
  expectedRegular: number,
  expectedElite: number = 0
): BattleAssertion {
  return {
    name: `${faction} forces in ${territory}`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const stack = factionState.forces.onBoard.find(
        s => s.territoryId === territory
      );
      if (!stack) {
        return expectedRegular === 0 && expectedElite === 0;
      }
      const actualRegular = stack.forces.regular || 0;
      const actualElite = stack.forces.elite || 0;
      return actualRegular === expectedRegular && actualElite === expectedElite;
    },
    message: `Expected ${faction} to have ${expectedRegular} regular and ${expectedElite} elite forces in ${territory}`,
  };
}

/**
 * Assert that a leader is in the leader pool
 */
export function assertLeaderInPool(
  faction: Faction,
  leaderId: string
): BattleAssertion {
  return {
    name: `${faction} leader ${leaderId} in pool`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const leader = factionState.leaders.find(l => l.definitionId === leaderId);
      return leader?.location === LeaderLocation.LEADER_POOL;
    },
    message: `Expected ${faction}'s leader ${leaderId} to be in leader pool`,
  };
}

/**
 * Assert that a leader is in a territory
 */
export function assertLeaderInTerritory(
  faction: Faction,
  leaderId: string,
  territory: TerritoryId
): BattleAssertion {
  return {
    name: `${faction} leader ${leaderId} in ${territory}`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const leader = factionState.leaders.find(l => l.definitionId === leaderId);
      return leader?.usedInTerritoryId === territory &&
             (leader?.location === LeaderLocation.ON_BOARD ||
              leader?.location === LeaderLocation.IN_BATTLE);
    },
    message: `Expected ${faction}'s leader ${leaderId} to be in ${territory}`,
  };
}

/**
 * Assert that a leader is in the Tanks (killed)
 */
export function assertLeaderInTanks(
  faction: Faction,
  leaderId: string
): BattleAssertion {
  return {
    name: `${faction} leader ${leaderId} in tanks`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      const leader = factionState.leaders.find(l => l.definitionId === leaderId);
      return leader?.hasBeenKilled === true || 
             leader?.location === LeaderLocation.TANKS_FACE_UP ||
             leader?.location === LeaderLocation.TANKS_FACE_DOWN;
    },
    message: `Expected ${faction}'s leader ${leaderId} to be in tanks`,
  };
}

/**
 * Assert that a card is in a faction's hand
 */
export function assertCardInHand(
  faction: Faction,
  cardId: string
): BattleAssertion {
  return {
    name: `${faction} has card ${cardId} in hand`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      return factionState.hand.some(c => c.definitionId === cardId);
    },
    message: `Expected ${faction} to have card ${cardId} in hand`,
  };
}

/**
 * Assert that a card is NOT in a faction's hand (discarded)
 */
export function assertCardNotInHand(
  faction: Faction,
  cardId: string
): BattleAssertion {
  return {
    name: `${faction} does not have card ${cardId} in hand`,
    check: (result) => {
      const factionState = getFactionState(result.state, faction);
      return !factionState.hand.some(c => c.definitionId === cardId);
    },
    message: `Expected ${faction} to NOT have card ${cardId} in hand`,
  };
}

