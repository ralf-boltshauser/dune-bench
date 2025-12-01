/**
 * Synchronized State Manager
 * 
 * Centralized state management with automatic synchronization to agent provider.
 * This ensures state is always synced without requiring manual calls at every update location.
 * 
 * Usage:
 * ```typescript
 * const stateManager = new SynchronizedStateManager(initialState, agentProvider);
 * 
 * // Update state - automatically syncs
 * stateManager.updateState(newState);
 * 
 * // Apply mutation - automatically syncs
 * stateManager.mutate(state => ({ ...state, turn: state.turn + 1 }));
 * 
 * // Apply handler result - automatically syncs
 * const result = handler.processStep(stateManager.state, responses);
 * stateManager.applyStepResult(result);
 * 
 * // Get current state
 * const currentState = stateManager.state;
 * ```
 */

import type { GameState } from '../types';
import type { PhaseStepResult } from '../phases/types';

/**
 * Interface for agent provider that can sync state
 */
export interface StateSyncTarget {
  updateState?(state: GameState): void;
  getState?(): GameState;
}

/**
 * Synchronized State Manager
 * 
 * Wraps game state and automatically synchronizes to agent provider on every update.
 * This eliminates the need to manually call updateState() at every state change location.
 */
export class SynchronizedStateManager {
  private _state: GameState;
  private syncTarget: StateSyncTarget;
  private syncEnabled: boolean = true;
  private syncCount: number = 0;

  constructor(initialState: GameState, syncTarget: StateSyncTarget) {
    this._state = initialState;
    this.syncTarget = syncTarget;
    // Initial sync
    this.sync();
  }

  /**
   * Get current state (read-only)
   */
  get state(): GameState {
    return this._state;
  }

  /**
   * Update state and automatically sync
   */
  updateState(newState: GameState): void {
    this._state = newState;
    this.sync();
  }

  /**
   * Apply a mutation function and automatically sync
   * Useful for immutable updates
   */
  mutate(mutator: (state: GameState) => GameState): void {
    this._state = mutator(this._state);
    this.sync();
  }

  /**
   * Apply a PhaseStepResult and automatically sync
   * This is the most common pattern when working with phase handlers
   */
  applyStepResult(result: PhaseStepResult): void {
    this._state = result.state;
    this.sync();
  }

  /**
   * Update state from agent provider (for tool updates)
   * This syncs FROM the agent provider TO our state
   */
  syncFromAgent(): void {
    if (this.syncTarget.getState) {
      const agentState = this.syncTarget.getState();
      if (agentState) {
        this._state = agentState;
        // Don't sync back - we're syncing FROM agent
      }
    }
  }

  /**
   * Temporarily disable sync (for batch updates)
   * Sync will be re-enabled and executed after the function completes
   */
  withoutSync<T>(fn: () => T): T {
    const wasEnabled = this.syncEnabled;
    this.syncEnabled = false;
    try {
      return fn();
    } finally {
      this.syncEnabled = wasEnabled;
      if (wasEnabled) {
        this.sync();
      }
    }
  }

  /**
   * Get sync statistics (for debugging)
   */
  getSyncStats(): { count: number; enabled: boolean } {
    return {
      count: this.syncCount,
      enabled: this.syncEnabled,
    };
  }

  /**
   * Internal sync method
   */
  private sync(): void {
    if (!this.syncEnabled) return;
    
    if (this.syncTarget.updateState) {
      this.syncTarget.updateState(this._state);
      this.syncCount++;
    }
  }
}

