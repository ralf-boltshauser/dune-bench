/**
 * Context Assertions for Spice Blow Phase
 * 
 * Reusable utilities for testing context updates
 */

import { type SpiceBlowContext } from '../../../phases/handlers/spice-blow/types';
import { TerritoryId } from '../../../types';

export class ContextAssertions {
  /**
   * Assert context field value
   */
  static assertField<T extends keyof SpiceBlowContext>(
    context: SpiceBlowContext,
    field: T,
    expected: SpiceBlowContext[T]
  ): void {
    if (context[field] !== expected) {
      throw new Error(`Expected context.${field} to be ${JSON.stringify(expected)}, but got ${JSON.stringify(context[field])}`);
    }
  }
  
  /**
   * Assert card revealed flags
   */
  static assertCardRevealed(
    context: SpiceBlowContext,
    deck: 'A' | 'B',
    expected: boolean
  ): void {
    const field = deck === 'A' ? 'cardARevealed' : 'cardBRevealed';
    this.assertField(context, field, expected);
  }
  
  /**
   * Assert Nexus state
   */
  static assertNexusState(
    context: SpiceBlowContext,
    triggered: boolean,
    resolved: boolean
  ): void {
    this.assertField(context, 'nexusTriggered', triggered);
    this.assertField(context, 'nexusResolved', resolved);
  }
  
  /**
   * Assert worm count
   */
  static assertWormCount(
    context: SpiceBlowContext,
    expected: number
  ): void {
    this.assertField(context, 'shaiHuludCount', expected);
  }
  
  /**
   * Assert pending devour location
   */
  static assertPendingDevourLocation(
    context: SpiceBlowContext,
    expected: { territoryId: TerritoryId; sector: number } | null
  ): void {
    if (expected === null) {
      if (context.pendingDevourLocation !== null) {
        throw new Error(`Expected no pending devour location, but got ${JSON.stringify(context.pendingDevourLocation)}`);
      }
    } else {
      if (!context.pendingDevourLocation) {
        throw new Error(`Expected pending devour location ${JSON.stringify(expected)}, but got null`);
      }
      if (context.pendingDevourLocation.territoryId !== expected.territoryId ||
          context.pendingDevourLocation.sector !== expected.sector) {
        throw new Error(`Expected pending devour location ${JSON.stringify(expected)}, but got ${JSON.stringify(context.pendingDevourLocation)}`);
      }
    }
  }
  
  /**
   * Assert pending devour deck
   */
  static assertPendingDevourDeck(
    context: SpiceBlowContext,
    expected: 'A' | 'B' | null
  ): void {
    this.assertField(context, 'pendingDevourDeck', expected);
  }
  
  /**
   * Assert Fremen worm choice
   */
  static assertFremenWormChoice(
    context: SpiceBlowContext,
    expected: 'devour' | 'ride' | null
  ): void {
    this.assertField(context, 'fremenWormChoice', expected);
  }
  
  /**
   * Assert Fremen protection decision
   */
  static assertFremenProtectionDecision(
    context: SpiceBlowContext,
    expected: 'protect' | 'allow' | null
  ): void {
    this.assertField(context, 'fremenProtectionDecision', expected);
  }
  
  /**
   * Assert last spice location
   */
  static assertLastSpiceLocation(
    context: SpiceBlowContext,
    expected: { territoryId: TerritoryId; sector: number } | null
  ): void {
    if (expected === null) {
      if (context.lastSpiceLocation !== null) {
        throw new Error(`Expected no last spice location, but got ${JSON.stringify(context.lastSpiceLocation)}`);
      }
    } else {
      if (!context.lastSpiceLocation) {
        throw new Error(`Expected last spice location ${JSON.stringify(expected)}, but got null`);
      }
      if (context.lastSpiceLocation.territoryId !== expected.territoryId ||
          context.lastSpiceLocation.sector !== expected.sector) {
        throw new Error(`Expected last spice location ${JSON.stringify(expected)}, but got ${JSON.stringify(context.lastSpiceLocation)}`);
      }
    }
  }
  
  /**
   * Assert turn one worms set aside
   */
  static assertTurnOneWormsSetAside(
    context: SpiceBlowContext,
    expectedCount: number
  ): void {
    if (context.turnOneWormsSetAside.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} turn one worms set aside, but got ${context.turnOneWormsSetAside.length}`);
    }
  }
  
  /**
   * Assert factions acted in Nexus
   */
  static assertFactionsActedInNexus(
    context: SpiceBlowContext,
    expectedFactions: string[]
  ): void {
    const actualFactions = Array.from(context.factionsActedInNexus);
    if (JSON.stringify(actualFactions.sort()) !== JSON.stringify(expectedFactions.sort())) {
      throw new Error(`Expected factions acted in Nexus ${JSON.stringify(expectedFactions)}, but got ${JSON.stringify(actualFactions)}`);
    }
  }
}

