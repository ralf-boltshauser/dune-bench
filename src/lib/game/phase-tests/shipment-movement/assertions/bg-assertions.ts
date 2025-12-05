/**
 * BG Ability-Specific Assertions
 * 
 * Assertions for Bene Gesserit abilities.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import type { PhaseEvent } from '../../../phases/types';
import { assertEventEmitted, assertEventData } from './event-assertions';
import { assertBGAdvisorsInTerritory, assertBGFightersInTerritory } from './state-assertions';

/**
 * Assert BG ability was triggered
 */
export function assertBGAbilityTriggered(
  events: PhaseEvent[],
  ability: 'SPIRITUAL_ADVISOR' | 'INTRUSION' | 'WARTIME' | 'TAKE_UP_ARMS',
  decision: 'SEND' | 'FLIP' | 'PASS'
): void {
  // Spiritual Advisor emits FORCES_SHIPPED with reason 'spiritual_advisor'
  if (ability === 'SPIRITUAL_ADVISOR' && decision === 'SEND') {
    const matchingEvents = events.filter(
      (e) =>
        e.type === 'FORCES_SHIPPED' &&
        (e.data as any)?.reason === 'spiritual_advisor' &&
        (e.data as any)?.faction === Faction.BENE_GESSERIT
    );
    
    if (matchingEvents.length === 0) {
      throw new Error(
        `Expected BG ${ability} ability to be triggered (${decision}), but no FORCES_SHIPPED event with reason 'spiritual_advisor' found`
      );
    }
    return;
  }
  
  // INTRUSION emits FORCES_CONVERTED with reason 'intrusion'
  if (ability === 'INTRUSION' && decision === 'FLIP') {
    const matchingEvents = events.filter(
      (e) =>
        e.type === 'FORCES_CONVERTED' &&
        (e.data as any)?.reason === 'intrusion' &&
        (e.data as any)?.faction === Faction.BENE_GESSERIT
    );
    
    if (matchingEvents.length === 0) {
      throw new Error(
        `Expected BG ${ability} ability to be triggered (${decision}), but no FORCES_CONVERTED event with reason 'intrusion' found`
      );
    }
    return;
  }
  
  // WARTIME emits ADVISORS_FLIPPED with reason 'WARTIME' or 'wartime'
  if (ability === 'WARTIME' && decision === 'FLIP') {
    const matchingEvents = events.filter(
      (e) =>
        e.type === 'ADVISORS_FLIPPED' &&
        ((e.data as any)?.reason === 'WARTIME' || (e.data as any)?.reason === 'wartime') &&
        (e.data as any)?.faction === Faction.BENE_GESSERIT
    );
    
    if (matchingEvents.length === 0) {
      const availableEvents = events.map(e => `${e.type}${e.data ? ` (reason: ${(e.data as any)?.reason || 'none'})` : ''}`).join(', ');
      throw new Error(
        `Expected BG ${ability} ability to be triggered (${decision}), but no ADVISORS_FLIPPED event with reason 'WARTIME' or 'wartime' found. Available events: ${availableEvents}`
      );
    }
    return;
  }
  
  // TAKE_UP_ARMS emits ADVISORS_FLIPPED with reason 'take_up_arms'
  if (ability === 'TAKE_UP_ARMS' && decision === 'FLIP') {
    const matchingEvents = events.filter(
      (e) =>
        e.type === 'ADVISORS_FLIPPED' &&
        (e.data as any)?.reason === 'take_up_arms' &&
        (e.data as any)?.faction === Faction.BENE_GESSERIT
    );
    
    if (matchingEvents.length === 0) {
      const availableEvents = events.map(e => `${e.type}${e.data ? ` (reason: ${(e.data as any)?.reason || 'none'})` : ''}`).join(', ');
      throw new Error(
        `Expected BG ${ability} ability to be triggered (${decision}), but no ADVISORS_FLIPPED event with reason 'take_up_arms' found. Available events: ${availableEvents}`
      );
    }
    return;
  }
  
  const eventTypeMap = {
    SPIRITUAL_ADVISOR: 'BG_SEND_SPIRITUAL_ADVISOR',
    INTRUSION: 'BG_INTRUSION',
    WARTIME: 'BG_WARTIME',
    TAKE_UP_ARMS: 'BG_TAKE_UP_ARMS',
  };
  
  const expectedType = eventTypeMap[ability];
  const matchingEvents = events.filter((e) => e.type === expectedType);
  
  if (matchingEvents.length === 0) {
    throw new Error(
      `Expected BG ${ability} ability to be triggered (${decision}), but no ${expectedType} event found`
    );
  }
  
  if (decision === 'PASS') {
    // If passing, event might not be emitted or might have different data
    // This is a simplified check
    return;
  }
  
  // Verify decision was applied
  const event = matchingEvents[0];
  const data = event.data as any;
  
  if (decision === 'SEND' && ability === 'SPIRITUAL_ADVISOR') {
    if (!data.destination) {
      throw new Error(
        `Expected BG to send advisor, but event data missing destination`
      );
    }
  }
  
  if (decision === 'FLIP' && (ability === 'INTRUSION' || ability === 'WARTIME' || ability === 'TAKE_UP_ARMS')) {
    if (!data.territory || data.count === undefined) {
      throw new Error(
        `Expected BG to flip forces, but event data missing territory or count`
      );
    }
  }
}

/**
 * Assert BG advisor sent
 */
export function assertBGAdvisorSent(
  events: PhaseEvent[],
  destination: TerritoryId | 'POLAR_SINK',
  sector?: number
): void {
  // Spiritual Advisor emits FORCES_SHIPPED with reason 'spiritual_advisor'
  assertEventEmitted(events, 'FORCES_SHIPPED', (e) => {
    const data = e.data as any;
    if (data.reason !== 'spiritual_advisor' || data.faction !== Faction.BENE_GESSERIT) {
      return false;
    }
    if (destination === 'POLAR_SINK') {
      return data.territory === TerritoryId.POLAR_SINK;
    }
    return (
      data.territory === destination &&
      (sector === undefined || data.sector === sector)
    );
  });
}

/**
 * Assert BG forces flipped
 */
export function assertBGFlipped(
  events: PhaseEvent[],
  territoryId: TerritoryId,
  fromType: 'ADVISORS' | 'FIGHTERS',
  toType: 'ADVISORS' | 'FIGHTERS',
  count: number
): void {
  // INTRUSION emits FORCES_CONVERTED with reason 'intrusion'
  if (fromType === 'FIGHTERS' && toType === 'ADVISORS') {
    const matchingEvents = events.filter(
      (e) =>
        e.type === 'FORCES_CONVERTED' &&
        (e.data as any)?.reason === 'intrusion' &&
        (e.data as any)?.faction === Faction.BENE_GESSERIT &&
        (e.data as any)?.territory === territoryId &&
        (e.data as any)?.count === count
    );
    
    if (matchingEvents.length === 0) {
      throw new Error(
        `Expected BG to flip ${count} ${fromType} to ${toType} in ${territoryId}, but no FORCES_CONVERTED event with reason 'intrusion' found`
      );
    }
    return;
  }
  
  const eventTypeMap = {
    ADVISORS: {
      ADVISORS: null, // Can't flip advisors to advisors
      FIGHTERS: ['BG_WARTIME', 'BG_TAKE_UP_ARMS', 'ADVISORS_FLIPPED'],
    },
    FIGHTERS: {
      ADVISORS: ['FORCES_CONVERTED'], // INTRUSION uses FORCES_CONVERTED
      FIGHTERS: null, // Can't flip fighters to fighters
    },
  };
  
  const expectedTypes = eventTypeMap[fromType]?.[toType];
  
  if (!expectedTypes) {
    throw new Error(
      `Invalid flip: cannot flip ${fromType} to ${toType}`
    );
  }
  
  const matchingEvents = events.filter(
    (e) =>
      expectedTypes.includes(e.type) &&
      ((e.data as any)?.territory === territoryId || (e.data as any)?.territoryId === territoryId) &&
      ((e.data as any)?.count === count || (e.data as any)?.advisorCount === count)
  );
  
  if (matchingEvents.length === 0) {
    throw new Error(
      `Expected BG to flip ${count} ${fromType} to ${toType} in ${territoryId}, but no flip event found`
    );
  }
}

/**
 * Assert BG advisor state in territory
 */
export function assertBGAdvisorState(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  expectedAdvisors: number,
  expectedFighters: number
): void {
  assertBGAdvisorsInTerritory(state, territoryId, sector, expectedAdvisors);
  assertBGFightersInTerritory(state, territoryId, sector, expectedFighters);
}

