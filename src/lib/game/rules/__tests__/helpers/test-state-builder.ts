/**
 * Test state builder for movement rules tests.
 * Fluent API for creating game states with specific configurations.
 */

import { Faction, TerritoryId, Phase } from '../../../types';
import type { GameState } from '../../../types';
import { createGameState, addSpice, shipForces, formAlliance, getFactionState } from '../../../state';

export interface ForcePlacement {
  faction: Faction;
  territory: TerritoryId;
  sector: number;
  regular: number;
  elite?: number;
}

export class MovementTestStateBuilder {
  private config: {
    factions: Faction[];
    phase?: Phase;
    turn?: number;
    advancedRules?: boolean;
    stormSector?: number;
    forces?: ForcePlacement[];
    spice?: Map<Faction, number>;
    reserves?: Map<Faction, { regular: number; elite?: number }>;
    alliances?: Array<[Faction, Faction]>;
    bgAdvisors?: Array<{ territory: TerritoryId; sector: number; count: number }>;
  } = {
    factions: [],
  };

  static create(): MovementTestStateBuilder {
    return new MovementTestStateBuilder();
  }

  withFactions(factions: Faction[]): this {
    this.config.factions = factions;
    return this;
  }

  withPhase(phase: Phase): this {
    this.config.phase = phase;
    return this;
  }

  withTurn(turn: number): this {
    this.config.turn = turn;
    return this;
  }

  withAdvancedRules(enabled: boolean = true): this {
    this.config.advancedRules = enabled;
    return this;
  }

  withStormSector(sector: number): this {
    this.config.stormSector = sector;
    return this;
  }

  withForces(forces: ForcePlacement[]): this {
    this.config.forces = forces;
    return this;
  }

  withForce(
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    regular: number,
    elite?: number
  ): this {
    if (!this.config.forces) this.config.forces = [];
    this.config.forces.push({ faction, territory, sector, regular, elite });
    return this;
  }

  withSpice(faction: Faction, amount: number): this {
    if (!this.config.spice) this.config.spice = new Map();
    this.config.spice.set(faction, amount);
    return this;
  }

  withReserves(faction: Faction, regular: number, elite?: number): this {
    if (!this.config.reserves) this.config.reserves = new Map();
    this.config.reserves.set(faction, { regular, elite });
    return this;
  }

  withAlliance(faction1: Faction, faction2: Faction): this {
    if (!this.config.alliances) this.config.alliances = [];
    this.config.alliances.push([faction1, faction2]);
    return this;
  }

  withBGAdvisors(territory: TerritoryId, sector: number, count: number): this {
    if (!this.config.bgAdvisors) this.config.bgAdvisors = [];
    this.config.bgAdvisors.push({ territory, sector, count });
    return this;
  }

  build(): GameState {
    // Ensure at least 2 factions (game requirement)
    const factions = this.config.factions.length >= 2
      ? this.config.factions
      : [...this.config.factions, Faction.HARKONNEN]; // Add a default second faction if needed

    let state = createGameState({
      factions,
      advancedRules: this.config.advancedRules ?? false,
    });

    // Set phase and turn
    if (this.config.phase) state.phase = this.config.phase;
    if (this.config.turn) state.turn = this.config.turn;
    if (this.config.stormSector !== undefined) state.stormSector = this.config.stormSector;

    // Clear starting forces from board and reserves (we'll place our own for precise control)
    for (const faction of this.config.factions) {
      const factionState = getFactionState(state, faction);
      // Move all on-board forces to reserves first
      for (const stack of factionState.forces.onBoard) {
        const totalForces = (stack.forces.regular || 0) + (stack.forces.elite || 0);
        if (totalForces > 0) {
          factionState.forces.reserves.regular += stack.forces.regular || 0;
          factionState.forces.reserves.elite += stack.forces.elite || 0;
        }
      }
      // Clear on-board forces
      factionState.forces.onBoard = [];
      // Clear starting reserves if we're setting our own
      if (this.config.reserves && this.config.reserves.has(faction)) {
        factionState.forces.reserves.regular = 0;
        factionState.forces.reserves.elite = 0;
      }
    }

    // Add spice
    if (this.config.spice) {
      for (const [faction, amount] of this.config.spice.entries()) {
        state = addSpice(state, faction, amount);
      }
    }

    // Add reserves
    if (this.config.reserves) {
      for (const [faction, forces] of this.config.reserves.entries()) {
        const factionState = getFactionState(state, faction);
        factionState.forces.reserves.regular += forces.regular;
        if (forces.elite) {
          factionState.forces.reserves.elite += forces.elite;
        }
      }
    }

    // Place forces on board
    if (this.config.forces) {
      // First, ensure all factions have enough forces in reserves
      const forcesNeeded = new Map<Faction, { regular: number; elite: number }>();
      for (const force of this.config.forces) {
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
      for (const force of this.config.forces) {
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

    // Form alliances
    if (this.config.alliances) {
      for (const [f1, f2] of this.config.alliances) {
        state = formAlliance(state, f1, f2);
      }
    }

    // Add BG advisors (advanced rules only)
    if (this.config.bgAdvisors && this.config.advancedRules) {
      const bgFaction = this.config.factions.find(f => f === Faction.BENE_GESSERIT);
      if (bgFaction) {
        const bgState = getFactionState(state, bgFaction);
        for (const advisor of this.config.bgAdvisors) {
          // Find or create stack
          let stack = bgState.forces.onBoard.find(
            s => s.territoryId === advisor.territory && s.sector === advisor.sector
          );
          if (!stack) {
            stack = {
              factionId: bgFaction,
              territoryId: advisor.territory,
              sector: advisor.sector,
              forces: { regular: 0, elite: 0 },
              advisors: 0,
            };
            bgState.forces.onBoard.push(stack);
          }
          stack.advisors = (stack.advisors || 0) + advisor.count;
        }
      }
    }

    return state;
  }
}

/**
 * Convenience presets for common test scenarios
 */
export const TestStatePresets = {
  /**
   * Basic 2-faction state for simple tests
   */
  basicTwoFaction: () =>
    MovementTestStateBuilder.create()
      .withFactions([Faction.ATREIDES, Faction.HARKONNEN])
      .withPhase(Phase.SHIPMENT_MOVEMENT)
      .withTurn(1),

  /**
   * State with ornithopter access (forces in Arrakeen/Carthag)
   */
  withOrnithopters: (faction: Faction, territory: TerritoryId = TerritoryId.ARRAKEEN) =>
    MovementTestStateBuilder.create()
      .withFactions([faction])
      .withForce(faction, territory, territory === TerritoryId.ARRAKEEN ? 9 : 11, 5),

  /**
   * State with full stronghold (2 other factions)
   */
  withFullStronghold: (
    territory: TerritoryId,
    blockingFactions: [Faction, Faction],
    sector: number = 9
  ) =>
    MovementTestStateBuilder.create()
      .withFactions([Faction.ATREIDES, ...blockingFactions])
      .withForce(blockingFactions[0], territory, sector, 5)
      .withForce(blockingFactions[1], territory, sector, 5),

  /**
   * State with storm in specific sector
   */
  withStorm: (sector: number) =>
    MovementTestStateBuilder.create()
      .withFactions([Faction.ATREIDES])
      .withStormSector(sector),
};

