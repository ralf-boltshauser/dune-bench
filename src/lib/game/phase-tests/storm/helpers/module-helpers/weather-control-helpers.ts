/**
 * Weather Control module test helpers
 */

import { Faction } from '../../../../types';
import { StormTestStateBuilder } from '../test-state-builder';
import type { GameState } from '../../../../types';
import type { PhaseEvent } from '@/lib/game/phases/types';

export class WeatherControlTestHelpers {
  /**
   * Create state with Weather Control card
   */
  static createWithCard(
    faction: Faction
  ): GameState {
    return StormTestStateBuilder
      .forTurn2([faction, Faction.HARKONNEN], 10)
      .withCard(faction, 'weather_control')
      .build();
  }

  /**
   * Assert Weather Control play
   */
  static assertPlayed(
    events: PhaseEvent[],
    faction: Faction,
    expectedMovement: number
  ): void {
    const event = events.find(e => e.type === 'WEATHER_CONTROL_PLAYED');
    if (!event) {
      throw new Error('Expected WEATHER_CONTROL_PLAYED event');
    }

    const data = event.data as any;
    if (data.faction !== faction) {
      throw new Error(
        `Expected ${faction} to play Weather Control, but got ${data.faction}`
      );
    }
    if (data.movement !== expectedMovement) {
      throw new Error(
        `Expected Weather Control movement ${expectedMovement}, but got ${data.movement}`
      );
    }
  }

  /**
   * Assert movement override
   */
  static assertMovementOverride(
    calculatedMovement: number,
    weatherControlMovement: number,
    finalMovement: number
  ): void {
    if (finalMovement !== weatherControlMovement) {
      throw new Error(
        `Expected final movement to be Weather Control value ${weatherControlMovement}, but got ${finalMovement}. Calculated movement was ${calculatedMovement}.`
      );
    }
  }
}

