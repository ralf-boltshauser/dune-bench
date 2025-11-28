/**
 * Test State Builder for Spice Blow Phase
 * 
 * Helper utilities for creating test game states with specific spice deck configurations.
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
  type GameState,
  type SpiceCard,
  SpiceCardLocation,
} from '../../../types';
import { getSpiceCardDefinition } from '../../../data';

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
  factions: Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  stormSector?: number;
  forces?: ForcePlacement[];
  spice?: Map<Faction, number>;
  territorySpice?: SpicePlacement[];
  alliances?: Array<[Faction, Faction]>;
  spiceDeckA?: string[]; // Card definition IDs in order (top to bottom)
  spiceDeckB?: string[]; // Card definition IDs in order (top to bottom)
  spiceDiscardA?: string[]; // Card definition IDs already in discard pile A
  spiceDiscardB?: string[]; // Card definition IDs already in discard pile B
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
  state.phase = config.phase ?? Phase.SPICE_BLOW;
  state.turn = config.turn ?? 1;
  state.setupComplete = true;

  // Set storm sector
  if (config.stormSector !== undefined) {
    state.stormSector = config.stormSector;
  }

  // Clear all starting forces from board (we'll place our own)
  for (const faction of config.factions) {
    const factionState = getFactionState(state, faction);
    // Move all on-board forces to reserves
    for (const stack of factionState.forces.onBoard) {
      const totalForces = (stack.forces.regular || 0) + (stack.forces.elite || 0);
      if (totalForces > 0) {
        factionState.forces.reserves.regular += stack.forces.regular || 0;
        factionState.forces.reserves.elite += stack.forces.elite || 0;
      }
    }
    // Clear on-board forces
    factionState.forces.onBoard = [];
  }

  // Set spice for each faction
  if (config.spice) {
    for (const [faction, amount] of config.spice.entries()) {
      if (state.factions.has(faction)) {
        state = addSpice(state, faction, amount);
      }
    }
  }

  // Place forces
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
      if (needed.regular > 0) {
        factionState.forces.reserves.regular += needed.regular;
      }
      if (needed.elite > 0) {
        factionState.forces.reserves.elite += needed.elite;
      }
    }

    // Now ship forces to territories
    for (const force of config.forces) {
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

  // Set up spice decks
  if (config.spiceDeckA) {
    state.spiceDeckA = config.spiceDeckA.map(cardId => {
      const cardDef = getSpiceCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Spice card not found: ${cardId}`);
      }
      return {
        definitionId: cardDef.id,
        type: cardDef.type,
        location: SpiceCardLocation.DECK,
      };
    });
  }

  if (config.spiceDeckB) {
    state.spiceDeckB = config.spiceDeckB.map(cardId => {
      const cardDef = getSpiceCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Spice card not found: ${cardId}`);
      }
      return {
        definitionId: cardDef.id,
        type: cardDef.type,
        location: SpiceCardLocation.DECK,
      };
    });
  }

  // Set up discard piles
  if (config.spiceDiscardA) {
    state.spiceDiscardA = config.spiceDiscardA.map(cardId => {
      const cardDef = getSpiceCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Spice card not found: ${cardId}`);
      }
      return {
        definitionId: cardDef.id,
        type: cardDef.type,
        location: SpiceCardLocation.DISCARD_A,
      };
    });
  }

  if (config.spiceDiscardB) {
    state.spiceDiscardB = config.spiceDiscardB.map(cardId => {
      const cardDef = getSpiceCardDefinition(cardId);
      if (!cardDef) {
        throw new Error(`Spice card not found: ${cardId}`);
      }
      return {
        definitionId: cardDef.id,
        type: cardDef.type,
        location: SpiceCardLocation.DISCARD_B,
      };
    });
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

