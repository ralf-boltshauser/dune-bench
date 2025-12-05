/**
 * Mock Event Streamer
 *
 * Tracks all event emissions for verification in tests.
 */

export interface CapturedEvent {
  type: string;
  gameId: string;
  data: unknown;
  timestamp: number;
}

export class MockEventStreamer {
  private events: CapturedEvent[] = [];

  async emit<T = unknown>(
    type: string,
    gameId: string,
    data: T
  ): Promise<void> {
    this.events.push({
      type,
      gameId,
      data,
      timestamp: Date.now(),
    });
  }

  getEvents(): CapturedEvent[] {
    return [...this.events];
  }

  getEventsByType(type: string): CapturedEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  clear(): void {
    this.events = [];
  }

  hasEvent(type: string, gameId?: string): boolean {
    if (gameId) {
      return this.events.some(
        (e) => e.type === type && e.gameId === gameId
      );
    }
    return this.events.some((e) => e.type === type);
  }

  getLastEvent(): CapturedEvent | undefined {
    return this.events[this.events.length - 1];
  }

  getEventCount(type: string): number {
    return this.getEventsByType(type).length;
  }

  getEventsForGame(gameId: string): CapturedEvent[] {
    return this.events.filter((e) => e.gameId === gameId);
  }

  getLastEventOfType(type: string): CapturedEvent | undefined {
    const typeEvents = this.getEventsByType(type);
    return typeEvents[typeEvents.length - 1];
  }

  // Verification helpers
  expectEvent(type: string, dataMatcher?: (data: unknown) => boolean): void {
    const events = this.getEventsByType(type);
    if (events.length === 0) {
      throw new Error(`Expected event ${type} but it was not emitted`);
    }
    if (dataMatcher) {
      const matchingEvent = events.find((e) => dataMatcher(e.data));
      if (!matchingEvent) {
        throw new Error(
          `Expected event ${type} with matching data but none found`
        );
      }
    }
  }

  expectEventSequence(sequence: string[]): void {
    const allEvents = this.getEvents();
    let sequenceIndex = 0;
    for (const event of allEvents) {
      if (sequenceIndex < sequence.length && event.type === sequence[sequenceIndex]) {
        sequenceIndex++;
      }
    }
    if (sequenceIndex < sequence.length) {
      throw new Error(
        `Expected event sequence ${sequence.join(" -> ")}, but got partial sequence`
      );
    }
  }

  verifyAllEvents(): void {
    // Can be extended with custom verification logic
    if (this.events.length === 0) {
      throw new Error("Expected events but none were emitted");
    }
  }
}

export const mockEventStreamer = new MockEventStreamer();

