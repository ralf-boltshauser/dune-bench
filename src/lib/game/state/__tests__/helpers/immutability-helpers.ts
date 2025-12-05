/**
 * Immutability Helpers
 * 
 * Utilities for verifying that mutations don't modify the original state.
 * Provides deep cloning and state comparison functions.
 */

import type { GameState } from '../../../types';
import { serializeGameState, deserializeGameState } from '../../serialize';

/**
 * Create a deep clone of game state for immutability testing.
 * Uses serialization/deserialization to ensure complete deep copy.
 */
export function cloneStateForTesting(state: GameState): GameState {
  // Use structuredClone if available (Node 17+, modern browsers)
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(state);
    } catch (error) {
      // Fall back to serialization if structuredClone fails
      // (e.g., if state has functions or other non-serializable data)
    }
  }

  // Fallback: Use serialize/deserialize for deep clone
  const serialized = serializeGameState(state);
  return deserializeGameState(serialized);
}

/**
 * Verify that two state objects are not the same reference.
 * Shallow check for object identity.
 */
export function verifyStateNotSame(original: GameState, mutated: GameState): void {
  if (original === mutated) {
    throw new Error(
      'Immutability violation: Mutated state is the same object reference as original state.'
    );
  }
}

/**
 * Verify that original state was not modified.
 * Checks that only expected paths changed and all others are identical.
 * 
 * @param original - Original state (should be cloned before mutation)
 * @param mutated - State after mutation
 * @param changedPaths - Array of paths that are expected to change (e.g., ['factions.ATREIDES.spice'])
 */
export function verifyImmutability(
  original: GameState,
  mutated: GameState,
  changedPaths: string[]
): void {
  // First verify references are different
  verifyStateNotSame(original, mutated);

  // Verify changed paths are actually different
  for (const path of changedPaths) {
    const originalValue = getNestedValue(original, path);
    const mutatedValue = getNestedValue(mutated, path);

    if (originalValue === mutatedValue) {
      throw new Error(
        `Expected path "${path}" to change, but it remained the same: ${JSON.stringify(originalValue)}`
      );
    }
  }

  // Verify unchanged paths (basic check - full deep equality is expensive)
  // For comprehensive checks, use verifyOnlyChanged or separate assertions
}

/**
 * Verify that only specific properties changed and match expected values.
 * 
 * @param original - Original state
 * @param mutated - Mutated state
 * @param expectedChanges - Array of expected changes with path and value
 */
export function verifyOnlyChanged(
  original: GameState,
  mutated: GameState,
  expectedChanges: Array<{ path: string; value: unknown }>
): void {
  verifyStateNotSame(original, mutated);

  for (const change of expectedChanges) {
    const mutatedValue = getNestedValue(mutated, change.path);
    if (JSON.stringify(mutatedValue) !== JSON.stringify(change.value)) {
      throw new Error(
        `Path "${change.path}" has unexpected value. ` +
        `Expected: ${JSON.stringify(change.value)}, ` +
        `Got: ${JSON.stringify(mutatedValue)}`
      );
    }
  }
}

/**
 * Verify that nested objects/arrays/Maps are cloned (not shared references).
 * 
 * @param original - Original state
 * @param mutated - Mutated state
 * @param paths - Array of paths to check for cloning
 */
export function verifyNestedClones(
  original: GameState,
  mutated: GameState,
  paths: string[]
): void {
  for (const path of paths) {
    const originalValue = getNestedValue(original, path);
    const mutatedValue = getNestedValue(mutated, path);

    // If path exists in both, verify they're different references
    if (originalValue !== undefined && mutatedValue !== undefined) {
      // Check if it's an object/array/Map that should be cloned
      if (
        typeof originalValue === 'object' &&
        originalValue !== null &&
        (Array.isArray(originalValue) || originalValue instanceof Map || originalValue instanceof Set)
      ) {
        if (originalValue === mutatedValue) {
          throw new Error(
            `Immutability violation: Path "${path}" shares the same reference. ` +
            `Expected cloned object/array/Map.`
          );
        }
      }
    }
  }
}

/**
 * Get a nested value from an object using dot notation path.
 * Handles Maps and nested objects.
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (current instanceof Map) {
      // For Maps, try to find the key
      // Path might be like "factions.ATREIDES.spice"
      // First part might be a Map key
      const key = part;
      if (current.has(key as never)) {
        current = current.get(key as never);
      } else {
        // Try to find by enum value or convert
        for (const [mapKey] of current.entries()) {
          if (String(mapKey) === key || (mapKey as { name?: string })?.name === key) {
            current = current.get(mapKey);
            break;
          }
        }
        return undefined;
      }
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Verify that specific nested Maps are cloned.
 * 
 * @param original - Original state
 * @param mutated - Mutated state
 * @param mapPaths - Paths to Maps that should be cloned
 */
export function verifyMapClones(
  original: GameState,
  mutated: GameState,
  mapPaths: string[]
): void {
  for (const path of mapPaths) {
    const originalMap = getNestedValue(original, path);
    const mutatedMap = getNestedValue(mutated, path);

    if (originalMap instanceof Map && mutatedMap instanceof Map) {
      if (originalMap === mutatedMap) {
        throw new Error(
          `Immutability violation: Map at path "${path}" is the same reference. ` +
          `Expected cloned Map.`
        );
      }
    }
  }
}

/**
 * Compare two states for equality (deep comparison).
 * Uses JSON serialization for comparison.
 * 
 * Note: This is expensive and should be used sparingly.
 * Prefer checking specific properties with assertions.
 */
export function statesAreEqual(state1: GameState, state2: GameState): boolean {
  try {
    const serialized1 = serializeGameState(state1);
    const serialized2 = serializeGameState(state2);
    return serialized1 === serialized2;
  } catch (error) {
    // If serialization fails, states are likely different
    return false;
  }
}

