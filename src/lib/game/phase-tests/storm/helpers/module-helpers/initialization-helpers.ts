/**
 * Test Helpers for Initialization Module
 * 
 * Reusable utilities for testing initialization module functions.
 */

import { Faction, type GameState } from '../../../../types';
import { StormPhaseContext, type AgentRequest } from '../../../../phases/types';
import { resetContext } from '../../../../phases/handlers/storm/initialization';
import { StormTestStateBuilder } from '../test-state-builder';
import { StateAssertions } from '../state-assertions';
import { EventAssertions } from '../event-assertions';

export class InitializationTestHelpers {
  /**
   * Create a clean context for testing
   */
  static createCleanContext(): StormPhaseContext {
    return resetContext();
  }

  /**
   * Assert context is reset to initial state
   */
  static assertContextReset(context: StormPhaseContext): void {
    if (context.dialingFactions !== null) {
      throw new Error('Expected dialingFactions to be null');
    }
    if (context.dials.size !== 0) {
      throw new Error('Expected dials map to be empty');
    }
    if (context.stormMovement !== null) {
      throw new Error('Expected stormMovement to be null');
    }
    if (context.weatherControlUsed !== false) {
      throw new Error('Expected weatherControlUsed to be false');
    }
    if (context.weatherControlBy !== null) {
      throw new Error('Expected weatherControlBy to be null');
    }
    if (context.familyAtomicsUsed !== false) {
      throw new Error('Expected familyAtomicsUsed to be false');
    }
    if (context.familyAtomicsBy !== null) {
      throw new Error('Expected familyAtomicsBy to be null');
    }
    if (context.waitingForFamilyAtomics !== false) {
      throw new Error('Expected waitingForFamilyAtomics to be false');
    }
    if (context.waitingForWeatherControl !== false) {
      throw new Error('Expected waitingForWeatherControl to be false');
    }
  }

  /**
   * Create state with storm deck
   */
  static createStormDeckState(cardValues: number[]): GameState {
    return StormTestStateBuilder
      .withFremen([Faction.ATREIDES, Faction.FREMEN], 2)
      .withStormDeck(cardValues)
      .build();
  }

  /**
   * Assert storm deck card was drawn
   */
  static assertStormDeckDrawn(
    state: GameState,
    expectedCard: number,
    originalDeckSize: number
  ): void {
    if (state.stormDeck.length !== originalDeckSize - 1) {
      throw new Error(
        `Expected deck size ${originalDeckSize - 1}, but got ${state.stormDeck.length}`
      );
    }
    if (state.stormDeck.includes(expectedCard)) {
      throw new Error(`Expected card ${expectedCard} to be removed from deck`);
    }
  }

  /**
   * Assert storm deck was shuffled after returning card
   */
  static assertStormDeckShuffled(
    state: GameState,
    returnedCard: number,
    expectedSize: number
  ): void {
    if (state.stormDeck.length !== expectedSize) {
      throw new Error(
        `Expected deck size ${expectedSize}, but got ${state.stormDeck.length}`
      );
    }
    if (!state.stormDeck.includes(returnedCard)) {
      throw new Error(`Expected card ${returnedCard} to be in deck after return`);
    }
  }

  /**
   * Assert Fremen card was stored
   */
  static assertFremenCardStored(
    state: GameState,
    expectedCard: string
  ): void {
    StateAssertions.assertFremenStormCard(state, expectedCard);
  }

  /**
   * Assert dial requests were created correctly
   */
  static assertDialRequestsCreated(
    requests: AgentRequest[],
    expectedDialers: Faction[]
  ): void {
    if (requests.length !== expectedDialers.length) {
      throw new Error(
        `Expected ${expectedDialers.length} requests, but got ${requests.length}`
      );
    }
    const requestFactions = requests.map(r => r.factionId);
    for (const expectedDialer of expectedDialers) {
      if (!requestFactions.includes(expectedDialer)) {
        throw new Error(`Expected request for ${expectedDialer}, but not found`);
      }
    }
  }

  /**
   * Assert request count
   */
  static assertRequestCount(
    requests: AgentRequest[],
    expectedCount: number
  ): void {
    if (requests.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} requests, but got ${requests.length}`
      );
    }
  }

  /**
   * Assert request uniqueness (no duplicate faction requests)
   */
  static assertRequestUniqueness(requests: AgentRequest[]): void {
    const factions = requests.map(r => r.factionId);
    const uniqueFactions = new Set(factions);
    if (factions.length !== uniqueFactions.size) {
      throw new Error('Duplicate faction requests found');
    }
  }

  /**
   * Assert initialization result
   */
  static assertInitializationResult(
    result: any,
    expectations: {
      hasRequests?: boolean;
      requestCount?: number;
      simultaneous?: boolean;
      stormDeckUsed?: boolean;
    }
  ): void {
    if (expectations.hasRequests !== undefined) {
      const hasRequests = result.pendingRequests.length > 0;
      if (hasRequests !== expectations.hasRequests) {
        throw new Error(
          `Expected hasRequests=${expectations.hasRequests}, but got ${hasRequests}`
        );
      }
    }
    if (expectations.requestCount !== undefined) {
      if (result.pendingRequests.length !== expectations.requestCount) {
        throw new Error(
          `Expected ${expectations.requestCount} requests, but got ${result.pendingRequests.length}`
        );
      }
    }
    if (expectations.simultaneous !== undefined) {
      if (result.simultaneousRequests !== expectations.simultaneous) {
        throw new Error(
          `Expected simultaneous=${expectations.simultaneous}, but got ${result.simultaneousRequests}`
        );
      }
    }
    if (expectations.stormDeckUsed !== undefined) {
      const stormDeckUsed = result.events.some(
        (e: any) => e.type === 'STORM_CARD_REVEALED'
      );
      if (stormDeckUsed !== expectations.stormDeckUsed) {
        throw new Error(
          `Expected stormDeckUsed=${expectations.stormDeckUsed}, but got ${stormDeckUsed}`
        );
      }
    }
  }
}

