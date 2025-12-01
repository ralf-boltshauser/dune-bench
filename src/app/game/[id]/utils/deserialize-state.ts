/**
 * Client-side state deserialization
 * Converts JSON objects (from API) back to GameState with Maps and Sets
 */

import type { GameState } from '@/lib/game/types';
import { Faction } from '@/lib/game/types/enums';

/**
 * Deserialize JSON object back to GameState.
 * Restores Maps and Sets from their serialized form.
 * This is a client-safe version that doesn't use Node.js modules.
 */
export function deserializeGameState(json: unknown): GameState {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Invalid game state: must be an object');
  }

  const obj = json as Record<string, unknown>;

  // Recursively deserialize Maps and Sets
  const deserialize = (value: unknown): unknown => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const valueObj = value as Record<string, unknown>;
      
      // Check if it's a serialized Map
      if (valueObj.__type === 'Map' && Array.isArray(valueObj.entries)) {
        return new Map(valueObj.entries as Array<[unknown, unknown]>);
      }
      
      // Check if it's a serialized Set
      if (valueObj.__type === 'Set' && Array.isArray(valueObj.values)) {
        return new Set(valueObj.values);
      }
      
      // Recursively deserialize object properties
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(valueObj)) {
        result[key] = deserialize(val);
      }
      return result;
    }
    
    if (Array.isArray(value)) {
      return value.map(deserialize);
    }
    
    return value;
  };

  const deserialized = deserialize(obj) as GameState;

  // Ensure factions is a Map (handle case where API returns plain object)
  if (deserialized.factions && !(deserialized.factions instanceof Map)) {
    const factionsObj = deserialized.factions as Record<string, unknown>;
    const factionsMap = new Map<Faction, GameState['factions'] extends Map<Faction, infer T> ? T : never>();
    
    for (const [key, value] of Object.entries(factionsObj)) {
      factionsMap.set(key as Faction, value as GameState['factions'] extends Map<Faction, infer T> ? T : never);
    }
    
    deserialized.factions = factionsMap as GameState['factions'];
  }

  // Ensure playerPositions is a Map
  if (deserialized.playerPositions && !(deserialized.playerPositions instanceof Map)) {
    const positionsObj = deserialized.playerPositions as Record<string, unknown>;
    const positionsMap = new Map<Faction, number>();
    
    for (const [key, value] of Object.entries(positionsObj)) {
      positionsMap.set(key as Faction, value as number);
    }
    
    deserialized.playerPositions = positionsMap;
  }

  // Ensure winAttempts is a Map
  if (deserialized.winAttempts && !(deserialized.winAttempts instanceof Map)) {
    const attemptsObj = deserialized.winAttempts as Record<string, unknown>;
    const attemptsMap = new Map<Faction, number>();
    
    for (const [key, value] of Object.entries(attemptsObj)) {
      attemptsMap.set(key as Faction, value as number);
    }
    
    deserialized.winAttempts = attemptsMap;
  }

  // Ensure activeFactions is always an array for backward compatibility
  if (!Array.isArray(deserialized.activeFactions)) {
    deserialized.activeFactions = [];
  }

  return deserialized;
}

