/**
 * Test State Builder for Combat Rules Tests
 * 
 * Fluent builder for creating game states with specific configurations.
 */

import { createGameState } from '../../../../state/factory.js';
import {
  shipForces,
  addSpice,
  getFactionState,
} from '../../../../state/index.js';
import {
  Faction,
  Phase,
  TerritoryId,
  LeaderLocation,
  CardLocation,
  TreacheryCardType,
  type GameState,
} from '../../../../types/index.js';
import { getTreacheryCardDefinition, getLeaderDefinition } from '../../../../data/index.js';

export interface CombatTestStateConfig {
  factions?: Faction[];
  advancedRules?: boolean;
  turn?: number;
  territory?: TerritoryId;
  sector?: number;
  forces?: {
    faction: Faction;
    territory: TerritoryId;
    sector: number;
    regular: number;
    elite?: number;
  }[];
  spice?: Map<Faction, number>;
  leaders?: {
    faction: Faction;
    leaderId: string;
    location: LeaderLocation;
  }[];
  cards?: {
    faction: Faction;
    cardId: string;
    type: TreacheryCardType;
  }[];
  kwisatzHaderach?: {
    faction: Faction;
    isActive: boolean;
    isDead: boolean;
    forcesLostCount: number;
    usedInTerritoryThisTurn?: TerritoryId | null;
  };
}

export class CombatTestStateBuilder {
  private config: CombatTestStateConfig = {};

  static create(): CombatTestStateBuilder {
    return new CombatTestStateBuilder();
  }

  withFactions(factions: Faction[]): this {
    this.config.factions = factions;
    return this;
  }

  withAdvancedRules(enabled: boolean = true): this {
    this.config.advancedRules = enabled;
    return this;
  }

  withBasicRules(): this {
    this.config.advancedRules = false;
    return this;
  }

  withTurn(turn: number): this {
    this.config.turn = turn;
    return this;
  }

  withForces(faction: Faction, territory: TerritoryId, sector: number, regular: number, elite?: number): this {
    if (!this.config.forces) this.config.forces = [];
    this.config.forces.push({ faction, territory, sector, regular, elite });
    return this;
  }

  withSpice(faction: Faction, amount: number): this {
    if (!this.config.spice) this.config.spice = new Map();
    this.config.spice.set(faction, amount);
    return this;
  }

  withLeader(faction: Faction, leaderId: string, location: LeaderLocation = LeaderLocation.LEADER_POOL): this {
    if (!this.config.leaders) this.config.leaders = [];
    this.config.leaders.push({ faction, leaderId, location });
    return this;
  }

  withAllLeadersInTanks(faction: Faction): this {
    // Mark that all leaders should be in tanks - will be applied in build()
    if (!this.config.leaders) this.config.leaders = [];
    // We'll handle this in build() by checking for a special marker
    // For now, we'll set a flag that build() can use
    (this.config as any)._allLeadersInTanks = (this.config as any)._allLeadersInTanks || [];
    (this.config as any)._allLeadersInTanks.push(faction);
    return this;
  }

  withCard(faction: Faction, cardId: string, type: TreacheryCardType): this {
    if (!this.config.cards) this.config.cards = [];
    this.config.cards.push({ faction, cardId, type });
    return this;
  }

  withKwisatzHaderach(faction: Faction, config: {
    isActive: boolean;
    isDead?: boolean;
    forcesLostCount: number;
    usedInTerritoryThisTurn?: TerritoryId | null;
  }): this {
    this.config.kwisatzHaderach = { faction, isDead: false, ...config };
    return this;
  }

  /**
   * Set leader as used in a territory this turn
   */
  withLeaderUsed(faction: Faction, leaderId: string, territoryId: TerritoryId): this {
    if (!this.config.leaders) this.config.leaders = [];
    // Mark leader as used - will be applied in build()
    (this.config as any)._leadersUsed = (this.config as any)._leadersUsed || [];
    (this.config as any)._leadersUsed.push({ faction, leaderId, territoryId });
    return this;
  }

  /**
   * Set leader as on board in a territory
   */
  withLeaderOnBoard(faction: Faction, leaderId: string, territoryId: TerritoryId): this {
    if (!this.config.leaders) this.config.leaders = [];
    this.config.leaders.push({ faction, leaderId, location: LeaderLocation.ON_BOARD });
    // Mark territory - will be applied in build()
    (this.config as any)._leadersOnBoard = (this.config as any)._leadersOnBoard || [];
    (this.config as any)._leadersOnBoard.push({ faction, leaderId, territoryId });
    return this;
  }

  build(): GameState {
    let state = createGameState({
      factions: this.config.factions || [Faction.ATREIDES, Faction.HARKONNEN],
      advancedRules: this.config.advancedRules ?? false,
    });

    state.phase = Phase.BATTLE;
    state.turn = this.config.turn ?? 1;
    state.setupComplete = true;

    // Clear starting forces and move to reserves
    for (const faction of this.config.factions || []) {
      const factionState = getFactionState(state, faction);
      for (const stack of factionState.forces.onBoard) {
        const totalForces = (stack.forces.regular || 0) + (stack.forces.elite || 0);
        if (totalForces > 0) {
          factionState.forces.reserves.regular += stack.forces.regular || 0;
          factionState.forces.reserves.elite += stack.forces.elite || 0;
        }
      }
      factionState.forces.onBoard = [];
    }

    // Set spice
    if (this.config.spice) {
      for (const [faction, amount] of this.config.spice.entries()) {
        if (state.factions.has(faction)) {
          state = addSpice(state, faction, amount);
        }
      }
    }

    // Place forces
    if (this.config.forces) {
      // First ensure reserves have enough forces
      const forcesNeeded = new Map<Faction, { regular: number; elite: number }>();
      for (const force of this.config.forces) {
        const current = forcesNeeded.get(force.faction) || { regular: 0, elite: 0 };
        forcesNeeded.set(force.faction, {
          regular: current.regular + force.regular,
          elite: current.elite + (force.elite ?? 0),
        });
      }

      // Add to reserves
      for (const [faction, needed] of forcesNeeded.entries()) {
        const factionState = getFactionState(state, faction);
        if (needed.regular > 0) {
          factionState.forces.reserves.regular += needed.regular;
        }
        if (needed.elite > 0) {
          factionState.forces.reserves.elite += needed.elite;
        }
      }

      // Ship forces
      for (const force of this.config.forces) {
        if (force.regular > 0) {
          state = shipForces(state, force.faction, force.territory, force.sector, force.regular, false);
        }
        if (force.elite && force.elite > 0) {
          state = shipForces(state, force.faction, force.territory, force.sector, force.elite, true);
        }
      }
    }

    // Set leader locations
    if (this.config.leaders) {
      for (const leaderConfig of this.config.leaders) {
        const factionState = getFactionState(state, leaderConfig.faction);
        const leader = factionState.leaders.find(l => l.definitionId === leaderConfig.leaderId);
        if (leader) {
          leader.location = leaderConfig.location;
        }
      }
    }

    // Handle all leaders in tanks
    const allLeadersInTanks = (this.config as any)._allLeadersInTanks as Faction[] | undefined;
    if (allLeadersInTanks) {
      for (const faction of allLeadersInTanks) {
        const factionState = getFactionState(state, faction);
        for (const leader of factionState.leaders) {
          leader.location = LeaderLocation.TANKS_FACE_UP;
        }
      }
    }

    // Clear hands first (to avoid default cards interfering with tests)
    for (const faction of this.config.factions || []) {
      const factionState = getFactionState(state, faction);
      factionState.hand = [];
    }

    // Add cards to hand
    if (this.config.cards) {
      for (const cardConfig of this.config.cards) {
        const factionState = getFactionState(state, cardConfig.faction);
        const cardDef = getTreacheryCardDefinition(cardConfig.cardId);
        if (cardDef) {
          factionState.hand.push({
            definitionId: cardDef.id,
            type: cardDef.type,
            location: CardLocation.HAND,
            ownerId: cardConfig.faction,
          });
        }
      }
    }

    // Set Kwisatz Haderach
    if (this.config.kwisatzHaderach) {
      const factionState = getFactionState(state, this.config.kwisatzHaderach.faction);
      if (factionState.kwisatzHaderach) {
        factionState.kwisatzHaderach.isActive = this.config.kwisatzHaderach.isActive;
        factionState.kwisatzHaderach.isDead = this.config.kwisatzHaderach.isDead ?? false;
        factionState.kwisatzHaderach.forcesLostCount = this.config.kwisatzHaderach.forcesLostCount;
        factionState.kwisatzHaderach.usedInTerritoryThisTurn = this.config.kwisatzHaderach.usedInTerritoryThisTurn ?? null;
      }
    }

    return state;
  }
}

/**
 * Preset state builders for common scenarios
 */
export const CombatTestStatePresets = {
  /**
   * Basic two-faction battle setup
   */
  basicBattle(faction1: Faction, faction2: Faction, territory: TerritoryId = TerritoryId.ARRAKEEN): GameState {
    return CombatTestStateBuilder.create()
      .withFactions([faction1, faction2])
      .withBasicRules()
      .withForces(faction1, territory, 0, 5)
      .withForces(faction2, territory, 0, 5)
      .withSpice(faction1, 10)
      .withSpice(faction2, 10)
      .build();
  },

  /**
   * Advanced rules battle with spice dialing
   */
  advancedBattle(faction1: Faction, faction2: Faction, territory: TerritoryId = TerritoryId.ARRAKEEN): GameState {
    return CombatTestStateBuilder.create()
      .withFactions([faction1, faction2])
      .withAdvancedRules()
      .withForces(faction1, territory, 0, 5)
      .withForces(faction2, territory, 0, 5)
      .withSpice(faction1, 10)
      .withSpice(faction2, 10)
      .build();
  },

  /**
   * Battle with elite forces
   */
  eliteForcesBattle(faction: Faction, opponent: Faction, territory: TerritoryId = TerritoryId.ARRAKEEN): GameState {
    return CombatTestStateBuilder.create()
      .withFactions([faction, opponent])
      .withAdvancedRules()
      .withForces(faction, territory, 0, 5, 5) // 5 regular + 5 elite
      .withForces(opponent, territory, 0, 5)
      .withSpice(faction, 10)
      .withSpice(opponent, 10)
      .build();
  },

  /**
   * Battle with no leaders available (Cheap Hero required)
   */
  noLeadersBattle(faction: Faction, opponent: Faction, territory: TerritoryId = TerritoryId.ARRAKEEN): GameState {
    const builder = CombatTestStateBuilder.create()
      .withFactions([faction, opponent])
      .withForces(faction, territory, 0, 5)
      .withForces(opponent, territory, 0, 5)
      .withAllLeadersInTanks(faction) // Put all leaders in tanks
      .withCard(faction, 'cheap_hero_1', TreacheryCardType.SPECIAL); // Add Cheap Hero card

    return builder.build();
  },

  /**
   * Battle with Kwisatz Haderach active
   */
  kwisatzHaderachBattle(faction: Faction, opponent: Faction, territory: TerritoryId = TerritoryId.ARRAKEEN): GameState {
    return CombatTestStateBuilder.create()
      .withFactions([faction, opponent])
      .withForces(faction, territory, 0, 5)
      .withForces(opponent, territory, 0, 5)
      .withKwisatzHaderach(faction, {
        isActive: true,
        isDead: false,
        forcesLostCount: 7,
      })
      .build();
  },
};

