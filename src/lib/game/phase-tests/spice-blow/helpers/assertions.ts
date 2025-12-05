/**
 * Assertion Helpers for Spice Blow Phase Tests
 * 
 * Reusable assertion functions - write once, use everywhere
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { type PhaseEvent } from '../../../phases/types';
import { getSpiceCardDefinition } from '../../../data';
import { type SpiceBlowContext } from '../../../phases/handlers/spice-blow/types';

// =============================================================================
// STATE ASSERTIONS
// =============================================================================

/**
 * Assert spice is placed on a territory
 */
export function assertSpicePlaced(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): void {
  const spice = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  
  if (!spice) {
    throw new Error(
      `Expected ${amount} spice at ${territoryId} (sector ${sector}), but no spice found`
    );
  }
  
  if (spice.amount !== amount) {
    throw new Error(
      `Expected ${amount} spice at ${territoryId} (sector ${sector}), but found ${spice.amount}`
    );
  }
}

/**
 * Assert spice is NOT placed on a territory
 */
export function assertSpiceNotPlaced(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): void {
  const spice = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  
  if (spice) {
    throw new Error(
      `Expected no spice at ${territoryId} (sector ${sector}), but found ${spice.amount} spice`
    );
  }
}

/**
 * Assert spice is destroyed in a territory
 */
export function assertSpiceDestroyed(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): void {
  const spice = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  
  if (spice) {
    throw new Error(
      `Expected spice to be destroyed at ${territoryId} (sector ${sector}), but ${spice.amount} spice still exists`
    );
  }
}

/**
 * Assert forces are devoured (sent to Tleilaxu Tanks)
 */
export function assertForcesDevoured(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number
): void {
  const factionState = state.factions.get(faction);
  if (!factionState) {
    throw new Error(`Faction ${faction} not found in state`);
  }
  
  const forcesInSector = factionState.forces.onBoard.find(
    (f) => f.territoryId === territoryId && f.sector === sector
  );
  
  if (forcesInSector) {
    const totalForces =
      forcesInSector.forces.regular + forcesInSector.forces.elite;
    throw new Error(
      `Expected ${expectedCount} ${faction} forces to be devoured at ${territoryId} (sector ${sector}), but ${totalForces} forces still on board`
    );
  }
  
  // Check if forces are in tanks (they should be)
  const totalInTanks =
    factionState.forces.tanks.regular + factionState.forces.tanks.elite;
  if (totalInTanks < expectedCount) {
    throw new Error(
      `Expected at least ${expectedCount} ${faction} forces in tanks, but found ${totalInTanks}`
    );
  }
}

/**
 * Assert forces are NOT devoured
 */
export function assertForcesNotDevoured(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number
): void {
  const factionState = state.factions.get(faction);
  if (!factionState) {
    throw new Error(`Faction ${faction} not found in state`);
  }
  
  const forcesInSector = factionState.forces.onBoard.find(
    (f) => f.territoryId === territoryId && f.sector === sector
  );
  
  if (!forcesInSector) {
    throw new Error(
      `Expected ${expectedCount} ${faction} forces to remain at ${territoryId} (sector ${sector}), but no forces found`
    );
  }
  
  const totalForces =
    forcesInSector.forces.regular + forcesInSector.forces.elite;
  if (totalForces !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} ${faction} forces at ${territoryId} (sector ${sector}), but found ${totalForces}`
    );
  }
}

/**
 * Assert alliance is formed
 */
export function assertAllianceFormed(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): void {
  const state1 = state.factions.get(faction1);
  const state2 = state.factions.get(faction2);
  
  if (!state1 || !state2) {
    throw new Error(`One or both factions not found: ${faction1}, ${faction2}`);
  }
  
  if (state1.allyId !== faction2) {
    throw new Error(
      `Expected ${faction1} to be allied with ${faction2}, but ally is ${state1.allyId || 'none'}`
    );
  }
  
  if (state2.allyId !== faction1) {
    throw new Error(
      `Expected ${faction2} to be allied with ${faction1}, but ally is ${state2.allyId || 'none'}`
    );
  }
}

/**
 * Assert alliance is broken
 */
export function assertAllianceBroken(
  state: GameState,
  faction: Faction
): void {
  const factionState = state.factions.get(faction);
  
  if (!factionState) {
    throw new Error(`Faction ${faction} not found in state`);
  }
  
  if (factionState.allyId !== null) {
    throw new Error(
      `Expected ${faction} to have no ally, but ally is ${factionState.allyId}`
    );
  }
}

/**
 * Assert Nexus is triggered
 */
export function assertNexusTriggered(events: PhaseEvent[]): void {
  const nexusEvent = events.find((e) => e.type === 'NEXUS_STARTED');
  if (!nexusEvent) {
    throw new Error('Expected NEXUS_STARTED event, but not found');
  }
}

/**
 * Assert Nexus is NOT triggered
 */
export function assertNexusNotTriggered(events: PhaseEvent[]): void {
  const nexusEvent = events.find((e) => e.type === 'NEXUS_STARTED');
  if (nexusEvent) {
    throw new Error('Expected no NEXUS_STARTED event, but found one');
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
  expectedData?: Record<string, unknown>
): void {
  const event = events.find((e) => e.type === eventType);
  
  if (!event) {
    throw new Error(`Expected event ${eventType}, but not found`);
  }
  
  if (expectedData) {
    for (const [key, value] of Object.entries(expectedData)) {
      if ((event.data as Record<string, unknown>)[key] !== value) {
        throw new Error(
          `Event ${eventType} data.${key} expected ${value}, but got ${(event.data as Record<string, unknown>)[key]}`
        );
      }
    }
  }
}

/**
 * Assert an event was NOT emitted
 */
export function assertEventNotEmitted(
  events: PhaseEvent[],
  eventType: string
): void {
  const event = events.find((e) => e.type === eventType);
  if (event) {
    throw new Error(`Expected no ${eventType} event, but found one`);
  }
}

/**
 * Assert event sequence
 */
export function assertEventSequence(
  events: PhaseEvent[],
  sequence: string[]
): void {
  const eventTypes = events.map((e) => e.type);
  
  let sequenceIndex = 0;
  for (let i = 0; i < eventTypes.length && sequenceIndex < sequence.length; i++) {
    if (eventTypes[i] === sequence[sequenceIndex]) {
      sequenceIndex++;
    }
  }
  
  if (sequenceIndex < sequence.length) {
    throw new Error(
      `Expected event sequence ${sequence.join(' -> ')}, but got ${eventTypes.join(' -> ')}`
    );
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
  const count = events.filter((e) => e.type === eventType).length;
  if (count !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} ${eventType} events, but found ${count}`
    );
  }
}

// =============================================================================
// DECK ASSERTIONS
// =============================================================================

/**
 * Assert card is in deck
 */
export function assertCardInDeck(
  state: GameState,
  deckType: 'A' | 'B',
  cardId: string
): void {
  const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
  const found = deck.some((card) => card.definitionId === cardId);
  
  if (!found) {
    throw new Error(`Expected card ${cardId} in deck ${deckType}, but not found`);
  }
}

/**
 * Assert card is in discard pile
 */
export function assertCardInDiscard(
  state: GameState,
  deckType: 'A' | 'B',
  cardId: string
): void {
  const discard = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
  const found = discard.some((card) => card.definitionId === cardId);
  
  if (!found) {
    throw new Error(
      `Expected card ${cardId} in discard ${deckType}, but not found`
    );
  }
}

/**
 * Assert card is NOT in deck
 */
export function assertCardNotInDeck(
  state: GameState,
  deckType: 'A' | 'B',
  cardId: string
): void {
  const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
  const found = deck.some((card) => card.definitionId === cardId);
  
  if (found) {
    throw new Error(`Expected card ${cardId} NOT in deck ${deckType}, but found`);
  }
}

/**
 * Assert deck size
 */
export function assertDeckSize(
  state: GameState,
  deckType: 'A' | 'B',
  expectedSize: number
): void {
  const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
  if (deck.length !== expectedSize) {
    throw new Error(
      `Expected deck ${deckType} size ${expectedSize}, but got ${deck.length}`
    );
  }
}

/**
 * Assert discard pile size
 */
export function assertDiscardSize(
  state: GameState,
  deckType: 'A' | 'B',
  expectedSize: number
): void {
  const discard = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
  if (discard.length !== expectedSize) {
    throw new Error(
      `Expected discard ${deckType} size ${expectedSize}, but got ${discard.length}`
    );
  }
}

// =============================================================================
// CONTEXT ASSERTIONS
// =============================================================================

/**
 * Assert context field value
 */
export function assertContextField<T extends keyof SpiceBlowContext>(
  context: SpiceBlowContext,
  field: T,
  expectedValue: SpiceBlowContext[T]
): void {
  const actualValue = context[field];
  
  if (actualValue !== expectedValue) {
    throw new Error(
      `Expected context.${field} to be ${expectedValue}, but got ${actualValue}`
    );
  }
}

/**
 * Assert context flags
 */
export function assertContextFlags(
  context: SpiceBlowContext,
  flags: Partial<SpiceBlowContext>
): void {
  for (const [key, value] of Object.entries(flags)) {
    assertContextField(context, key as keyof SpiceBlowContext, value);
  }
}

// =============================================================================
// PHASE ASSERTIONS
// =============================================================================

/**
 * Assert phase completed
 */
export function assertPhaseComplete(
  phaseComplete: boolean,
  nextPhase?: string
): void {
  if (!phaseComplete) {
    throw new Error('Expected phase to be complete, but it is not');
  }
  
  if (nextPhase !== undefined && nextPhase !== 'CHOAM_CHARITY') {
    throw new Error(
      `Expected next phase to be CHOAM_CHARITY, but got ${nextPhase}`
    );
  }
}

/**
 * Assert phase NOT complete
 */
export function assertPhaseNotComplete(phaseComplete: boolean): void {
  if (phaseComplete) {
    throw new Error('Expected phase to NOT be complete, but it is');
  }
}

