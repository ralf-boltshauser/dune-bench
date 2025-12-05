/**
 * Battle Context Manager
 *
 * Centralized context management for battle phase.
 * Provides immutable updates and validation.
 */

import { Faction, BattleSubPhase } from "../../../../types";
import type { BattlePhaseContext, CurrentBattle, PendingBattle } from "../../../types";
import { isBattleCapable } from "../utils";

/**
 * Manages battle phase context with immutable updates.
 */
export class BattleContextManager {
  constructor(private context: BattlePhaseContext) {}

  /**
   * Get readonly access to context.
   */
  getContext(): Readonly<BattlePhaseContext> {
    return this.context;
  }

  /**
   * Reset context for new phase.
   */
  reset(aggressorOrder: Faction[]): void {
    this.context.pendingBattles = [];
    this.context.currentBattleIndex = 0;
    this.context.currentBattle = null;
    this.context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;
    this.context.aggressorOrder = [...aggressorOrder];
    this.context.currentAggressorIndex = 0;
  }

  /**
   * Set pending battles.
   */
  setPendingBattles(battles: PendingBattle[]): void {
    this.context.pendingBattles = [...battles];
  }

  /**
   * Set current battle.
   */
  setCurrentBattle(battle: CurrentBattle): void {
    this.context.currentBattle = battle;
  }

  /**
   * Clear current battle.
   */
  clearCurrentBattle(): void {
    this.context.currentBattle = null;
  }

  /**
   * Update current battle with partial updates.
   */
  updateBattle(updates: Partial<CurrentBattle>): void {
    if (this.context.currentBattle) {
      this.context.currentBattle = {
        ...this.context.currentBattle,
        ...updates,
      };
    }
  }

  /**
   * Set sub-phase.
   */
  setSubPhase(subPhase: BattleSubPhase): void {
    this.context.subPhase = subPhase;
  }

  /**
   * Transition to a new sub-phase (same as setSubPhase but more explicit).
   */
  transitionTo(subPhase: BattleSubPhase): void {
    this.context.subPhase = subPhase;
  }

  /**
   * Move to next aggressor in storm order.
   */
  moveToNextAggressor(): void {
    this.context.currentAggressorIndex++;
  }

  /**
   * Get current aggressor.
   */
  getCurrentAggressor(): Faction | null {
    if (this.context.currentAggressorIndex >= this.context.aggressorOrder.length) {
      return null;
    }
    return this.context.aggressorOrder[this.context.currentAggressorIndex];
  }

  /**
   * Get available battles for current aggressor.
   */
  getAvailableBattlesForAggressor(
    state: any, // GameState - avoiding circular import
    availableBattles: PendingBattle[]
  ): PendingBattle[] {
    const aggressor = this.getCurrentAggressor();
    if (!aggressor) return [];

    return availableBattles.filter((b) => {
      if (!b.factions.includes(aggressor)) return false;
      // Use utility function for battle capability check
      return isBattleCapable(state, aggressor, b.territoryId, b.sector);
    });
  }

  /**
   * Check if there are pending battles.
   */
  hasPendingBattles(): boolean {
    return this.context.pendingBattles.length > 0;
  }

  /**
   * Get current battle.
   */
  getCurrentBattle(): CurrentBattle | null {
    return this.context.currentBattle;
  }

  /**
   * Update pending battles after a battle is resolved.
   */
  updatePendingBattles(
    updateFn: (battles: PendingBattle[]) => PendingBattle[]
  ): void {
    this.context.pendingBattles = updateFn([...this.context.pendingBattles]);
  }

  /**
   * Remove a battle by index.
   */
  removeBattle(battleIndex: number): void {
    if (battleIndex >= 0 && battleIndex < this.context.pendingBattles.length) {
      this.context.pendingBattles.splice(battleIndex, 1);
    }
  }
}

