/**
 * Battle-Specific State Builder
 * 
 * Composable builder for creating battle test states.
 * Extends test-state-builder with battle-specific helpers.
 */

import { Faction, TerritoryId, Phase } from '../../../types';
import { buildTestState, type TestStateConfig, type ForcePlacement } from '../helpers/test-state-builder';
import { BattleScenarios } from '../fixtures/battle-scenarios';
import { DefaultSpice } from '../fixtures/test-data';
import type { GameState } from '../../../types';

export class BattleStateBuilder {
  private config: Partial<TestStateConfig> = {
    phase: Phase.BATTLE,
    advancedRules: true,
    turn: 1,
  };

  /**
   * Start with a two-faction battle scenario
   */
  twoFactionBattle(
    faction1: Faction,
    faction2: Faction,
    territory: TerritoryId = TerritoryId.ARRAKEEN,
    sector: number = 9
  ): this {
    const scenario = BattleScenarios.twoFaction.basic(faction1, faction2, territory, sector);
    this.config.factions = scenario.factions;
    this.config.forces = scenario.forces;
    return this;
  }

  /**
   * Start with a three-faction battle scenario
   */
  threeFactionBattle(
    faction1: Faction,
    faction2: Faction,
    faction3: Faction,
    territory: TerritoryId = TerritoryId.ARRAKEEN,
    sector: number = 9
  ): this {
    const scenario = BattleScenarios.threeFaction.basic(faction1, faction2, faction3, territory, sector);
    this.config.factions = scenario.factions;
    this.config.forces = scenario.forces;
    return this;
  }

  /**
   * Add forces to a faction in a territory
   */
  addForces(
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    regular: number,
    elite: number = 0
  ): this {
    if (!this.config.forces) {
      this.config.forces = [];
    }
    this.config.forces.push({
      faction,
      territory,
      sector,
      regular,
      elite,
    });
    return this;
  }

  /**
   * Set spice for a faction
   */
  withSpice(faction: Faction, amount: number): this {
    if (!this.config.spice) {
      this.config.spice = new Map();
    }
    this.config.spice.set(faction, amount);
    return this;
  }

  /**
   * Set default spice for all factions
   */
  withDefaultSpice(): this {
    this.config.spice = DefaultSpice;
    return this;
  }

  /**
   * Add alliance between two factions
   */
  withAlliance(faction1: Faction, faction2: Faction): this {
    if (!this.config.alliances) {
      this.config.alliances = [];
    }
    this.config.alliances.push([faction1, faction2]);
    return this;
  }

  /**
   * Set advanced rules
   */
  withAdvancedRules(enabled: boolean = true): this {
    this.config.advancedRules = enabled;
    return this;
  }

  /**
   * Set turn number
   */
  withTurn(turn: number): this {
    this.config.turn = turn;
    return this;
  }

  /**
   * Set Atreides Kwisatz Haderach active
   */
  withKwisatzHaderach(): this {
    if (!this.config.specialStates) {
      this.config.specialStates = {};
    }
    this.config.specialStates.atreides = {
      kwisatzHaderachActive: true,
    };
    return this;
  }

  /**
   * Add spice to territory
   */
  withTerritorySpice(territory: TerritoryId, sector: number, amount: number): this {
    if (!this.config.territorySpice) {
      this.config.territorySpice = [];
    }
    this.config.territorySpice.push({ territory, sector, amount });
    return this;
  }

  /**
   * Build the final game state
   */
  build(): GameState {
    return buildTestState(this.config as TestStateConfig);
  }
}

