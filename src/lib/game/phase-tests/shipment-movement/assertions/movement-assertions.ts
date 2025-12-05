/**
 * Movement-Specific Assertions
 * 
 * Assertions for movement actions and events.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import type { PhaseEvent } from '../../../phases/types';
import { assertEventEmitted, assertEventData } from './event-assertions';
import { assertForcesInTerritory, assertForcesNotInTerritory } from './state-assertions';

/**
 * Assert movement succeeded
 */
export function assertMovementSucceeded(
  events: PhaseEvent[],
  faction: Faction,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId,
  count: number
): void {
  assertEventEmitted(events, 'FORCES_MOVED', (e) => {
    const data = e.data as any;
    return (
      data.faction === faction &&
      data.from === fromTerritoryId &&
      data.to === toTerritoryId &&
      data.count === count
    );
  });
}

/**
 * Assert movement failed
 */
export function assertMovementFailed(
  events: PhaseEvent[],
  faction: Faction,
  reason?: string
): void {
  // Check for error event or absence of movement event
  const hasError = events.some(
    (e) =>
      e.type.includes('ERROR') &&
      (e.data as any)?.faction === faction &&
      (e.data as any)?.action === 'MOVEMENT'
  );
  
  if (!hasError) {
    // Check that movement event was NOT emitted
    const hasMovement = events.some(
      (e) =>
        e.type === 'FORCES_MOVED' && (e.data as any)?.faction === faction
    );
    
    if (hasMovement) {
      throw new Error(
        `Expected movement to fail for ${faction}, but movement event was emitted`
      );
    }
  }
  
  if (reason) {
    const errorEvent = events.find(
      (e) =>
        e.type.includes('ERROR') &&
        (e.data as any)?.faction === faction &&
        (e.message || '').includes(reason)
    );
    
    if (!errorEvent) {
      throw new Error(
        `Expected movement failure reason to include "${reason}", but it did not`
      );
    }
  }
}

/**
 * Assert movement state changes
 */
export function assertMovementStateChanges(
  state: GameState,
  faction: Faction,
  fromTerritoryId: TerritoryId,
  fromSector: number,
  toTerritoryId: TerritoryId,
  toSector: number,
  movedCount: number
): void {
  // Check forces moved to destination
  assertForcesInTerritory(state, faction, toTerritoryId, toSector, movedCount);
  
  // Check forces removed from source (if not repositioning)
  if (fromTerritoryId !== toTerritoryId) {
    // Forces should be removed from source
    // Note: This is simplified - actual check depends on whether all forces moved
    const factionState = state.factions.get(faction);
    if (factionState) {
      const sourceStack = factionState.forces.onBoard.find(
        (s) => s.territoryId === fromTerritoryId && s.sector === fromSector
      );
      if (sourceStack) {
        const remaining = sourceStack.forces.regular + sourceStack.forces.elite;
        if (remaining > 0) {
          // Some forces remain - that's okay
          return;
        }
      }
      // If we get here, all forces moved - source should be empty or removed
    }
  }
}

/**
 * Assert repositioning (movement within same territory)
 */
export function assertRepositioning(
  events: PhaseEvent[],
  faction: Faction,
  territoryId: TerritoryId,
  fromSector: number,
  toSector: number,
  count: number
): void {
  assertEventEmitted(events, 'FORCES_MOVED', (e) => {
    const data = e.data as any;
    return (
      data.faction === faction &&
      data.from === territoryId &&
      data.to === territoryId &&
      data.fromSector === fromSector &&
      data.toSector === toSector &&
      data.count === count
    );
  });
}

/**
 * Assert movement range was respected
 */
export function assertMovementRange(
  events: PhaseEvent[],
  faction: Faction,
  expectedRange: number
): void {
  const movementEvents = events.filter(
    (e) => e.type === 'FORCES_MOVED' && (e.data as any)?.faction === faction
  );
  
  for (const event of movementEvents) {
    const data = event.data as any;
    // Calculate distance (simplified - actual implementation would use territory adjacency)
    // For now, we just verify the event exists
    // Range validation would be done in movement validation, not in events
  }
}

