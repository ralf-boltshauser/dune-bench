/**
 * Test Utilities for Combat Rules Tests
 * 
 * General utilities for combat rule tests.
 */

import { getFactionState } from '../../../../state/index.js';
import { getLeaderDefinition, getTreacheryCardDefinition } from '../../../../data/index.js';
import { Faction, LeaderLocation, TerritoryId, TreacheryCardType } from '../../../../types/index.js';
import type { GameState } from '../../../../types/index.js';

export class CombatTestUtils {
  /**
   * Get first available leader for a faction
   */
  static getAvailableLeader(state: GameState, faction: Faction): string | null {
    const factionState = getFactionState(state, faction);
    const leader = factionState.leaders.find(
      l => l.location === LeaderLocation.LEADER_POOL
    );
    return leader?.definitionId || null;
  }

  /**
   * Get leader strength
   */
  static getLeaderStrength(leaderId: string): number {
    return getLeaderDefinition(leaderId)?.strength ?? 0;
  }

  /**
   * Get card type
   */
  static getCardType(cardId: string): TreacheryCardType | undefined {
    return getTreacheryCardDefinition(cardId)?.type;
  }

  /**
   * Check if faction has card in hand
   */
  static hasCard(state: GameState, faction: Faction, cardId: string): boolean {
    const factionState = getFactionState(state, faction);
    return factionState.hand.some(card => card.definitionId === cardId);
  }

  /**
   * Get force count in territory
   */
  static getForceCount(state: GameState, faction: Faction, territory: TerritoryId, sector?: number): number {
    const factionState = getFactionState(state, faction);
    if (sector !== undefined) {
      const stack = factionState.forces.onBoard.find(
        f => f.territoryId === territory && f.sector === sector
      );
      return (stack?.forces.regular || 0) + (stack?.forces.elite || 0);
    }
    // Sum all sectors
    return factionState.forces.onBoard
      .filter(f => f.territoryId === territory)
      .reduce((sum, stack) => sum + (stack.forces.regular || 0) + (stack.forces.elite || 0), 0);
  }

  /**
   * Get all available leaders for a faction
   */
  static getAvailableLeaders(state: GameState, faction: Faction): string[] {
    const factionState = getFactionState(state, faction);
    return factionState.leaders
      .filter(l => l.location === LeaderLocation.LEADER_POOL)
      .map(l => l.definitionId);
  }
}

