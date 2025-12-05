/**
 * Test Pattern Helpers
 * 
 * Reusable test execution patterns to reduce boilerplate and ensure consistency.
 * All patterns automatically handle immutability verification.
 */

import type { GameState } from '../../../types';
import { TestStateBuilder, buildTestState } from './test-state-builder';
import {
  cloneStateForTesting,
  verifyStateNotSame,
  verifyNestedClones,
} from './immutability-helpers';

/**
 * Standard mutation test pattern.
 * Handles: Arrange, Act, Assert, Immutability
 * 
 * @param description - Test description (logged to console)
 * @param mutationFn - Mutation function to test
 * @param setup - Function to setup test state using builder
 * @param args - Arguments to pass to mutation function
 * @param assertions - Function to assert expected results
 */
export function testMutation<TArgs extends any[]>(
  description: string,
  mutationFn: (state: GameState, ...args: TArgs) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: TArgs,
  assertions: (result: GameState, original: GameState) => void
): void {
  // Arrange
  const state = setup(buildTestState()).build();
  const original = cloneStateForTesting(state);

  // Act
  const result = mutationFn(state, ...args);

  // Assert
  verifyStateNotSame(original, result);
  assertions(result, original);
  
  console.log(`✓ ${description}`);
}

/**
 * Test mutation with immutability verification for specific paths.
 * 
 * @param description - Test description
 * @param mutationFn - Mutation function to test
 * @param setup - Function to setup test state
 * @param args - Arguments to pass to mutation function
 * @param expectedChangedPaths - Paths that should change (e.g., ['factions', 'factions.ATREIDES.spice'])
 */
export function testMutationImmutability<TArgs extends any[]>(
  description: string,
  mutationFn: (state: GameState, ...args: TArgs) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: TArgs,
  expectedChangedPaths: string[]
): void {
  const state = setup(buildTestState()).build();
  const original = cloneStateForTesting(state);

  const result = mutationFn(state, ...args);

  verifyStateNotSame(original, result);
  
  // Verify nested structures are cloned
  verifyNestedClones(original, result, expectedChangedPaths);
  
  console.log(`✓ ${description}`);
}

/**
 * Test mutation error case.
 * 
 * @param description - Test description
 * @param mutationFn - Mutation function to test
 * @param setup - Function to setup test state
 * @param args - Arguments to pass to mutation function
 * @param expectedError - Expected error message (string or RegExp)
 */
export function testMutationError<TArgs extends any[]>(
  description: string,
  mutationFn: (state: GameState, ...args: TArgs) => GameState,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  args: TArgs,
  expectedError: string | RegExp
): void {
  const state = setup(buildTestState()).build();

  try {
    mutationFn(state, ...args);
    throw new Error(`Expected error "${expectedError}" but mutation succeeded`);
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (typeof expectedError === 'string') {
      if (!errorMessage.includes(expectedError)) {
        throw new Error(
          `Expected error to include "${expectedError}", but got: ${errorMessage}`
        );
      }
    } else {
      if (!expectedError.test(errorMessage)) {
        throw new Error(
          `Expected error to match ${expectedError}, but got: ${errorMessage}`
        );
      }
    }
  }
  
  console.log(`✓ ${description}`);
}

/**
 * Test multiple mutations in sequence.
 * 
 * @param description - Test description
 * @param setup - Function to setup initial state
 * @param mutations - Array of mutations to apply in sequence
 * @param finalAssertions - Assertions to run on final state
 */
export function testMutationSequence(
  description: string,
  setup: (builder: TestStateBuilder) => TestStateBuilder,
  mutations: Array<{
    fn: (state: GameState, ...args: any[]) => GameState;
    args: any[];
    description: string;
  }>,
  finalAssertions: (result: GameState) => void
): void {
  let state = setup(buildTestState()).build();
  const original = cloneStateForTesting(state);

  // Apply mutations in sequence
  for (const mutation of mutations) {
    state = mutation.fn(state, ...mutation.args);
  }

  // Verify immutability
  verifyStateNotSame(original, state);

  // Run final assertions
  finalAssertions(state);
  
  console.log(`✓ ${description}`);
}

