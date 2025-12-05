/**
 * Assertion Helpers for Shipment & Movement Phase Tests
 * 
 * Single source of truth for all test assertions.
 * No duplication - all tests use these helpers.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { getFactionState, getBGFightersInSector, getBGAdvisorsInTerritory } from '../../../state';
import type { PhaseEvent, PhaseStepResult } from '../../../phases/types';

// =============================================================================
// STATE ASSERTIONS
// =============================================================================

/**
 * Assert forces are in a specific territory/sector
 */
export function assertForcesInTerritory(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number,
  expectedAdvisors?: number
): void {
  const factionState = getFactionState(state, faction);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  
  const actualCount = stack
    ? (stack.forces.regular || 0) + (stack.forces.elite || 0)
    : 0;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} forces for ${faction} in ${territoryId} (sector ${sector}), got ${actualCount}`
    );
  }
  
  if (expectedAdvisors !== undefined && faction === Faction.BENE_GESSERIT) {
    const actualAdvisors = stack?.advisors || 0;
    if (actualAdvisors !== expectedAdvisors) {
      throw new Error(
        `Expected ${expectedAdvisors} advisors for ${faction} in ${territoryId} (sector ${sector}), got ${actualAdvisors}`
      );
    }
  }
}

/**
 * Assert spice amount for a faction
 */
export function assertSpiceAmount(
  state: GameState,
  faction: Faction,
  expectedAmount: number
): void {
  const factionState = getFactionState(state, faction);
  const actualAmount = factionState.spice;
  
  if (actualAmount !== expectedAmount) {
    throw new Error(
      `Expected ${expectedAmount} spice for ${faction}, got ${actualAmount}`
    );
  }
}

/**
 * Assert forces in reserves
 */
export function assertForcesInReserves(
  state: GameState,
  faction: Faction,
  expectedCount: number
): void {
  const factionState = getFactionState(state, faction);
  const actualCount =
    factionState.forces.reserves.regular + factionState.forces.reserves.elite;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} forces in reserves for ${faction}, got ${actualCount}`
    );
  }
}

/**
 * Assert ornithopter access (determined at phase start)
 */
export function assertOrnithopterAccess(
  state: GameState,
  faction: Faction,
  expected: boolean
): void {
  // Note: This checks if faction has forces in Arrakeen/Carthag
  // The actual ornithopter access is stored in state machine, not state
  // This is a simplified check for test purposes
  const factionState = getFactionState(state, faction);
  const hasInArrakeen = factionState.forces.onBoard.some(
    (s) => s.territoryId === TerritoryId.ARRAKEEN
  );
  const hasInCarthag = factionState.forces.onBoard.some(
    (s) => s.territoryId === TerritoryId.CARTHAG
  );
  const actual = hasInArrakeen || hasInCarthag;
  
  if (actual !== expected) {
    throw new Error(
      `Expected ornithopter access ${expected} for ${faction}, got ${actual}`
    );
  }
}

// =============================================================================
// EVENT ASSERTIONS
// =============================================================================

/**
 * Assert an event was emitted
 */
export function assertEventEmitted(
  events: PhaseEvent[],
  eventType: string,
  predicate?: (event: PhaseEvent) => boolean
): void {
  const matching = events.filter(
    (e) => e.type === eventType && (!predicate || predicate(e))
  );
  
  if (matching.length === 0) {
    throw new Error(
      `Expected event ${eventType}${predicate ? ' (with predicate)' : ''} to be emitted, but it was not`
    );
  }
}

/**
 * Assert an event was NOT emitted
 */
export function assertEventNotEmitted(
  events: PhaseEvent[],
  eventType: string
): void {
  const matching = events.filter((e) => e.type === eventType);
  
  if (matching.length > 0) {
    throw new Error(
      `Expected event ${eventType} NOT to be emitted, but it was (${matching.length} times)`
    );
  }
}

/**
 * Assert event sequence
 */
export function assertEventSequence(
  events: PhaseEvent[],
  expectedSequence: string[]
): void {
  const actualSequence = events.map((e) => e.type);
  const sequenceStr = actualSequence.join(' → ');
  const expectedStr = expectedSequence.join(' → ');
  
  for (let i = 0; i < expectedSequence.length; i++) {
    if (actualSequence[i] !== expectedSequence[i]) {
      throw new Error(
        `Expected event sequence: ${expectedStr}, but got: ${sequenceStr}`
      );
    }
  }
}

/**
 * Assert event count
 */
export function assertEventCount(
  events: PhaseEvent[],
  eventType: string,
  expectedCount: number
): void {
  const actualCount = events.filter((e) => e.type === eventType).length;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} events of type ${eventType}, got ${actualCount}`
    );
  }
}

/**
 * Assert event data matches expected values
 */
export function assertEventData(
  event: PhaseEvent,
  expectedData: Partial<PhaseEvent['data']>
): void {
  for (const [key, expectedValue] of Object.entries(expectedData)) {
    const actualValue = (event.data as any)[key];
    if (actualValue !== expectedValue) {
      throw new Error(
        `Expected event data.${key} to be ${expectedValue}, got ${actualValue}`
      );
    }
  }
}

// =============================================================================
// PHASE ASSERTIONS
// =============================================================================

/**
 * Assert phase is complete
 */
export function assertPhaseComplete(result: PhaseStepResult): void {
  if (!result.phaseComplete) {
    throw new Error('Expected phase to be complete, but it was not');
  }
}

/**
 * Assert phase is NOT complete
 */
export function assertPhaseNotComplete(result: PhaseStepResult): void {
  if (result.phaseComplete) {
    throw new Error('Expected phase to NOT be complete, but it was');
  }
}

/**
 * Assert pending request exists
 */
export function assertPendingRequest(
  result: PhaseStepResult,
  requestType: string,
  factionId?: Faction
): void {
  const matching = result.pendingRequests.filter(
    (r) =>
      r.requestType === requestType &&
      (!factionId || r.factionId === factionId)
  );
  
  if (matching.length === 0) {
    throw new Error(
      `Expected pending request of type ${requestType}${factionId ? ` for ${factionId}` : ''}, but none found`
    );
  }
}

/**
 * Assert no pending requests
 */
export function assertNoPendingRequests(result: PhaseStepResult): void {
  if (result.pendingRequests.length > 0) {
    throw new Error(
      `Expected no pending requests, but got ${result.pendingRequests.length}`
    );
  }
}

// =============================================================================
// BG-SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert BG advisors in territory
 */
export function assertBGAdvisorsInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number
): void {
  // getBGAdvisorsInTerritory only takes state and territoryId (no sector)
  // We need to find the stack in the specific sector
  const factionState = getFactionState(state, Faction.BENE_GESSERIT);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  const actualCount = stack?.advisors ?? 0;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} BG advisors in ${territoryId} (sector ${sector}), got ${actualCount}`
    );
  }
}

/**
 * Assert BG fighters in territory
 */
export function assertBGFightersInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number
): void {
  const actualCount = getBGFightersInSector(state, territoryId, sector);
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} BG fighters in ${territoryId} (sector ${sector}), got ${actualCount}`
    );
  }
}

// =============================================================================
// GUILD-SPECIFIC ASSERTIONS
// =============================================================================

/**
 * Assert Guild received payment
 */
export function assertGuildReceivedPayment(
  state: GameState,
  expectedAmount: number
): void {
  if (!state.factions.has(Faction.SPACING_GUILD)) {
    throw new Error('Guild is not in game');
  }
  
  const guildState = getFactionState(state, Faction.SPACING_GUILD);
  const actualAmount = guildState.spice;
  
  // Note: This checks total spice, not just payment received
  // For more precise testing, track payments separately
  if (actualAmount < expectedAmount) {
    throw new Error(
      `Expected Guild to have at least ${expectedAmount} spice, got ${actualAmount}`
    );
  }
}

// =============================================================================
// ALLIANCE ASSERTIONS
// =============================================================================

/**
 * Assert forces in Tleilaxu Tanks
 */
export function assertForcesInTanks(
  state: GameState,
  faction: Faction,
  expectedCount: number
): void {
  const factionState = getFactionState(state, faction);
  const actualCount = factionState.forces.tanks.regular + factionState.forces.tanks.elite;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} forces in tanks for ${faction}, got ${actualCount}`
    );
  }
}

