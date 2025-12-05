/**
 * Event Assertions for Spice Blow Phase
 * 
 * Reusable utilities for testing event emission
 */

import { type PhaseEvent } from '../../../phases/types';
import { type SpiceBlowStepResult } from '../../../phases/handlers/spice-blow/types';

export class EventAssertions {
  /**
   * Assert event was emitted
   */
  static assertEventEmitted(
    result: SpiceBlowStepResult,
    eventType: string
  ): PhaseEvent {
    const event = result.events.find(e => e.type === eventType);
    if (!event) {
      throw new Error(`Expected event ${eventType} to be emitted, but it was not found. Available events: ${result.events.map(e => e.type).join(', ')}`);
    }
    return event;
  }
  
  /**
   * Assert event was NOT emitted
   */
  static assertEventNotEmitted(
    result: SpiceBlowStepResult,
    eventType: string
  ): void {
    const event = result.events.find(e => e.type === eventType);
    if (event) {
      throw new Error(`Expected event ${eventType} NOT to be emitted, but it was found`);
    }
  }
  
  /**
   * Assert event data matches
   */
  static assertEventData(
    event: PhaseEvent,
    expectedData: Record<string, any>
  ): void {
    for (const [key, value] of Object.entries(expectedData)) {
      if (event.data[key] !== value) {
        throw new Error(`Expected event.data.${key} to be ${JSON.stringify(value)}, but got ${JSON.stringify(event.data[key])}`);
      }
    }
  }
  
  /**
   * Assert event sequence
   */
  static assertEventSequence(
    result: SpiceBlowStepResult,
    expectedTypes: string[]
  ): void {
    const actualTypes = result.events.map(e => e.type);
    if (JSON.stringify(actualTypes) !== JSON.stringify(expectedTypes)) {
      throw new Error(`Expected event sequence ${JSON.stringify(expectedTypes)}, but got ${JSON.stringify(actualTypes)}`);
    }
  }
  
  /**
   * Assert event count
   */
  static assertEventCount(
    result: SpiceBlowStepResult,
    eventType: string,
    expectedCount: number
  ): void {
    const count = result.events.filter(e => e.type === eventType).length;
    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} events of type ${eventType}, but got ${count}`);
    }
  }
  
  /**
   * Assert event contains data field
   */
  static assertEventHasData(
    event: PhaseEvent,
    field: string
  ): void {
    if (!(field in event.data)) {
      throw new Error(`Expected event to have data field ${field}, but it was not found`);
    }
  }
  
  /**
   * Assert event message contains text
   */
  static assertEventMessageContains(
    event: PhaseEvent,
    text: string
  ): void {
    if (!event.message.includes(text)) {
      throw new Error(`Expected event message to contain "${text}", but got "${event.message}"`);
    }
  }
}

