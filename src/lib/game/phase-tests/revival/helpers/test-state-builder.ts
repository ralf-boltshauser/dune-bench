/**
 * Test State Builder for Revival Phase
 * 
 * Helper utilities for creating test game states with specific configurations for revival testing.
 */

import { createGameState } from '../../../state/factory';
import {
  addSpice,
  getFactionState,
  formAlliance,
  sendForcesToTanks,
} from '../../../state';
import {
  Faction,
  Phase,
  LeaderLocation,
  type GameState,
} from '../../../types';
import { getLeaderDefinition } from '../../../data';

export interface TestStateConfig {
  factions: Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  forcesInTanks?: Map<Faction, { regular: number; elite?: number }>;
  spice?: Map<Faction, number>;
  alliances?: Array<[Faction, Faction]>;
  leadersInTanks?: Map<Faction, string[]>; // Leader IDs to put in tanks (face up)
  leadersDead?: Map<Faction, string[]>; // Leader IDs that have been killed (face down)
  specialStates?: {
    atreides?: {
      kwisatzHaderachDead?: boolean;
      allLeadersDeadOnce?: boolean;
    };
  };
  cardsInHand?: Map<Faction, string[]>; // Card IDs to add to hand
}

/**
 * Build a test game state with specific configuration for revival testing
 */
export function buildTestState(config: TestStateConfig): GameState {
  let state = createGameState({
    factions: config.factions,
    advancedRules: config.advancedRules ?? true,
  });

  // Set phase and turn
  state.phase = config.phase ?? Phase.REVIVAL;
  state.turn = config.turn ?? 1;
  state.setupComplete = true;

  // Set spice for each faction
  if (config.spice) {
    for (const [faction, amount] of config.spice.entries()) {
      if (state.factions.has(faction)) {
        state = addSpice(state, faction, amount);
      }
    }
  }

  // Send forces to tanks
  if (config.forcesInTanks) {
    for (const [faction, forces] of config.forcesInTanks.entries()) {
      if (state.factions.has(faction)) {
        const factionState = getFactionState(state, faction);
        
        // First, ensure forces are on board (sendForcesToTanks requires them to be on board first)
        // Add forces to reserves first, then ship them to board, then send to tanks
        factionState.forces.reserves.regular += forces.regular;
        if (forces.elite && forces.elite > 0) {
          factionState.forces.reserves.elite += forces.elite;
        }
        
        // Ship forces to a territory (so they're on board)
        const territoryId = 'ARRAKEEN' as any;
        const sector = 9;
        
        // Add forces to onBoard
        let stack = factionState.forces.onBoard.find(
          s => s.territoryId === territoryId && s.sector === sector
        );
        if (!stack) {
          stack = {
            territoryId,
            sector,
            forces: { regular: 0, elite: 0 },
          };
          factionState.forces.onBoard.push(stack);
        }
        stack.forces.regular += forces.regular;
        if (forces.elite && forces.elite > 0) {
          stack.forces.elite += forces.elite;
        }
        
        // Now send them to tanks
        state = sendForcesToTanks(
          state,
          faction,
          territoryId,
          sector,
          forces.regular,
          false
        );
        if (forces.elite && forces.elite > 0) {
          state = sendForcesToTanks(
            state,
            faction,
            territoryId,
            sector,
            forces.elite,
            true
          );
        }
      }
    }
  }

  // Send leaders to tanks
  if (config.leadersInTanks) {
    for (const [faction, leaderIds] of config.leadersInTanks.entries()) {
      const factionState = getFactionState(state, faction);
      for (const leaderId of leaderIds) {
        const leader = factionState.leaders.find(
          (l) => l.definitionId === leaderId
        );
        if (leader) {
          leader.location = LeaderLocation.TANKS_FACE_UP;
          leader.hasBeenKilled = true;
        }
      }
    }
  }

  // Mark leaders as dead (face down)
  if (config.leadersDead) {
    for (const [faction, leaderIds] of config.leadersDead.entries()) {
      const factionState = getFactionState(state, faction);
      for (const leaderId of leaderIds) {
        const leader = factionState.leaders.find(
          (l) => l.definitionId === leaderId
        );
        if (leader) {
          leader.location = LeaderLocation.TANKS_FACE_DOWN;
          leader.hasBeenKilled = true;
        }
      }
    }
  }

  // Set up Atreides special states
  if (config.specialStates?.atreides) {
    const atreidesState = getFactionState(state, Faction.ATREIDES);
    if (atreidesState.kwisatzHaderach) {
      if (config.specialStates.atreides.kwisatzHaderachDead) {
        atreidesState.kwisatzHaderach.isDead = true;
        atreidesState.kwisatzHaderach.isActive = false;
      }
    }
    if (config.specialStates.atreides.allLeadersDeadOnce) {
      // Mark all leaders as having been killed at least once
      atreidesState.leaders.forEach((leader) => {
        leader.hasBeenKilled = true;
      });
    }
  }

  // Form alliances
  if (config.alliances) {
    for (const [faction1, faction2] of config.alliances) {
      state = formAlliance(state, faction1, faction2);
    }
  }

  // Add cards to hand
  if (config.cardsInHand) {
    for (const [faction, cardIds] of config.cardsInHand.entries()) {
      const factionState = getFactionState(state, faction);
      for (const cardId of cardIds) {
        factionState.hand.push({
          definitionId: cardId,
          type: 'special' as any, // Type doesn't matter for testing
        });
      }
    }
  }

  return state;
}

/**
 * Get default spice amounts for testing
 */
export function getDefaultSpice(): Map<Faction, number> {
  return new Map([
    [Faction.ATREIDES, 20],
    [Faction.BENE_GESSERIT, 15],
    [Faction.FREMEN, 10],
    [Faction.HARKONNEN, 25],
    [Faction.EMPEROR, 30],
    [Faction.SPACING_GUILD, 5],
  ]);
}

