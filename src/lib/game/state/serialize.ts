/**
 * State Serialization - Save/load game state to JSON
 *
 * Handles Maps and Sets which need special serialization.
 */

import type { GameState } from '../types';

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize GameState to JSON-compatible object.
 * Converts Maps to [key, value][] arrays and Sets to arrays.
 */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Map) {
      return {
        __type: 'Map',
        entries: Array.from(value.entries()),
      };
    }
    if (value instanceof Set) {
      return {
        __type: 'Set',
        values: Array.from(value),
      };
    }
    return value;
  }, 2);
}

/**
 * Deserialize JSON string back to GameState.
 * Restores Maps and Sets from their serialized form.
 */
export function deserializeGameState(json: string): GameState {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === 'object') {
      if (value.__type === 'Map') {
        return new Map(value.entries);
      }
      if (value.__type === 'Set') {
        return new Set(value.values);
      }
    }
    return value;
  });
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const SNAPSHOTS_DIR = join(process.cwd(), 'snapshots');

/**
 * Save game state to a file.
 */
export function saveStateToFile(state: GameState, filename: string): string {
  // Ensure snapshots directory exists
  if (!existsSync(SNAPSHOTS_DIR)) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }

  const filepath = filename.endsWith('.json')
    ? join(SNAPSHOTS_DIR, filename)
    : join(SNAPSHOTS_DIR, `${filename}.json`);

  const serialized = serializeGameState(state);
  writeFileSync(filepath, serialized);

  return filepath;
}

/**
 * Load game state from a file.
 */
export function loadStateFromFile(filename: string): GameState {
  const filepath = filename.endsWith('.json')
    ? join(SNAPSHOTS_DIR, filename)
    : join(SNAPSHOTS_DIR, `${filename}.json`);

  if (!existsSync(filepath)) {
    throw new Error(`Snapshot file not found: ${filepath}`);
  }

  const json = readFileSync(filepath, 'utf-8');
  return deserializeGameState(json);
}

/**
 * List available snapshots.
 */
export function listSnapshots(): string[] {
  if (!existsSync(SNAPSHOTS_DIR)) {
    return [];
  }

  const { readdirSync } = require('fs');
  return readdirSync(SNAPSHOTS_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => f.replace('.json', ''));
}

/**
 * Create a descriptive snapshot name based on game state.
 */
export function generateSnapshotName(state: GameState): string {
  const factions = Array.from(state.factions.keys()).join('-');
  const turn = state.turn;
  const phase = state.phase.toLowerCase().replace(/_/g, '-');
  const timestamp = Date.now();
  return `${factions}_t${turn}_${phase}_${timestamp}`;
}
