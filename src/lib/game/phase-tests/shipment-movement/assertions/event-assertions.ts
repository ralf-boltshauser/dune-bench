/**
 * Event Assertions for Shipment & Movement Phase Tests
 * 
 * Single source of truth for all event validation assertions.
 */

import type { PhaseEvent } from '../../../phases/types';
import { Faction } from '../../../types';

/**
 * Assert an event of a specific type was emitted
 */
export function assertEventEmitted(
  events: PhaseEvent[],
  eventType: string,
  predicate?: (event: PhaseEvent) => boolean
): void {
  const matchingEvents = events.filter((e) => e.type === eventType);
  
  if (matchingEvents.length === 0) {
    throw new Error(
      `Expected event ${eventType} to be emitted, but it was not. Available events: ${events.map((e) => e.type).join(', ')}`
    );
  }
  
  if (predicate) {
    const matching = matchingEvents.find(predicate);
    if (!matching) {
      throw new Error(
        `Expected event ${eventType} matching predicate, but none found. Found ${matchingEvents.length} events of type ${eventType}`
      );
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
  const matchingEvents = events.filter((e) => e.type === eventType);
  
  if (matchingEvents.length > 0) {
    throw new Error(
      `Expected event ${eventType} to NOT be emitted, but ${matchingEvents.length} event(s) found`
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
  const actualCount = events.filter((e) => e.type === eventType).length;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} events of type ${eventType}, got ${actualCount}`
    );
  }
}

/**
 * Assert event sequence (events appear in order)
 */
export function assertEventSequence(
  events: PhaseEvent[],
  expectedSequence: string[]
): void {
  const eventTypes = events.map((e) => e.type);
  let sequenceIndex = 0;
  
  for (const eventType of eventTypes) {
    if (sequenceIndex < expectedSequence.length && eventType === expectedSequence[sequenceIndex]) {
      sequenceIndex++;
    }
  }
  
  if (sequenceIndex < expectedSequence.length) {
    throw new Error(
      `Expected event sequence ${expectedSequence.join(' → ')}, but only found ${expectedSequence.slice(0, sequenceIndex).join(' → ')}. Full events: ${eventTypes.join(', ')}`
    );
  }
}

/**
 * Assert event contains specific data
 */
export function assertEventData(
  events: PhaseEvent[],
  eventType: string,
  expectedData: Record<string, any>
): void {
  const matchingEvents = events.filter((e) => e.type === eventType);
  
  if (matchingEvents.length === 0) {
    throw new Error(`Expected event ${eventType} to be emitted, but it was not`);
  }
  
  const event = matchingEvents[0];
  for (const [key, value] of Object.entries(expectedData)) {
    if ((event.data as any)[key] !== value) {
      throw new Error(
        `Expected event ${eventType} to have data.${key} = ${value}, got ${(event.data as any)[key]}`
      );
    }
  }
}

/**
 * Assert event for specific faction
 */
export function assertEventForFaction(
  events: PhaseEvent[],
  eventType: string,
  faction: Faction
): void {
  const matchingEvents = events.filter(
    (e) => e.type === eventType && (e.data as any)?.faction === faction
  );
  
  if (matchingEvents.length === 0) {
    throw new Error(
      `Expected event ${eventType} for ${faction} to be emitted, but it was not`
    );
  }
}

/**
 * Assert phase completed
 */
export function assertPhaseCompleted(result: { completed: boolean }): void {
  if (!result.completed) {
    throw new Error('Expected phase to be completed, but it was not');
  }
}

/**
 * Assert phase not completed
 */
export function assertPhaseNotCompleted(result: { completed: boolean }): void {
  if (result.completed) {
    throw new Error('Expected phase to NOT be completed, but it was');
  }
}

