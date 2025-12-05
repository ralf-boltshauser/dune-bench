/**
 * Shipment-Specific Assertions
 * 
 * Assertions for shipment actions and events.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import type { PhaseEvent } from '../../../phases/types';
import { assertEventEmitted, assertEventData } from './event-assertions';
import { assertForcesInTerritory, assertForcesInReserves, assertSpiceAmount } from './state-assertions';

/**
 * Assert shipment succeeded
 */
export function assertShipmentSucceeded(
  events: PhaseEvent[],
  faction: Faction,
  territoryId: TerritoryId,
  count: number,
  cost?: number
): void {
  assertEventEmitted(events, 'FORCES_SHIPPED', (e) => {
    const data = e.data as any;
    return (
      data.faction === faction &&
      (data.to === territoryId || data.territoryId === territoryId) &&
      data.count === count
    );
  });
  
  if (cost !== undefined) {
    assertEventData(events, 'FORCES_SHIPPED', { cost });
  }
}

/**
 * Assert shipment failed
 */
export function assertShipmentFailed(
  events: PhaseEvent[],
  faction: Faction,
  reason?: string
): void {
  // Check for error event or absence of shipment event
  const hasError = events.some(
    (e) =>
      e.type.includes('ERROR') &&
      (e.data as any)?.faction === faction &&
      (e.data as any)?.action === 'SHIPMENT'
  );
  
  if (!hasError) {
    // Check that shipment event was NOT emitted
    const hasShipment = events.some(
      (e) =>
        e.type === 'FORCES_SHIPPED' && (e.data as any)?.faction === faction
    );
    
    if (hasShipment) {
      throw new Error(
        `Expected shipment to fail for ${faction}, but shipment event was emitted`
      );
    }
  }
  
  if (reason) {
    const errorEvent = events.find(
      (e) =>
        e.type.includes('ERROR') &&
        (e.data as any)?.faction === faction &&
        (e.message || '').includes(reason)
    );
    
    if (!errorEvent) {
      throw new Error(
        `Expected shipment failure reason to include "${reason}", but it did not`
      );
    }
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
  // Check that payment event was emitted
  const paymentEvent = events.find(
    (e) =>
      e.type === 'FORCES_SHIPPED' &&
      (e.data as any)?.cost === amount &&
      (e.data as any)?.faction !== Faction.SPACING_GUILD
  );
  
  if (!paymentEvent) {
    throw new Error(
      `Expected Guild to receive payment of ${amount}, but payment event not found`
    );
  }
  
  // Note: Actual spice transfer would be verified via state assertions
}

/**
 * Assert Fremen shipment (free)
 */
export function assertFremenShipment(
  events: PhaseEvent[],
  faction: Faction,
  territoryId: TerritoryId,
  count: number
): void {
  assertEventEmitted(events, 'FORCES_SHIPPED', (e) => {
    const data = e.data as any;
    return (
      data.faction === faction &&
      (data.to === territoryId || data.territoryId === territoryId) &&
      data.count === count &&
      (data.cost === 0 || data.cost === undefined)
    );
  });
}

/**
 * Assert Guild cross-ship
 */
export function assertGuildCrossShip(
  events: PhaseEvent[],
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId,
  count: number,
  cost?: number
): void {
  const crossShipEvent = events.find((e) => {
    if (e.type !== 'FORCES_SHIPPED') return false;
    const data = e.data as any;
    return (
      data.faction === Faction.SPACING_GUILD &&
      data.from === fromTerritoryId &&
      data.to === toTerritoryId &&
      data.count === count
    );
  });
  
  if (!crossShipEvent) {
    throw new Error(`Expected FORCES_SHIPPED event for cross-ship from ${fromTerritoryId} to ${toTerritoryId}, but it was not found`);
  }
  
  if (cost !== undefined) {
    const eventCost = (crossShipEvent.data as any).cost;
    if (eventCost !== cost) {
      throw new Error(`Expected event FORCES_SHIPPED to have data.cost = ${cost}, got ${eventCost}`);
    }
  }
}

/**
 * Assert Guild off-planet shipment
 */
export function assertGuildOffPlanet(
  events: PhaseEvent[],
  fromTerritoryId: TerritoryId,
  count: number,
  cost?: number
): void {
  const offPlanetEvent = events.find((e) => {
    if (e.type !== 'FORCES_SHIPPED') return false;
    const data = e.data as any;
    return (
      data.faction === Faction.SPACING_GUILD &&
      data.from === fromTerritoryId &&
      data.to === undefined && // Going to reserves
      data.count === count
    );
  });
  
  if (!offPlanetEvent) {
    throw new Error(`Expected FORCES_SHIPPED event for off-planet from ${fromTerritoryId}, but it was not found`);
  }
  
  if (cost !== undefined) {
    const eventCost = (offPlanetEvent.data as any).cost;
    if (eventCost !== cost) {
      throw new Error(`Expected event FORCES_SHIPPED to have data.cost = ${cost}, got ${eventCost}`);
    }
  }
}

/**
 * Assert shipment state changes
 */
export function assertShipmentStateChanges(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  shippedCount: number,
  reservesBefore: number,
  spiceBefore: number,
  cost: number
): void {
  // Check forces in territory
  assertForcesInTerritory(state, faction, territoryId, sector, shippedCount);
  
  // Check reserves decreased
  assertForcesInReserves(state, faction, reservesBefore - shippedCount);
  
  // Check spice decreased (if cost > 0)
  if (cost > 0) {
    assertSpiceAmount(state, faction, spiceBefore - cost);
  }
}

