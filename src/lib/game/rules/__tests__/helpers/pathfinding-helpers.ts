/**
 * Pathfinding test helpers.
 * Reusable patterns for testing pathfinding scenarios.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { findPath, getReachableTerritories } from '../../movement';
import { MovementTestStateBuilder } from './test-state-builder';

/**
 * Test pathfinding with storm blocking
 */
export function testPathfindingWithStorm(
  from: TerritoryId,
  to: TerritoryId,
  blockingSector: number,
  movingFaction: Faction,
  expectedPath: TerritoryId[] | null
): void {
  const state = MovementTestStateBuilder.create()
    .withFactions([movingFaction])
    .withStormSector(blockingSector)
    .build();

  const path = findPath(from, to, state, movingFaction);

  if (expectedPath === null) {
    if (path !== null) {
      throw new Error(`Expected no path due to storm, but found: ${path.join(' -> ')}`);
    }
  } else {
    if (path === null) {
      throw new Error(`Expected path ${expectedPath.join(' -> ')}, but storm blocked it`);
    }
    if (path.length !== expectedPath.length || !path.every((t, i) => t === expectedPath[i])) {
      throw new Error(
        `Expected path ${expectedPath.join(' -> ')}, but got ${path.join(' -> ')}`
      );
    }
  }
}

/**
 * Test pathfinding with full stronghold blocking
 */
export function testPathfindingWithFullStronghold(
  from: TerritoryId,
  to: TerritoryId,
  blockingTerritory: TerritoryId,
  blockingFactions: [Faction, Faction],
  movingFaction: Faction,
  expectedPath: TerritoryId[] | null
): void {
  const state = MovementTestStateBuilder.create()
    .withFactions([movingFaction, ...blockingFactions])
    .withForce(blockingFactions[0], blockingTerritory, 9, 5)
    .withForce(blockingFactions[1], blockingTerritory, 9, 5)
    .build();

  const path = findPath(from, to, state, movingFaction);

  if (expectedPath === null) {
    if (path !== null) {
      throw new Error(
        `Expected no path due to full stronghold, but found: ${path.join(' -> ')}`
      );
    }
  } else {
    if (path === null) {
      throw new Error(
        `Expected path ${expectedPath.join(' -> ')}, but full stronghold blocked it`
      );
    }
    if (path.length !== expectedPath.length || !path.every((t, i) => t === expectedPath[i])) {
      throw new Error(
        `Expected path ${expectedPath.join(' -> ')}, but got ${path.join(' -> ')}`
      );
    }
  }
}

/**
 * Test reachability with range
 */
export function testReachabilityWithRange(
  from: TerritoryId,
  range: number,
  movingFaction: Faction,
  expectedTerritories: TerritoryId[]
): void {
  const state = MovementTestStateBuilder.create()
    .withFactions([movingFaction])
    .build();

  const reachable = getReachableTerritories(state, from, range, movingFaction);
  const actual = Array.from(reachable.keys());

  // Verify expected territories are reachable
  for (const expected of expectedTerritories) {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${expected} to be reachable, but it's not`);
    }
  }

  // Optionally verify no unexpected territories
  const unexpected = actual.filter((t) => !expectedTerritories.includes(t));
  if (unexpected.length > 0) {
    // This is a warning, not an error - there may be more reachable territories
    console.warn(`Additional reachable territories: ${unexpected.join(', ')}`);
  }
}

/**
 * Test reachability with storm blocking
 */
export function testReachabilityWithStorm(
  from: TerritoryId,
  range: number,
  movingFaction: Faction,
  stormSector: number,
  expectedTerritories: TerritoryId[]
): void {
  const state = MovementTestStateBuilder.create()
    .withFactions([movingFaction])
    .withStormSector(stormSector)
    .build();

  const reachable = getReachableTerritories(state, from, range, movingFaction);
  const actual = Array.from(reachable.keys());

  // Verify expected territories are reachable
  for (const expected of expectedTerritories) {
    if (!actual.includes(expected)) {
      throw new Error(
        `Expected ${expected} to be reachable despite storm, but it's not`
      );
    }
  }
}

