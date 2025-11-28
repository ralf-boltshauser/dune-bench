/**
 * Persistence Types - Interface definitions for storage backends
 *
 * Defines abstract interfaces that can be implemented by different
 * storage backends (file system, Redis, PostgreSQL, etc.)
 */

import type { StreamEvent, GameMetadata } from '../types';
import type { GameState } from '../../types';

/**
 * Event persistence interface
 * Handles storing and retrieving stream events
 */
export interface IEventStore {
  /**
   * Append an event to storage
   * @param gameId - Game this event belongs to
   * @param event - Event to persist
   */
  appendEvent(gameId: string, event: StreamEvent): Promise<void>;

  /**
   * Get events after a specific event ID
   * @param gameId - Game to get events for
   * @param afterEventId - Return events after this ID (empty string = all events)
   * @returns Events in order
   */
  getEventsSince(gameId: string, afterEventId: string): Promise<StreamEvent[]>;

  /**
   * Get all events for a game
   * @param gameId - Game to get events for
   * @returns All events in order
   */
  getAllEvents(gameId: string): Promise<StreamEvent[]>;

  /**
   * Get the last event ID for a game
   * @param gameId - Game to check
   * @returns Last event ID or null if no events
   */
  getLastEventId(gameId: string): Promise<string | null>;

  /**
   * Get the last sequence number for a game
   * @param gameId - Game to check
   * @returns Last sequence number or 0 if no events
   */
  getLastSequence(gameId: string): Promise<number>;

  /**
   * Delete all events for a game
   * @param gameId - Game to delete events for
   */
  deleteEvents(gameId: string): Promise<void>;
}

/**
 * Game state persistence interface
 * Handles storing and retrieving full game state
 */
export interface IStateStore {
  /**
   * Save game state
   * @param gameId - Game to save state for
   * @param state - Full game state
   */
  saveState(gameId: string, state: GameState): Promise<void>;

  /**
   * Load game state
   * @param gameId - Game to load state for
   * @returns Game state or null if not found
   */
  loadState(gameId: string): Promise<GameState | null>;

  /**
   * Check if game state exists
   * @param gameId - Game to check
   */
  hasState(gameId: string): Promise<boolean>;

  /**
   * Delete game state
   * @param gameId - Game to delete
   */
  deleteState(gameId: string): Promise<void>;
}

/**
 * Game metadata persistence interface
 * Handles storing and retrieving game metadata (lightweight info)
 */
export interface IMetadataStore {
  /**
   * Save game metadata
   * @param gameId - Game to save metadata for
   * @param metadata - Metadata to save
   */
  saveMetadata(gameId: string, metadata: GameMetadata): Promise<void>;

  /**
   * Load game metadata
   * @param gameId - Game to load metadata for
   * @returns Metadata or null if not found
   */
  loadMetadata(gameId: string): Promise<GameMetadata | null>;

  /**
   * List all games with metadata
   * @returns Array of metadata sorted by updatedAt desc
   */
  listGames(): Promise<GameMetadata[]>;

  /**
   * Delete game metadata
   * @param gameId - Game to delete
   */
  deleteMetadata(gameId: string): Promise<void>;
}

/**
 * Combined game store interface
 * Full storage backend that combines all persistence needs
 */
export interface IGameStore extends IEventStore, IStateStore, IMetadataStore {
  /**
   * Delete all data for a game (events, state, metadata)
   * @param gameId - Game to delete
   */
  deleteGame(gameId: string): Promise<void>;

  /**
   * Check if the store is healthy/connected
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Configuration for file-based storage
 */
export interface FileStoreConfig {
  /** Base directory for game data */
  baseDir: string;
  /** Whether to create directories automatically */
  autoCreate?: boolean;
}

/**
 * Result of a batch operation
 */
export interface BatchResult {
  success: boolean;
  processed: number;
  errors: Array<{ id: string; error: string }>;
}
