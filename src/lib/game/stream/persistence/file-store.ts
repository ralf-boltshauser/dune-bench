/**
 * File Store - File system based persistence implementation
 *
 * Stores game data in the local file system using:
 * - JSONL format for events (efficient append)
 * - JSON for state and metadata
 *
 * Directory structure:
 *   {baseDir}/
 *     {gameId}/
 *       events.jsonl  - Event history (one JSON per line)
 *       state.json    - Full game state
 *       metadata.json - Game metadata
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { IGameStore, FileStoreConfig } from './types';
import type { StreamEvent, GameMetadata, isStreamEvent } from '../types';
import type { GameState } from '../../types';
import { serializeGameState, deserializeGameState } from '../../state/serialize';

// =============================================================================
// FILE PATHS
// =============================================================================

const EVENTS_FILE = 'events.jsonl';
const STATE_FILE = 'state.json';
const METADATA_FILE = 'metadata.json';

// =============================================================================
// FILE STORE IMPLEMENTATION
// =============================================================================

export class FileStore implements IGameStore {
  private readonly baseDir: string;
  private readonly autoCreate: boolean;

  constructor(config: FileStoreConfig) {
    this.baseDir = config.baseDir;
    this.autoCreate = config.autoCreate ?? true;
  }

  // ---------------------------------------------------------------------------
  // Path Helpers
  // ---------------------------------------------------------------------------

  private getGameDir(gameId: string): string {
    return join(this.baseDir, gameId);
  }

  private getEventsPath(gameId: string): string {
    return join(this.getGameDir(gameId), EVENTS_FILE);
  }

  private getStatePath(gameId: string): string {
    return join(this.getGameDir(gameId), STATE_FILE);
  }

  private getMetadataPath(gameId: string): string {
    return join(this.getGameDir(gameId), METADATA_FILE);
  }

  // ---------------------------------------------------------------------------
  // Directory Management
  // ---------------------------------------------------------------------------

  private async ensureBaseDir(): Promise<void> {
    if (!this.autoCreate) return;

    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async ensureGameDir(gameId: string): Promise<void> {
    await this.ensureBaseDir();

    try {
      await fs.mkdir(this.getGameDir(gameId), { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Event Store Implementation
  // ---------------------------------------------------------------------------

  async appendEvent(gameId: string, event: StreamEvent): Promise<void> {
    await this.ensureGameDir(gameId);

    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(this.getEventsPath(gameId), line, 'utf-8');
  }

  async getEventsSince(gameId: string, afterEventId: string): Promise<StreamEvent[]> {
    const events = await this.getAllEvents(gameId);

    if (!afterEventId) {
      return events;
    }

    // Find the index of the afterEventId
    const afterIndex = events.findIndex((e) => e.id === afterEventId);

    if (afterIndex === -1) {
      // Event not found - return all events (safer than returning none)
      console.warn(
        `[FileStore] Event ID "${afterEventId}" not found, returning all events`
      );
      return events;
    }

    // Return events after the found index
    return events.slice(afterIndex + 1);
  }

  async getAllEvents(gameId: string): Promise<StreamEvent[]> {
    try {
      const content = await fs.readFile(this.getEventsPath(gameId), 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const events: StreamEvent[] = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const event = JSON.parse(lines[i]) as StreamEvent;
          events.push(event);
        } catch (parseError) {
          console.error(
            `[FileStore] Failed to parse event at line ${i + 1}:`,
            parseError
          );
          // Skip corrupted events but continue processing
        }
      }

      return events;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getLastEventId(gameId: string): Promise<string | null> {
    try {
      const content = await fs.readFile(this.getEventsPath(gameId), 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      // Parse last line
      const lastEvent = JSON.parse(lines[lines.length - 1]) as StreamEvent;
      return lastEvent.id;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getLastSequence(gameId: string): Promise<number> {
    try {
      const content = await fs.readFile(this.getEventsPath(gameId), 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length === 0) {
        return 0;
      }

      // Parse last line
      const lastEvent = JSON.parse(lines[lines.length - 1]) as StreamEvent;
      return lastEvent.seq;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  async deleteEvents(gameId: string): Promise<void> {
    try {
      await fs.unlink(this.getEventsPath(gameId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // State Store Implementation
  // ---------------------------------------------------------------------------

  async saveState(gameId: string, state: GameState): Promise<void> {
    await this.ensureGameDir(gameId);

    const serialized = serializeGameState(state);
    await fs.writeFile(this.getStatePath(gameId), serialized, 'utf-8');
  }

  async loadState(gameId: string): Promise<GameState | null> {
    try {
      const content = await fs.readFile(this.getStatePath(gameId), 'utf-8');
      return deserializeGameState(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async hasState(gameId: string): Promise<boolean> {
    try {
      await fs.access(this.getStatePath(gameId));
      return true;
    } catch {
      return false;
    }
  }

  async deleteState(gameId: string): Promise<void> {
    try {
      await fs.unlink(this.getStatePath(gameId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Metadata Store Implementation
  // ---------------------------------------------------------------------------

  async saveMetadata(gameId: string, metadata: GameMetadata): Promise<void> {
    await this.ensureGameDir(gameId);

    const json = JSON.stringify(metadata, null, 2);
    await fs.writeFile(this.getMetadataPath(gameId), json, 'utf-8');
  }

  async loadMetadata(gameId: string): Promise<GameMetadata | null> {
    try {
      const content = await fs.readFile(this.getMetadataPath(gameId), 'utf-8');
      return JSON.parse(content) as GameMetadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async listGames(): Promise<GameMetadata[]> {
    try {
      await this.ensureBaseDir();

      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const games: GameMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metadata = await this.loadMetadata(entry.name);
          if (metadata) {
            games.push(metadata);
          }
        }
      }

      // Sort by updatedAt descending (most recent first)
      return games.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deleteMetadata(gameId: string): Promise<void> {
    try {
      await fs.unlink(this.getMetadataPath(gameId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Combined Operations
  // ---------------------------------------------------------------------------

  async deleteGame(gameId: string): Promise<void> {
    try {
      await fs.rm(this.getGameDir(gameId), { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureBaseDir();

      // Try to read the base directory
      await fs.readdir(this.baseDir);
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default file store instance using 'data/games' directory
 */
export const fileStore = new FileStore({
  baseDir: 'data/games',
  autoCreate: true,
});
