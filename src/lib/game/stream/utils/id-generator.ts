/**
 * ID Generator - UUID-based unique ID generation
 *
 * Provides globally unique, sortable IDs for events and games.
 * Uses crypto.randomUUID() with timestamp prefix for sortability.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique event ID
 * Format: evt_{timestamp}_{uuid-suffix}
 * Timestamp ensures rough sortability, UUID suffix ensures uniqueness
 */
export function generateEventId(): string {
  const timestamp = Date.now().toString(36); // Base36 for compactness
  const uuid = randomUUID().split('-')[0]; // First segment of UUID
  return `evt_${timestamp}_${uuid}`;
}

/**
 * Generate a unique game ID
 * Format: game_{timestamp}_{uuid-suffix}
 */
export function generateGameId(): string {
  const timestamp = Date.now().toString(36);
  const uuid = randomUUID().split('-')[0];
  return `game_${timestamp}_${uuid}`;
}

/**
 * Generate a unique session ID
 * Format: sess_{timestamp}_{uuid-suffix}
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const uuid = randomUUID().split('-')[0];
  return `sess_${timestamp}_${uuid}`;
}

/**
 * Extract timestamp from a generated ID
 * Returns null if ID format is invalid
 */
export function extractTimestamp(id: string): number | null {
  const parts = id.split('_');
  if (parts.length < 2) return null;

  const timestampStr = parts[1];
  const timestamp = parseInt(timestampStr, 36);

  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Compare two IDs by their embedded timestamps
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareIds(a: string, b: string): number {
  const tsA = extractTimestamp(a) ?? 0;
  const tsB = extractTimestamp(b) ?? 0;
  return tsA - tsB;
}
