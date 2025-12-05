/**
 * Test State Builder
 * 
 * Helper utilities for creating test game states with specific configurations.
 */

import { createGameState } from '../../../state/factory';
import {
  shipForces,
  addSpice,
  addSpiceToTerritory,
  getFactionState,
  formAlliance,
} from '../../../state';
import {
  Faction,
  Phase,
  TerritoryId,
  LeaderLocation,
  CardLocation,
  type GameState,
} from '../../../types';
import { getTreacheryCardDefinition, getLeaderDefinition } from '../../../data';

export interface ForcePlacement {
  faction: Faction;
  territory: TerritoryId;
  sector: number;
  regular: number;
  elite?: number;
}

export interface SpicePlacement {
  territory: TerritoryId;
  sector: number;
  amount: number;
}

export interface TestStateConfig {
  factions: readonly Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  forces?: ForcePlacement[];
  spice?: Map<Faction, number>;
  territorySpice?: SpicePlacement[];
  alliances?: Array<[Faction, Faction]>;
  specialStates?: {
    atreides?: {
      kwisatzHaderachActive?: boolean;
    };
    bg?: {
      prediction?: {
        faction: Faction;
        turn: number;
      };
    };
  };
}

/**
 * Build a test game state with specific configuration
 */
export function buildTestState(config: TestStateConfig): GameState {
  let state = createGameState({
    factions: config.factions,
    advancedRules: config.advancedRules ?? true,
  });

  // Set phase and turn
  state.phase = config.phase ?? Phase.BATTLE;
  state.turn = config.turn ?? 1;
  state.setupComplete = true;

  // Clear all starting forces from board (we'll place our own)
  // This ensures we have full control over force placement
  for (const faction of config.factions) {
    const factionState = getFactionState(state, faction);
    // Move all on-board forces to reserves
    for (const stack of factionState.forces.onBoard) {
      const totalForces = (stack.forces.regular || 0) + (stack.forces.elite || 0);
      if (totalForces > 0) {
        // Add to reserves
        factionState.forces.reserves.regular += stack.forces.regular || 0;
        factionState.forces.reserves.elite += stack.forces.elite || 0;
      }
    }
    // Clear on-board forces
    factionState.forces.onBoard = [];
  }

  // Set spice for each faction (only if faction is in the game)
  if (config.spice) {
    for (const [faction, amount] of config.spice.entries()) {
      if (state.factions.has(faction)) {
        state = addSpice(state, faction, amount);
      }
    }
  }

  // Place forces
  // First, ensure all factions have enough forces in reserves
  if (config.forces) {
    // Calculate total forces needed per faction
    const forcesNeeded = new Map<Faction, { regular: number; elite: number }>();
    for (const force of config.forces) {
      const current = forcesNeeded.get(force.faction) || { regular: 0, elite: 0 };
      forcesNeeded.set(force.faction, {
        regular: current.regular + force.regular,
        elite: current.elite + (force.elite ?? 0),
      });
    }

    // Add forces to reserves first
    for (const [faction, needed] of forcesNeeded.entries()) {
      const factionState = getFactionState(state, faction);
      // Add regular forces to reserves
      if (needed.regular > 0) {
        factionState.forces.reserves.regular += needed.regular;
      }
      // Add elite forces to reserves
      if (needed.elite > 0) {
        factionState.forces.reserves.elite += needed.elite;
      }
    }

    // Now ship forces to territories
    for (const force of config.forces) {
      // Ship regular forces
      if (force.regular > 0) {
        state = shipForces(
          state,
          force.faction,
          force.territory,
          force.sector,
          force.regular,
          false
        );
      }
      // Ship elite forces
      if (force.elite && force.elite > 0) {
        state = shipForces(
          state,
          force.faction,
          force.territory,
          force.sector,
          force.elite,
          true
        );
      }
      
      // BG-specific: Convert advisors to fighters for battle
      if (force.faction === Faction.BENE_GESSERIT) {
        const factionState = getFactionState(state, force.faction);
        const stack = factionState.forces.onBoard.find(
          s => s.territoryId === force.territory && s.sector === force.sector
        );
        if (stack && stack.advisors !== undefined && stack.advisors > 0) {
          // Convert all advisors to fighters for battle
          stack.advisors = 0; // All become fighters
          // The forces are already there, we just need to remove the advisor flag
        }
      }
    }
  }

  // Add spice to territories
  if (config.territorySpice) {
    for (const spice of config.territorySpice) {
      state = addSpiceToTerritory(
        state,
        spice.territory,
        spice.sector,
        spice.amount
      );
    }
  }

  // Form alliances
  if (config.alliances) {
    for (const [faction1, faction2] of config.alliances) {
      state = formAlliance(state, faction1, faction2);
    }
  }

  // Set special faction states
  if (config.specialStates) {
    // Atreides: Kwisatz Haderach
    if (config.specialStates.atreides?.kwisatzHaderachActive) {
      const atreidesState = getFactionState(state, Faction.ATREIDES);
      if (atreidesState.kwisatzHaderach) {
        atreidesState.kwisatzHaderach.isActive = true;
      }
    }

    // Bene Gesserit: Prediction
    if (config.specialStates.bg?.prediction) {
      const bgState = getFactionState(state, Faction.BENE_GESSERIT);
      if (bgState.beneGesseritPrediction) {
        bgState.beneGesseritPrediction = config.specialStates.bg.prediction;
      }
    }
  }

  return state;
}

/**
 * Add a specific card to a faction's hand
 */
export function addCardToHand(
  state: GameState,
  faction: Faction,
  cardId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const cardDef = getTreacheryCardDefinition(cardId);
  
  if (!cardDef) {
    throw new Error(`Card not found: ${cardId}`);
  }

  // Add to hand
  factionState.hand.push({
    definitionId: cardDef.id,
    type: cardDef.type,
    location: CardLocation.HAND,
    ownerId: faction,
  });

  // Remove from deck if present
  const deckIndex = state.treacheryDeck.findIndex(
    c => c.definitionId === cardDef.id
  );
  if (deckIndex >= 0) {
    state.treacheryDeck.splice(deckIndex, 1);
  }

  return state;
}

/**
 * Add a traitor card to a faction
 */
export function addTraitorCard(
  state: GameState,
  faction: Faction,
  targetLeaderId: string,
  targetFaction: Faction
): GameState {
  const factionState = getFactionState(state, faction);
  const leaderDef = getLeaderDefinition(targetLeaderId);
  if (!leaderDef) {
    throw new Error(`Leader not found: ${targetLeaderId}`);
  }
  factionState.traitors.push({
    leaderId: targetLeaderId,
    leaderName: leaderDef.name,
    leaderFaction: targetFaction,
    heldBy: faction,
  });
  return state;
}

/**
 * Get a leader from a faction's pool
 */
export function getLeaderFromPool(
  state: GameState,
  faction: Faction,
  leaderId?: string
): string | null {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.filter(
    l => l.location === LeaderLocation.LEADER_POOL
  );
  
  if (leaders.length === 0) {
    return null;
  }

  if (leaderId) {
    const leader = leaders.find(l => l.definitionId === leaderId);
    return leader ? leader.definitionId : null;
  }

  return leaders[0].definitionId;
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

