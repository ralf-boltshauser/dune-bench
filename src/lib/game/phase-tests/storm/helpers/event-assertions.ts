/**
 * Event-specific assertion utilities
 */

import { PhaseEvent } from '../../../phases/types';

export class EventAssertions {
  /**
   * Find event by type
   */
  static findEvent<T = any>(
    events: PhaseEvent[],
    type: string
  ): T | null {
    const event = events.find(e => e.type === type);
    return event ? (event as any as T) : null;
  }

  /**
   * Find all events by type
   */
  static findEvents<T = any>(
    events: PhaseEvent[],
    type: string
  ): T[] {
    return events.filter(e => e.type === type) as any as T[];
  }

  /**
   * Assert event exists
   */
  static assertEventExists(
    events: PhaseEvent[],
    type: string,
    message?: string
  ): void {
    const event = events.find(e => e.type === type);
    if (!event) {
      throw new Error(
        message || `Expected event of type ${type}, but none found`
      );
    }
  }

  /**
   * Assert event does not exist
   */
  static assertEventNotExists(
    events: PhaseEvent[],
    type: string,
    message?: string
  ): void {
    const event = events.find(e => e.type === type);
    if (event) {
      throw new Error(
        message || `Expected no event of type ${type}, but found one`
      );
    }
  }

  /**
   * Assert event data matches
   */
  static assertEventData(
    event: PhaseEvent,
    expectedData: Record<string, any>
  ): void {
    const actualData = event.data as any;
    for (const [key, expectedValue] of Object.entries(expectedData)) {
      if (actualData[key] !== expectedValue) {
        throw new Error(
          `Event ${event.type} data.${key}: expected ${expectedValue}, but got ${actualData[key]}`
        );
      }
    }
  }

  /**
   * Assert event order
   */
  static assertEventOrder(
    events: PhaseEvent[],
    expectedOrder: string[]
  ): void {
    const actualOrder = events.map(e => e.type);
    let expectedIndex = 0;

    for (let i = 0; i < actualOrder.length; i++) {
      if (expectedIndex < expectedOrder.length && actualOrder[i] === expectedOrder[expectedIndex]) {
        expectedIndex++;
      }
    }

    if (expectedIndex < expectedOrder.length) {
      throw new Error(
        `Expected event order to include ${expectedOrder.join(' -> ')}, but got ${actualOrder.join(' -> ')}`
      );
    }
  }

  /**
   * Assert event count
   */
  static assertEventCount(
    events: PhaseEvent[],
    type: string,
    expectedCount: number
  ): void {
    const actualCount = events.filter(e => e.type === type).length;
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} events of type ${type}, but got ${actualCount}`
      );
    }
  }

  /**
   * Assert event occurs before another event
   */
  static assertEventBefore(
    events: PhaseEvent[],
    firstType: string,
    secondType: string
  ): void {
    const firstIndex = events.findIndex(e => e.type === firstType);
    const secondIndex = events.findIndex(e => e.type === secondType);

    if (firstIndex === -1) {
      throw new Error(`Event ${firstType} not found`);
    }
    if (secondIndex === -1) {
      throw new Error(`Event ${secondType} not found`);
    }
    if (firstIndex >= secondIndex) {
      throw new Error(
        `Expected ${firstType} to occur before ${secondType}, but ${firstType} is at index ${firstIndex} and ${secondType} is at index ${secondIndex}`
      );
    }
  }
}

