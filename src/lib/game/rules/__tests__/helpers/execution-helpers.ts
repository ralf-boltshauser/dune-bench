/**
 * Execution test helpers for movement rules.
 * Provides reusable patterns for testing executeMovement().
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { executeMovement } from '../../movement/execution';
import { ExecutionAssertions } from './assertions';
import { getFactionsOccupyingTerritory } from '../../../state';

/**
 * Test pattern: Execute valid movement and verify state
 */
export function testExecuteMovement(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const result = executeMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    count,
    isElite
  );

  // Verify immutability
  ExecutionAssertions.assertStateImmutability(state, result);

  // Verify forces moved correctly
  ExecutionAssertions.assertForcesMoved(
    state,
    result,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    count
  );

  // Verify stronghold occupancy
  ExecutionAssertions.assertStrongholdOccupancy(result, toTerritory);

  return result;
}

/**
 * Test pattern: Execute movement and verify BG ENLISTMENT rule
 */
export function testExecuteMovementWithEnlistment(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  advisorCount: number,
  expectedFlipped: number
): GameState {
  const result = executeMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    advisorCount,
    false
  );

  // Verify advisors flipped to fighters (ENLISTMENT rule)
  ExecutionAssertions.assertAdvisorsFlipped(
    state,
    result,
    toTerritory,
    toSector,
    expectedFlipped
  );

  return result;
}

/**
 * Test pattern: Execute movement and verify BG ADAPTIVE FORCE rule
 */
export function testExecuteMovementWithAdaptiveForce(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  movingAdvisors: number,
  expectedFlipped: number
): GameState {
  const result = executeMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    movingAdvisors,
    false
  );

  // Verify adaptive force flip
  ExecutionAssertions.assertAdvisorsFlipped(state, result, toTerritory, toSector, expectedFlipped);

  return result;
}

/**
 * Test pattern: Execute movement and verify BG restrictions (PEACETIME/STORMED_IN)
 */
export function testExecuteMovementWithBGRestrictions(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  advisorCount: number,
  shouldFlip: boolean
): GameState {
  const result = executeMovement(
    state,
    faction,
    fromTerritory,
    fromSector,
    toTerritory,
    toSector,
    advisorCount,
    false
  );

  // Verify advisors did NOT flip if restrictions apply
  if (!shouldFlip) {
    ExecutionAssertions.assertAdvisorsNotFlipped(
      state,
      result,
      toTerritory,
      toSector,
      advisorCount
    );
  } else {
    ExecutionAssertions.assertAdvisorsFlipped(state, result, toTerritory, toSector, advisorCount);
  }

  return result;
}

