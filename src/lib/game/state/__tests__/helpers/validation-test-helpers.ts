/**
 * Validation Test Helpers
 * 
 * Reusable helpers for testing validation logic in mutations.
 */

import type { GameState, TerritoryId } from '../../../types';
import { Faction, STRONGHOLD_TERRITORIES } from '../../../types';
import { TestStateBuilder, buildTestState } from './test-state-builder';
import { validateStrongholdOccupancy } from '../../queries';

/**
 * Test stronghold occupancy validation.
 */
export function testStrongholdValidation(
  mutationFn: (state: GameState, ...args: any[]) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: any[],
  territoryId: TerritoryId,
  shouldThrow: boolean,
  expectedError?: string
): void {
  if (!STRONGHOLD_TERRITORIES.includes(territoryId)) {
    throw new Error(`${territoryId} is not a stronghold`);
  }

  const state = setup(buildTestState()).build();

  if (shouldThrow) {
    try {
      mutationFn(state, ...args);
      throw new Error('Expected stronghold occupancy violation, but mutation succeeded');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (expectedError && !errorMessage.includes(expectedError)) {
        throw new Error(
          `Expected error to include "${expectedError}", but got: ${errorMessage}`
        );
      }
      if (!errorMessage.includes('Stronghold occupancy violation')) {
        throw new Error(
          `Expected stronghold occupancy error, but got: ${errorMessage}`
        );
      }
    }
  } else {
    // Should not throw
    const result = mutationFn(state, ...args);
    const violations = validateStrongholdOccupancy(result);
    const violation = violations.find((v) => v.territoryId === territoryId);
    if (violation) {
      throw new Error(
        `Unexpected stronghold occupancy violation: ${territoryId} has ${violation.count} factions`
      );
    }
  }
}

/**
 * Test hand size validation.
 */
export function testHandSizeValidation(
  mutationFn: (state: GameState, ...args: any[]) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: any[],
  faction: Faction,
  shouldThrow: boolean
): void {
  const state = setup(buildTestState([faction])).build();

  if (shouldThrow) {
    try {
      mutationFn(state, ...args);
      throw new Error('Expected hand size violation, but mutation succeeded');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes('Hand size violation') && !errorMessage.includes('hand is full')) {
        throw new Error(
          `Expected hand size error, but got: ${errorMessage}`
        );
      }
    }
  } else {
    // Should not throw
    mutationFn(state, ...args);
  }
}

/**
 * Test PEACETIME restriction (advisors cannot flip to fighters with ally present).
 */
export function testPEACETIMERestriction(
  mutationFn: (state: GameState, ...args: any[]) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: any[],
  shouldBlock: boolean
): void {
  const state = setup(buildTestState([Faction.BENE_GESSERIT, Faction.ATREIDES])).build();

  if (shouldBlock) {
    try {
      mutationFn(state, ...args);
      throw new Error('Expected PEACETIME restriction to block mutation, but it succeeded');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes('PEACETIME') && !errorMessage.includes('ally')) {
        throw new Error(
          `Expected PEACETIME restriction error, but got: ${errorMessage}`
        );
      }
    }
  } else {
    // Should not throw
    mutationFn(state, ...args);
  }
}

/**
 * Test STORMED_IN restriction (advisors cannot flip to fighters under storm).
 */
export function testSTORMEDINRestriction(
  mutationFn: (state: GameState, ...args: any[]) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: any[],
  shouldBlock: boolean
): void {
  const state = setup(buildTestState([Faction.BENE_GESSERIT])).build();

  if (shouldBlock) {
    try {
      mutationFn(state, ...args);
      throw new Error('Expected STORMED_IN restriction to block mutation, but it succeeded');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes('STORMED_IN') && !errorMessage.includes('storm')) {
        throw new Error(
          `Expected STORMED_IN restriction error, but got: ${errorMessage}`
        );
      }
    }
  } else {
    // Should not throw
    mutationFn(state, ...args);
  }
}

