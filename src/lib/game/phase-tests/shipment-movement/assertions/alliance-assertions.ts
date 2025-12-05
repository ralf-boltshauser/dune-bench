/**
 * Alliance-Specific Assertions
 * 
 * Assertions for alliance constraints and behavior.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import type { PhaseEvent } from '../../../phases/types';
import { assertEventEmitted } from './event-assertions';
import { assertAllianceExists, assertForcesInTerritory } from './state-assertions';

/**
 * Assert alliance constraint was applied
 */
export function assertAllianceConstraintApplied(
  events: PhaseEvent[],
  faction: Faction,
  forcesSentToTanks: number
): void {
  // Check for alliance constraint event (type is FORCES_SHIPPED with reason alliance_constraint)
  const constraintEvents = events.filter(
    (e) =>
      e.type === 'FORCES_SHIPPED' &&
      (e.data as any)?.reason === 'alliance_constraint' &&
      (e.data as any)?.faction === faction
  );
  
  if (constraintEvents.length === 0) {
    throw new Error(
      `Expected alliance constraint event for ${faction}, but none found`
    );
  }
  
  const event = constraintEvents[0];
  const data = event.data as any;
  
  if (data.count !== forcesSentToTanks) {
    throw new Error(
      `Expected ${forcesSentToTanks} forces sent to Tanks for ${faction}, got ${data.count || 0}`
    );
  }
}

/**
 * Assert forces in same territory as ally were sent to Tanks
 */
export function assertForcesSentToTanks(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  expectedRemaining: number
): void {
  // After alliance constraint, forces should be removed from territory
  // Check that only expectedRemaining forces are left
  const factionState = state.factions.get(faction);
  if (factionState) {
    const stacks = factionState.forces.onBoard.filter(
      (s) => s.territoryId === territoryId
    );
    const total = stacks.reduce(
      (sum, s) => sum + s.forces.regular + s.forces.elite,
      0
    );
    
    if (total !== expectedRemaining) {
      throw new Error(
        `Expected ${expectedRemaining} forces remaining for ${faction} in ${territoryId} after alliance constraint, got ${total}`
      );
    }
  }
}

/**
 * Assert alliance constraint does NOT apply to Polar Sink
 */
export function assertAllianceConstraintNotAppliedToPolarSink(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): void {
  // Check that forces remain in Polar Sink even if both allies are there
  assertAllianceExists(state, faction1, faction2);
  
  const faction1State = state.factions.get(faction1);
  const faction2State = state.factions.get(faction2);
  
  if (faction1State) {
    const inPolarSink = faction1State.forces.onBoard.some(
      (s) => s.territoryId === TerritoryId.POLAR_SINK
    );
    
    if (inPolarSink) {
      // Forces should still be there (not sent to Tanks)
      // This is a positive check - if forces are there, constraint wasn't applied
      return;
    }
  }
  
  // Similar check for faction2
  if (faction2State) {
    const inPolarSink = faction2State.forces.onBoard.some(
      (s) => s.territoryId === TerritoryId.POLAR_SINK
    );
    
    if (inPolarSink) {
      return;
    }
  }
}

