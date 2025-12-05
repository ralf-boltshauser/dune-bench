/**
 * Test State Builder for Storm Phase Tests
 * 
 * Helper utilities for creating test game states with specific storm phase configurations.
 */

import { createGameState } from '../../../state/factory';
import {
  shipForces,
  addSpice,
  addSpiceToTerritory,
  getFactionState,
  moveStorm,
} from '../../../state';
import {
  Faction,
  Phase,
  TerritoryId,
  type GameState,
} from '../../../types';
import { buildTestState as buildBaseTestState, getDefaultSpice } from '../../battle/helpers/test-state-builder';
import { addCardToHand } from '../../battle/helpers/test-state-builder';

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
  playerPositions?: Map<Faction, number>; // Custom player positions
  forces?: ForcePlacement[];
  spice?: Map<Faction, number>;
  territorySpice?: SpicePlacement[];
  cards?: Array<{ faction: Faction; cardId: string }>; // Cards to add to hands
  shieldWallDestroyed?: boolean; // For testing Family Atomics effects
}

/**
 * Build a test game state for storm phase testing
 */
export function buildTestState(config: TestStateConfig): GameState {
  // Use base test state builder
  let state = buildBaseTestState({
    factions: config.factions,
    phase: config.phase ?? Phase.STORM,
    turn: config.turn ?? 1,
    advancedRules: config.advancedRules ?? true,
    forces: config.forces,
    spice: config.spice ?? getDefaultSpice(),
    territorySpice: config.territorySpice,
  });

  // Set storm sector
  if (config.stormSector !== undefined) {
    state = moveStorm(state, config.stormSector);
  }

  // Set custom player positions if provided
  if (config.playerPositions) {
    state.playerPositions = new Map(config.playerPositions);
  }

  // Set shield wall destroyed state
  if (config.shieldWallDestroyed !== undefined) {
    state.shieldWallDestroyed = config.shieldWallDestroyed;
  }

  // Add cards to hands
  if (config.cards) {
    for (const { faction, cardId } of config.cards) {
      state = addCardToHand(state, faction, cardId);
    }
  }

  return state;
}

/**
 * Set player position for a faction
 */
export function setPlayerPosition(
  state: GameState,
  faction: Faction,
  sector: number
): GameState {
  const newState = { ...state };
  newState.playerPositions = new Map(state.playerPositions);
  newState.playerPositions.set(faction, sector);
  return newState;
}

/**
 * Fluent builder for storm test states
 */
export class StormTestStateBuilder {
  private config: Partial<TestStateConfig> = {};

  /**
   * Set factions
   */
  withFactions(factions: Faction[]): this {
    this.config.factions = factions;
    return this;
  }

  /**
   * Set turn
   */
  withTurn(turn: number): this {
    this.config.turn = turn;
    return this;
  }

  /**
   * Set storm sector
   */
  withStormSector(sector: number): this {
    this.config.stormSector = sector;
    return this;
  }

  /**
   * Set advanced rules
   */
  withAdvancedRules(enabled: boolean): this {
    this.config.advancedRules = enabled;
    return this;
  }

  /**
   * Set player position
   */
  withPlayerPosition(faction: Faction, sector: number): this {
    if (!this.config.playerPositions) {
      this.config.playerPositions = new Map();
    }
    this.config.playerPositions.set(faction, sector);
    return this;
  }

  /**
   * Set multiple player positions
   */
  withPlayerPositions(positions: Map<Faction, number>): this {
    this.config.playerPositions = new Map(positions);
    return this;
  }

  /**
   * Add forces
   */
  withForces(placement: ForcePlacement): this {
    if (!this.config.forces) {
      this.config.forces = [];
    }
    this.config.forces.push(placement);
    return this;
  }

  /**
   * Add multiple forces
   */
  withMultipleForces(placements: ForcePlacement[]): this {
    if (!this.config.forces) {
      this.config.forces = [];
    }
    this.config.forces.push(...placements);
    return this;
  }

  /**
   * Add spice to faction
   */
  withSpice(faction: Faction, amount: number): this {
    if (!this.config.spice) {
      this.config.spice = new Map();
    }
    this.config.spice.set(faction, amount);
    return this;
  }

  /**
   * Add territory spice
   */
  withTerritorySpice(placement: SpicePlacement): this {
    if (!this.config.territorySpice) {
      this.config.territorySpice = [];
    }
    this.config.territorySpice.push(placement);
    return this;
  }

  /**
   * Add card to faction hand
   */
  withCard(faction: Faction, cardId: string): this {
    if (!this.config.cards) {
      this.config.cards = [];
    }
    this.config.cards.push({ faction, cardId });
    return this;
  }

  /**
   * Set shield wall destroyed
   */
  withShieldWallDestroyed(destroyed: boolean): this {
    this.config.shieldWallDestroyed = destroyed;
    return this;
  }

  /**
   * Set Fremen storm card
   */
  withFremenStormCard(cardValue: string): this {
    // This will be handled in build() method
    (this.config as any).fremenStormCard = cardValue;
    return this;
  }

  /**
   * Set storm deck
   */
  withStormDeck(deck: number[]): this {
    (this.config as any).stormDeck = deck;
    return this;
  }

  /**
   * Add protected leaders to a territory
   */
  withProtectedLeaders(
    faction: Faction,
    territory: TerritoryId,
    leaders: string[]
  ): this {
    // This will be handled in build() method
    if (!(this.config as any).protectedLeaders) {
      (this.config as any).protectedLeaders = [];
    }
    (this.config as any).protectedLeaders.push({ faction, territory, leaders });
    return this;
  }

  /**
   * Set territory protection status (for testing Family Atomics effects)
   */
  withTerritoryProtection(territory: TerritoryId, isProtected: boolean): this {
    if (!(this.config as any).territoryProtection) {
      (this.config as any).territoryProtection = new Map();
    }
    (this.config as any).territoryProtection.set(territory, isProtected);
    return this;
  }

  /**
   * Build the final state
   */
  build(): GameState {
    if (!this.config.factions) {
      throw new Error('Factions must be specified');
    }

    let state = buildTestState({
      factions: this.config.factions,
      phase: this.config.phase ?? Phase.STORM,
      turn: this.config.turn ?? 1,
      advancedRules: this.config.advancedRules ?? true,
      stormSector: this.config.stormSector,
      playerPositions: this.config.playerPositions,
      forces: this.config.forces,
      spice: this.config.spice,
      territorySpice: this.config.territorySpice,
      cards: this.config.cards,
      shieldWallDestroyed: this.config.shieldWallDestroyed,
    });

    // Handle Fremen storm card
    if ((this.config as any).fremenStormCard && state.factions.has(Faction.FREMEN)) {
      const fremenState = getFactionState(state, Faction.FREMEN);
      const updatedFremenState = {
        ...fremenState,
        fremenStormCard: (this.config as any).fremenStormCard,
      };
      const updatedFactions = new Map(state.factions);
      updatedFactions.set(Faction.FREMEN, updatedFremenState);
      state = { ...state, factions: updatedFactions };
    }

    // Handle storm deck
    if ((this.config as any).stormDeck) {
      state = { ...state, stormDeck: (this.config as any).stormDeck };
    }

    return state;
  }

  /**
   * Static factory for Turn 1
   */
  static forTurn1(factions: Faction[]): StormTestStateBuilder {
    return new StormTestStateBuilder()
      .withFactions(factions)
      .withTurn(1)
      .withAdvancedRules(true);
  }

  /**
   * Static factory for Turn 2+
   */
  static forTurn2(factions: Faction[], stormSector: number): StormTestStateBuilder {
    return new StormTestStateBuilder()
      .withFactions(factions)
      .withTurn(2)
      .withStormSector(stormSector)
      .withAdvancedRules(true);
  }

  /**
   * Static factory with Fremen
   */
  static withFremen(factions: Faction[], turn: number): StormTestStateBuilder {
    return new StormTestStateBuilder()
      .withFactions(factions)
      .withTurn(turn)
      .withAdvancedRules(true);
  }
}

