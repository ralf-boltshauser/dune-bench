/**
 * Reusable test patterns for movement rules tests.
 * Common validation patterns to reduce boilerplate.
 */

import type { GameState } from '../../../types';
import { Faction, TerritoryId } from '../../../types';
import {
  validateShipment,
  validateMovement,
  calculateShipmentCost,
  findPath,
  getReachableTerritories,
} from '../../movement';
import { MovementTestStateBuilder } from './test-state-builder';
import { ValidationAssertions } from './assertions';

/**
 * Test pattern: Valid shipment
 */
export function testValidShipment(
  state: GameState,
  faction: Faction,
  territory: TerritoryId,
  sector: number,
  forceCount: number,
  expectedCost: number
): void {
  const result = validateShipment(state, faction, territory, sector, forceCount);
  ValidationAssertions.assertValid(result);
  ValidationAssertions.assertCost(result, expectedCost);
}

/**
 * Test pattern: Invalid shipment with specific error
 */
export function testInvalidShipment(
  state: GameState,
  faction: Faction,
  territory: TerritoryId,
  sector: number,
  forceCount: number,
  expectedErrorCode: string
): void {
  const result = validateShipment(state, faction, territory, sector, forceCount);
  ValidationAssertions.assertInvalid(result);
  ValidationAssertions.assertErrorCode(result, expectedErrorCode);
}

/**
 * Test pattern: Valid movement
 */
export function testValidMovement(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  forceCount: number
): void {
  const result = validateMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    forceCount
  );
  ValidationAssertions.assertValid(result);
}

/**
 * Test pattern: Invalid movement with specific error
 */
export function testInvalidMovement(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  forceCount: number,
  expectedErrorCode: string
): void {
  const result = validateMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    forceCount
  );
  ValidationAssertions.assertInvalid(result);
  ValidationAssertions.assertErrorCode(result, expectedErrorCode);
}

/**
 * Test pattern: Cost calculation
 */
export function testCostCalculation(
  territory: TerritoryId,
  forceCount: number,
  faction: Faction,
  expectedCost: number
): void {
  const state = MovementTestStateBuilder.create()
    .withFactions([faction])
    .withSpice(faction, 100) // Enough spice
    .withReserves(faction, forceCount)
    .build();

  const result = validateShipment(state, faction, territory, 0, forceCount);
  ValidationAssertions.assertValid(result);
  ValidationAssertions.assertCost(result, expectedCost);
}

/**
 * Test pattern: Movement range
 */
export function testMovementRange(
  state: GameState,
  faction: Faction,
  expectedRange: number
): void {
  // Use a simple movement test
  const fromTerritory = TerritoryId.ARRAKEEN;
  const toTerritory = TerritoryId.SHIELD_WALL;

  const result = validateMovement(state, faction, fromTerritory, 9, toTerritory, 8, 1);

  ValidationAssertions.assertContextValue(result, 'movementRange', expectedRange);
}

/**
 * Test pattern: Valid movement with ornithopter override
 */
export function testMovementWithOrnithopterOverride(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  forceCount: number,
  hasOrnithopters: boolean,
  expectedRange: number
): void {
  const result = validateMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    forceCount,
    hasOrnithopters
  );
  ValidationAssertions.assertValid(result);
  ValidationAssertions.assertContextValue(result, 'hasOrnithopters', hasOrnithopters);
  ValidationAssertions.assertContextValue(result, 'movementRange', expectedRange);
}

/**
 * Test pattern: Pathfinding test
 */
export function testPathfinding(
  state: GameState,
  from: TerritoryId,
  to: TerritoryId,
  movingFaction: Faction,
  expectedPath: TerritoryId[] | null
): void {
  const path = findPath(from, to, state, movingFaction);
  if (expectedPath === null) {
    if (path !== null) {
      throw new Error(`Expected no path, but found path: ${path.join(' -> ')}`);
    }
  } else {
    if (path === null) {
      throw new Error(`Expected path ${expectedPath.join(' -> ')}, but no path found`);
    }
    if (path.length !== expectedPath.length || !path.every((t, i) => t === expectedPath[i])) {
      throw new Error(
        `Expected path ${expectedPath.join(' -> ')}, but got ${path.join(' -> ')}`
      );
    }
  }
}

/**
 * Test pattern: Reachability test
 */
export function testReachability(
  state: GameState,
  from: TerritoryId,
  range: number,
  movingFaction: Faction,
  expectedTerritories: TerritoryId[]
): void {
  const reachable = getReachableTerritories(state, from, range, movingFaction);
  const actualTerritories = Array.from(reachable.keys());

  const missing = expectedTerritories.filter((t) => !actualTerritories.includes(t));
  const extra = actualTerritories.filter((t) => !expectedTerritories.includes(t));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Reachability mismatch. Missing: ${missing.join(', ')}, Extra: ${extra.join(', ')}`
    );
  }
}

/**
 * Test pattern: Movement with path length validation
 */
export function testMovementWithPathLength(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  forceCount: number,
  expectedPathLength: number
): void {
  const result = validateMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    forceCount
  );
  ValidationAssertions.assertValid(result);
  ValidationAssertions.assertPathLength(result, expectedPathLength);
}

