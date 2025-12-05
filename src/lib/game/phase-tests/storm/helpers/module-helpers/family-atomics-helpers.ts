/**
 * Family Atomics module test helpers
 */

import { Faction, TerritoryId } from '../../../../types';
import { StormTestStateBuilder } from '../test-state-builder';
import type { GameState } from '../../../../types';
import type { PhaseEvent } from '@/lib/game/phases/types';

export class FamilyAtomicsTestHelpers {
  /**
   * Create state with forces on Shield Wall
   */
  static createWithForcesOnWall(
    faction: Faction,
    count: number
  ): GameState {
    return StormTestStateBuilder
      .forTurn2([faction, Faction.HARKONNEN], 5)
      .withForces({
        faction,
        territory: TerritoryId.SHIELD_WALL,
        sector: 7,
        regular: count,
      })
      .withCard(faction, 'family_atomics')
      .build();
  }

  /**
   * Create state with forces adjacent to Shield Wall
   */
  static createWithForcesAdjacent(
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    count: number,
    stormBetween: boolean
  ): GameState {
    // If storm is between, place storm at a sector between the forces and Shield Wall
    const stormSector = stormBetween ? (sector + 1) % 18 : 0;

    return StormTestStateBuilder
      .forTurn2([faction, Faction.HARKONNEN], stormSector)
      .withForces({
        faction,
        territory,
        sector,
        regular: count,
      })
      .withCard(faction, 'family_atomics')
      .build();
  }

  /**
   * Assert Family Atomics eligibility
   */
  static assertEligibility(
    canPlay: boolean,
    expected: boolean
  ): void {
    if (canPlay !== expected) {
      throw new Error(
        `Expected eligibility to be ${expected}, but got ${canPlay}`
      );
    }
  }

  /**
   * Assert Shield Wall destruction
   */
  static assertShieldWallDestroyed(
    events: PhaseEvent[],
    expectedForcesDestroyed: number
  ): void {
    const familyAtomicsEvent = events.find(e => e.type === 'FAMILY_ATOMICS_PLAYED');
    if (!familyAtomicsEvent) {
      throw new Error('Expected FAMILY_ATOMICS_PLAYED event');
    }

    const forceDestructionEvents = events.filter(
      e => e.type === 'FORCES_KILLED_BY_FAMILY_ATOMICS'
    );

    let totalDestroyed = 0;
    for (const event of forceDestructionEvents) {
      const data = event.data as any;
      totalDestroyed += data.count || 0;
    }

    if (totalDestroyed !== expectedForcesDestroyed) {
      throw new Error(
        `Expected ${expectedForcesDestroyed} forces destroyed, but got ${totalDestroyed}`
      );
    }
  }
}

