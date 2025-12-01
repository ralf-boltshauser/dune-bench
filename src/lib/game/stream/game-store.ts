/**
 * Game Store - High-level game data access
 *
 * This module provides a simplified API for accessing game data,
 * wrapping the underlying persistence layer. It adds:
 * - Convenience methods for common operations
 * - Metadata management from game state
 * - Backward compatibility with existing code
 *
 * For direct persistence operations, use the persistence layer directly.
 */

import type { GameState } from '../types';
import type { GameMetadata, StreamEvent } from './types';
import { fileStore } from './persistence';
import type { IGameStore } from './persistence';

// =============================================================================
// GAME STORE FACADE
// =============================================================================

/**
 * High-level game store that wraps the persistence layer
 */
export class GameStore {
  constructor(private readonly store: IGameStore = fileStore) {}

  // ---------------------------------------------------------------------------
  // State Operations
  // ---------------------------------------------------------------------------

  /**
   * Save full game state
   */
  async saveState(gameId: string, state: GameState): Promise<void> {
    await this.store.saveState(gameId, state);
  }

  /**
   * Load game state
   */
  async loadState(gameId: string): Promise<GameState | null> {
    return this.store.loadState(gameId);
  }

  /**
   * Check if game state exists
   */
  async hasState(gameId: string): Promise<boolean> {
    return this.store.hasState(gameId);
  }

  // ---------------------------------------------------------------------------
  // Event Operations
  // ---------------------------------------------------------------------------

  /**
   * Append an event to storage
   */
  async appendEvent(gameId: string, event: StreamEvent): Promise<void> {
    await this.store.appendEvent(gameId, event);
  }

  /**
   * Get events after a specific event ID
   */
  async getEventsSince(gameId: string, afterEventId: string): Promise<StreamEvent[]> {
    return this.store.getEventsSince(gameId, afterEventId);
  }

  /**
   * Get all events for a game
   */
  async getAllEvents(gameId: string): Promise<StreamEvent[]> {
    return this.store.getAllEvents(gameId);
  }

  /**
   * Get the last event ID
   */
  async getLastEventId(gameId: string): Promise<string | null> {
    return this.store.getLastEventId(gameId);
  }

  /**
   * Get the last sequence number
   */
  async getLastSequence(gameId: string): Promise<number> {
    return this.store.getLastSequence(gameId);
  }

  // ---------------------------------------------------------------------------
  // Metadata Operations
  // ---------------------------------------------------------------------------

  /**
   * Get game metadata
   */
  async getGameMetadata(gameId: string): Promise<GameMetadata | null> {
    return this.store.loadMetadata(gameId);
  }

  /**
   * Save game metadata
   */
  async saveGameMetadata(gameId: string, metadata: GameMetadata): Promise<void> {
    await this.store.saveMetadata(gameId, metadata);
  }

  /**
   * Update metadata from game state
   * Preserves createdAt from existing metadata if present
   */
  async updateMetadataFromState(gameId: string, state: GameState): Promise<void> {
    // Get existing metadata to preserve createdAt
    const existing = await this.store.loadMetadata(gameId);

    const metadata: GameMetadata = {
      gameId: state.gameId,
      factions: Array.from(state.factions.keys()),
      status: this.determineStatus(state),
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      turn: state.turn,
      phase: state.phase,
      winner: state.winner
        ? {
            condition: state.winner.condition,
            winners: state.winner.winners,
            turn: state.winner.turn,
            details: state.winner.details,
          }
        : null,
    };

    await this.store.saveMetadata(gameId, metadata);
  }

  /**
   * Determine game status from state
   */
  private determineStatus(state: GameState): GameMetadata['status'] {
    if (state.winner) {
      return 'completed';
    }
    return 'running';
  }

  // ---------------------------------------------------------------------------
  // Game Listing and Management
  // ---------------------------------------------------------------------------

  /**
   * List all games with metadata
   */
  async listGames(): Promise<GameMetadata[]> {
    return this.store.listGames();
  }

  /**
   * Delete all data for a game
   */
  async deleteGame(gameId: string): Promise<void> {
    await this.store.deleteGame(gameId);
  }

  /**
   * Check if the store is healthy
   */
  async healthCheck(): Promise<boolean> {
    return this.store.healthCheck();
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Default game store instance
 */
export const gameStore = new GameStore();

// Re-export types
export type { GameMetadata };
