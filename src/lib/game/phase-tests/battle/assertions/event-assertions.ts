/**
 * Event-Specific Assertions
 * 
 * Assertions for validating battle phase events.
 */

import { Faction, TerritoryId } from '../../../types';
import type { ScenarioResult } from '../scenarios/base-scenario';
import type { BattleAssertion } from './battle-assertions';

/**
 * Assert that an event occurred with specific data
 */
export function assertEventWithData(
  eventType: string,
  dataMatcher: (data: any) => boolean
): BattleAssertion {
  return {
    name: `Event ${eventType} with matching data`,
    check: (result) => {
      const event = result.events.find(e => e.type === eventType);
      if (!event) return false;
      return dataMatcher((event as any).data);
    },
    message: `Expected event ${eventType} with matching data`,
  };
}

/**
 * Assert that events occurred in a specific sequence
 */
export function assertEventSequence(
  eventTypes: string[]
): BattleAssertion {
  return {
    name: `Events in sequence: ${eventTypes.join(' → ')}`,
    check: (result) => {
      const eventTypesInResult = result.events.map(e => e.type);
      let lastIndex = -1;
      for (const eventType of eventTypes) {
        const index = eventTypesInResult.indexOf(eventType, lastIndex + 1);
        if (index === -1) return false;
        lastIndex = index;
      }
      return true;
    },
    message: `Expected events in sequence: ${eventTypes.join(' → ')}`,
  };
}

/**
 * Assert that an event occurred a specific number of times
 */
export function assertEventCount(
  eventType: string,
  expectedCount: number
): BattleAssertion {
  return {
    name: `Event ${eventType} occurred ${expectedCount} times`,
    check: (result) => {
      const count = result.events.filter(e => e.type === eventType).length;
      return count === expectedCount;
    },
    message: `Expected event ${eventType} to occur ${expectedCount} times`,
  };
}

/**
 * Assert that an event did NOT occur
 */
export function assertNoEvent(
  eventType: string
): BattleAssertion {
  return {
    name: `Event ${eventType} did not occur`,
    check: (result) => {
      return !result.events.some(e => e.type === eventType);
    },
    message: `Expected event ${eventType} to NOT occur`,
  };
}

/**
 * Assert ADVISORS_FLIPPED event
 */
export function assertAdvisorsFlipped(
  faction: Faction,
  territory: TerritoryId,
  count: number
): BattleAssertion {
  return assertEventWithData('ADVISORS_FLIPPED', (data) => {
    return data.faction === faction &&
           data.territoryId === territory &&
           data.count === count &&
           data.reason === 'universal_stewards';
  });
}

/**
 * Assert PRISON_BREAK event
 */
export function assertPrisonBreak(
  faction: Faction
): BattleAssertion {
  return assertEventWithData('PRISON_BREAK', (data) => {
    return data.faction === faction;
  });
}

/**
 * Assert LASGUN_SHIELD_EXPLOSION event
 */
export function assertLasgunShieldExplosion(): BattleAssertion {
  return {
    name: 'Lasgun-shield explosion occurred',
    check: (result) => {
      return result.events.some(e => e.type === 'LASGUN_SHIELD_EXPLOSION');
    },
    message: 'Expected LASGUN_SHIELD_EXPLOSION event',
  };
}

/**
 * Assert STRONGHOLD_OCCUPANCY_VIOLATION event
 */
export function assertStrongholdOccupancyViolation(
  territory: TerritoryId
): BattleAssertion {
  return assertEventWithData('STRONGHOLD_OCCUPANCY_VIOLATION', (data) => {
    return data.territoryId === territory;
  });
}

/**
 * Assert NO_BATTLES event
 */
export function assertNoBattles(): BattleAssertion {
  return {
    name: 'No battles event',
    check: (result) => {
      return result.events.some(e => e.type === 'NO_BATTLES');
    },
    message: 'Expected NO_BATTLES event',
  };
}

