/**
 * Event Assertions
 *
 * Reusable assertions for event validation.
 */

import { MockEventStreamer } from "../mocks/event-streamer";

export class EventAssertions {
  static expectEventEmitted(
    streamer: MockEventStreamer,
    type: string,
    gameId?: string
  ): void {
    if (gameId) {
      if (!streamer.hasEvent(type, gameId)) {
        throw new Error(
          `Expected event ${type} to be emitted for gameId ${gameId}`
        );
      }
    } else {
      if (!streamer.hasEvent(type)) {
        throw new Error(`Expected event ${type} to be emitted`);
      }
    }
  }

  static expectEventData(
    streamer: MockEventStreamer,
    type: string,
    expectedData: unknown
  ): void {
    const events = streamer.getEventsByType(type);
    if (events.length === 0) {
      throw new Error(`No events of type ${type} found`);
    }

    const lastEvent = events[events.length - 1];
    const actualData = JSON.stringify(lastEvent.data);
    const expectedDataStr = JSON.stringify(expectedData);

    if (actualData !== expectedDataStr) {
      throw new Error(
        `Expected event data ${expectedDataStr}, got ${actualData}`
      );
    }
  }

  static expectEventOrder(
    streamer: MockEventStreamer,
    types: string[]
  ): void {
    const events = streamer.getEvents();
    if (events.length < types.length) {
      throw new Error(
        `Expected at least ${types.length} events, got ${events.length}`
      );
    }

    types.forEach((type, index) => {
      if (events[index].type !== type) {
        throw new Error(
          `Expected event ${index} to be ${type}, got ${events[index].type}`
        );
      }
    });
  }

  static expectEventCount(
    streamer: MockEventStreamer,
    type: string,
    expectedCount: number
  ): void {
    const count = streamer.getEventCount(type);
    if (count !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} events of type ${type}, got ${count}`
      );
    }
  }

  static expectNoEvent(
    streamer: MockEventStreamer,
    type: string
  ): void {
    if (streamer.hasEvent(type)) {
      throw new Error(`Expected no event of type ${type} to be emitted`);
    }
  }
}

