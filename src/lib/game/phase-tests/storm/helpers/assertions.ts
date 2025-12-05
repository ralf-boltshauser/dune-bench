/**
 * Storm Phase Assertions
 * 
 * Reusable assertion functions for validating storm phase behavior.
 */

import { GameState, Faction, TerritoryId, Phase } from '../../../types';
import { PhaseEvent, PhaseStepResult } from '../../../phases/types';

export class StormAssertions {
  /**
   * Assert storm moved correctly
   */
  static assertStormMoved(
    events: PhaseEvent[],
    expectedFrom: number,
    expectedTo: number,
    expectedMovement: number
  ): void {
    const stormMovedEvent = events.find(e => e.type === 'STORM_MOVED');
    if (!stormMovedEvent) {
      throw new Error(`Expected STORM_MOVED event, but none found`);
    }

    const data = stormMovedEvent.data as any;
    if (data.from !== expectedFrom) {
      throw new Error(`Expected storm to move from sector ${expectedFrom}, but got ${data.from}`);
    }
    if (data.to !== expectedTo) {
      throw new Error(`Expected storm to move to sector ${expectedTo}, but got ${data.to}`);
    }
    if (data.movement !== expectedMovement) {
      throw new Error(`Expected movement of ${expectedMovement} sectors, but got ${data.movement}`);
    }
  }

  /**
   * Assert dials were revealed
   */
  static assertDialsRevealed(
    events: PhaseEvent[],
    expectedDialers: Faction[],
    expectedValues?: Map<Faction, number>
  ): void {
    const dialEvents = events.filter(e => e.type === 'STORM_DIAL_REVEALED');
    
    if (dialEvents.length !== expectedDialers.length) {
      throw new Error(
        `Expected ${expectedDialers.length} dial reveals, but got ${dialEvents.length}`
      );
    }

    const revealedFactions = new Set<Faction>();
    for (const event of dialEvents) {
      const data = event.data as any;
      const faction = data.faction as Faction;
      
      if (!expectedDialers.includes(faction)) {
        throw new Error(`Unexpected dialer: ${faction}`);
      }
      
      if (revealedFactions.has(faction)) {
        throw new Error(`Duplicate dial reveal for ${faction}`);
      }
      revealedFactions.add(faction);

      if (expectedValues && expectedValues.has(faction)) {
        const expectedValue = expectedValues.get(faction)!;
        if (data.value !== expectedValue) {
          throw new Error(
            `Expected ${faction} to dial ${expectedValue}, but got ${data.value}`
          );
        }
      }
    }
  }

  /**
   * Assert storm card was revealed
   */
  static assertStormCardRevealed(
    events: PhaseEvent[],
    expectedValue: number
  ): void {
    const revealEvent = events.find(e => e.type === 'STORM_CARD_REVEALED');
    if (!revealEvent) {
      throw new Error(`Expected STORM_CARD_REVEALED event, but none found`);
    }

    const data = revealEvent.data as any;
    if (data.value !== expectedValue) {
      throw new Error(
        `Expected storm card value ${expectedValue}, but got ${data.value}`
      );
    }
  }

  /**
   * Assert forces were destroyed
   */
  static assertForcesDestroyed(
    events: PhaseEvent[],
    expectedDestructions: Array<{
      faction: Faction;
      territory: TerritoryId;
      sector: number;
      count: number;
    }>
  ): void {
    const destructionEvents = events.filter(
      e => e.type === 'FORCES_KILLED_BY_STORM' || e.type === 'FORCES_KILLED_BY_FAMILY_ATOMICS'
    );

    if (destructionEvents.length !== expectedDestructions.length) {
      throw new Error(
        `Expected ${expectedDestructions.length} force destruction events, but got ${destructionEvents.length}`
      );
    }

    for (const expected of expectedDestructions) {
      const matchingEvent = destructionEvents.find(e => {
        const data = e.data as any;
        return (
          data.faction === expected.faction &&
          data.territoryId === expected.territory &&
          data.sector === expected.sector &&
          data.count === expected.count
        );
      });

      if (!matchingEvent) {
        throw new Error(
          `Expected destruction of ${expected.count} ${expected.faction} forces in ${expected.territory} sector ${expected.sector}, but no matching event found`
        );
      }
    }
  }

  /**
   * Assert spice was destroyed
   */
  static assertSpiceDestroyed(
    events: PhaseEvent[],
    expectedDestructions: Array<{
      territory: TerritoryId;
      sector: number;
      amount: number;
    }>
  ): void {
    const destructionEvents = events.filter(e => e.type === 'SPICE_DESTROYED_BY_STORM');

    if (destructionEvents.length !== expectedDestructions.length) {
      throw new Error(
        `Expected ${expectedDestructions.length} spice destruction events, but got ${destructionEvents.length}`
      );
    }

    for (const expected of expectedDestructions) {
      const matchingEvent = destructionEvents.find(e => {
        const data = e.data as any;
        return (
          data.territoryId === expected.territory &&
          data.sector === expected.sector &&
          data.amount === expected.amount
        );
      });

      if (!matchingEvent) {
        throw new Error(
          `Expected destruction of ${expected.amount} spice in ${expected.territory} sector ${expected.sector}, but no matching event found`
        );
      }
    }
  }

  /**
   * Assert Family Atomics was played
   */
  static assertFamilyAtomicsPlayed(
    events: PhaseEvent[],
    expectedFaction: Faction
  ): void {
    const event = events.find(e => e.type === 'FAMILY_ATOMICS_PLAYED');
    if (!event) {
      throw new Error(`Expected FAMILY_ATOMICS_PLAYED event, but none found`);
    }

    const data = event.data as any;
    if (data.faction !== expectedFaction) {
      throw new Error(
        `Expected ${expectedFaction} to play Family Atomics, but got ${data.faction}`
      );
    }
  }

  /**
   * Assert Weather Control was played
   */
  static assertWeatherControlPlayed(
    events: PhaseEvent[],
    expectedFaction: Faction,
    expectedMovement: number
  ): void {
    const event = events.find(e => e.type === 'WEATHER_CONTROL_PLAYED');
    if (!event) {
      throw new Error(`Expected WEATHER_CONTROL_PLAYED event, but none found`);
    }

    const data = event.data as any;
    if (data.faction !== expectedFaction) {
      throw new Error(
        `Expected ${expectedFaction} to play Weather Control, but got ${data.faction}`
      );
    }
    if (data.movement !== expectedMovement) {
      throw new Error(
        `Expected Weather Control movement of ${expectedMovement}, but got ${data.movement}`
      );
    }
  }

  /**
   * Assert storm order is correct
   */
  static assertStormOrder(
    state: GameState,
    expectedFirstPlayer: Faction,
    expectedOrder?: Faction[]
  ): void {
    if (state.stormOrder.length === 0) {
      throw new Error('Storm order is empty');
    }

    if (state.stormOrder[0] !== expectedFirstPlayer) {
      throw new Error(
        `Expected first player to be ${expectedFirstPlayer}, but got ${state.stormOrder[0]}`
      );
    }

    if (expectedOrder) {
      if (state.stormOrder.length !== expectedOrder.length) {
        throw new Error(
          `Expected storm order length ${expectedOrder.length}, but got ${state.stormOrder.length}`
        );
      }

      for (let i = 0; i < expectedOrder.length; i++) {
        if (state.stormOrder[i] !== expectedOrder[i]) {
          throw new Error(
            `Expected storm order position ${i} to be ${expectedOrder[i]}, but got ${state.stormOrder[i]}`
          );
        }
      }
    }
  }

  /**
   * Assert phase completed
   */
  static assertPhaseCompleted(
    result: PhaseStepResult,
    expectedNextPhase?: Phase
  ): void {
    if (!result.phaseComplete) {
      throw new Error('Expected phase to be complete, but it is not');
    }

    if (expectedNextPhase && result.nextPhase !== expectedNextPhase) {
      throw new Error(
        `Expected next phase to be ${expectedNextPhase}, but got ${result.nextPhase}`
      );
    }
  }

  /**
   * Assert pending requests
   */
  static assertPendingRequests(
    result: PhaseStepResult,
    expectedCount: number,
    expectedTypes?: string[]
  ): void {
    if (result.pendingRequests.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} pending requests, but got ${result.pendingRequests.length}`
      );
    }

    if (expectedTypes) {
      const actualTypes = result.pendingRequests.map(r => r.requestType);
      for (const expectedType of expectedTypes) {
        if (!actualTypes.includes(expectedType)) {
          throw new Error(
            `Expected pending request type ${expectedType}, but not found. Got: ${actualTypes.join(', ')}`
          );
        }
      }
    }
  }
}

