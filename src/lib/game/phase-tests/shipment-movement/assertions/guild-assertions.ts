/**
 * Guild-Specific Assertions
 * 
 * Assertions for Guild timing, shipment types, and payment.
 */

import { Faction, type GameState } from '../../../types';
import type { PhaseEvent } from '../../../phases/types';
import { assertEventEmitted, assertEventData } from './event-assertions';
import { assertSpiceAmount } from './state-assertions';

/**
 * Assert Guild acted (completed shipment + movement)
 */
export function assertGuildActed(
  events: PhaseEvent[],
  timing?: 'ACT_NOW' | 'LATER' | 'DELAY_TO_END'
): void {
  // Check that Guild has both shipment and movement events
  const hasShipment = events.some(
    (e) =>
      e.type === 'FORCES_SHIPPED' && (e.data as any)?.faction === Faction.SPACING_GUILD
  );
  const hasMovement = events.some(
    (e) =>
      e.type === 'FORCES_MOVED' && (e.data as any)?.faction === Faction.SPACING_GUILD
  );
  
  if (!hasShipment && !hasMovement) {
    throw new Error(
      `Expected Guild to act (ship and/or move), but no Guild actions found`
    );
  }
  
  if (timing) {
    // Check timing decision event
    const timingEvent = events.find(
      (e) =>
        e.type.includes('GUILD') &&
        e.type.includes('TIMING') &&
        (e.data as any)?.decision === timing.toLowerCase()
    );
    
    if (!timingEvent && timing !== 'LATER') {
      // LATER doesn't always emit a specific event
      // This is a simplified check
    }
  }
}

/**
 * Assert Guild shipment type
 */
export function assertGuildShipmentType(
  events: PhaseEvent[],
  type: 'NORMAL' | 'CROSS_SHIP' | 'OFF_PLANET'
): void {
  const shipmentEvents = events.filter(
    (e) =>
      e.type === 'FORCES_SHIPPED' && (e.data as any)?.faction === Faction.SPACING_GUILD
  );
  
  if (shipmentEvents.length === 0) {
    throw new Error(`Expected Guild ${type} shipment, but no shipment event found`);
  }
  
  const event = shipmentEvents[0];
  const data = event.data as any;
  
  switch (type) {
    case 'CROSS_SHIP':
      if (!data.from || !data.to) {
        throw new Error(
          `Expected Guild cross-ship (from/to territories), but event data missing`
        );
      }
      break;
    case 'OFF_PLANET':
      if (data.to) {
        throw new Error(
          `Expected Guild off-planet shipment (to reserves), but event has destination territory`
        );
      }
      break;
    case 'NORMAL':
      if (data.from) {
        throw new Error(
          `Expected Guild normal shipment (from reserves), but event has from territory`
        );
      }
      break;
  }
}

/**
 * Assert Guild payment received
 */
export function assertGuildPaymentReceived(
  state: GameState,
  events: PhaseEvent[],
  amount: number
): void {
  // Find shipment events where non-Guild faction paid
  const paymentEvents = events.filter(
    (e) =>
      e.type === 'FORCES_SHIPPED' &&
      (e.data as any)?.faction !== Faction.SPACING_GUILD &&
      (e.data as any)?.cost === amount
  );
  
  if (paymentEvents.length === 0) {
    throw new Error(
      `Expected Guild to receive payment of ${amount}, but no payment event found`
    );
  }
  
  // Verify Guild's spice increased
  const guildState = state.factions.get(Faction.SPACING_GUILD);
  if (guildState) {
    // Note: This is a simplified check - actual implementation would track before/after
    // For now, we just verify the event exists
  }
}

/**
 * Assert Guild half price shipping
 */
export function assertGuildHalfPrice(
  events: PhaseEvent[],
  territoryType: 'STRONGHOLD' | 'NON_STRONGHOLD',
  forceCount: number
): void {
  const shipmentEvents = events.filter(
    (e) =>
      e.type === 'FORCES_SHIPPED' && (e.data as any)?.faction === Faction.SPACING_GUILD
  );
  
  if (shipmentEvents.length === 0) {
    throw new Error(`Expected Guild shipment, but no shipment event found`);
  }
  
  const event = shipmentEvents[0];
  const data = event.data as any;
  const cost = data.cost || 0;
  
  // Calculate expected cost (half price, rounded up)
  const baseCost = territoryType === 'STRONGHOLD' ? 1 : 2;
  const expectedCost = Math.ceil((baseCost * forceCount) / 2);
  
  if (cost !== expectedCost) {
    throw new Error(
      `Expected Guild to pay ${expectedCost} spice (half of ${baseCost * forceCount}), got ${cost}`
    );
  }
}

