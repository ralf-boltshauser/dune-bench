/**
 * Test Patterns for Bidding Phase
 * 
 * Reusable test execution patterns to eliminate boilerplate.
 */

import { Faction, type GameState } from '../../../types';
import { type PhaseEvent, type PhaseStepResult } from '../../../phases/types';
import { type BiddingContextWithCards } from '../../../phases/handlers/bidding/types';
import { type AgentResponse } from '../../../phases/types';

// =============================================================================
// TEST CONFIGURATION TYPES
// =============================================================================

export interface EligibilityTestConfig {
  faction: Faction;
  handSize: number;
  spice: number;
  hasKarama?: boolean;
  karamaFreeCardActive?: boolean;
  factions?: Faction[];
}

export interface BidValidationTestConfig {
  spice: number;
  hasKarama?: boolean;
  karamaBiddingActive?: boolean;
  currentBid?: number;
  isOpeningBid?: boolean;
}

// =============================================================================
// MODULE FUNCTION TEST PATTERN
// =============================================================================

/**
 * Test a module function with multiple test cases
 */
export function testModuleFunction<TInput extends any[], TOutput>(
  functionName: string,
  moduleFunction: (...args: TInput) => TOutput,
  testCases: Array<{
    name: string;
    inputs: TInput;
    expected?: TOutput;
    assertResult?: (result: TOutput) => void;
    assertState?: (state: GameState) => void;
    assertEvents?: (events: PhaseEvent[]) => void;
  }>
): void {
  for (const testCase of testCases) {
    try {
      const result = moduleFunction(...testCase.inputs);
      
      if (testCase.expected !== undefined) {
        if (JSON.stringify(result) !== JSON.stringify(testCase.expected)) {
          throw new Error(
            `Test "${testCase.name}" failed: Expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(result)}`
          );
        }
      }
      
      if (testCase.assertResult) {
        testCase.assertResult(result);
      }
      
      // Extract state and events from result if it's a PhaseStepResult
      if (result && typeof result === 'object' && 'state' in result) {
        const phaseResult = result as any as PhaseStepResult;
        if (testCase.assertState && phaseResult.state) {
          testCase.assertState(phaseResult.state);
        }
        if (testCase.assertEvents && phaseResult.events) {
          testCase.assertEvents(phaseResult.events);
        }
      }
    } catch (error) {
      throw new Error(`Test "${testCase.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// =============================================================================
// ELIGIBILITY TEST PATTERN
// =============================================================================

/**
 * Test eligibility scenarios
 */
export function testEligibilityScenarios(
  stateBuilder: (config: EligibilityTestConfig) => GameState,
  contextBuilder: () => BiddingContextWithCards,
  isEligibleToBidFn: (state: GameState, faction: Faction, context: BiddingContextWithCards) => boolean,
  testCases: Array<{
    name: string;
    config: EligibilityTestConfig;
    expectedEligible: boolean;
    reason?: string;
  }>
): void {
  for (const testCase of testCases) {
    try {
      const state = stateBuilder(testCase.config);
      const context = contextBuilder();
      const result = isEligibleToBidFn(state, testCase.config.faction, context);
      
      if (result !== testCase.expectedEligible) {
        throw new Error(
          `Test "${testCase.name}" failed: Expected eligible=${testCase.expectedEligible}${testCase.reason ? ` (${testCase.reason})` : ''}, got ${result}`
        );
      }
    } catch (error) {
      throw new Error(`Test "${testCase.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// =============================================================================
// BID VALIDATION TEST PATTERN
// =============================================================================

/**
 * Test bid validation scenarios
 */
export function testBidValidationScenarios(
  stateBuilder: (config: BidValidationTestConfig) => GameState,
  validateBidFn: (
    state: GameState,
    faction: Faction,
    bidAmount: number,
    currentHighBid: number,
    isOpeningBid: boolean,
    options?: any
  ) => { valid: boolean; errors?: string[] },
  faction: Faction,
  testCases: Array<{
    name: string;
    config: BidValidationTestConfig;
    bidAmount: number;
    expectedValid: boolean;
    expectedErrors?: string[];
  }>
): void {
  for (const testCase of testCases) {
    try {
      const state = stateBuilder(testCase.config);
      const currentBid = testCase.config.currentBid || 0;
      const isOpeningBid = testCase.config.isOpeningBid ?? (currentBid === 0);
      
      const result = validateBidFn(
        state,
        faction,
        testCase.bidAmount,
        currentBid,
        isOpeningBid,
        {
          karamaBiddingActive: testCase.config.karamaBiddingActive,
        }
      );
      
      if (result.valid !== testCase.expectedValid) {
        throw new Error(
          `Test "${testCase.name}" failed: Expected valid=${testCase.expectedValid}, got ${result.valid}`
        );
      }
      
      if (testCase.expectedErrors && result.errors) {
        for (const expectedError of testCase.expectedErrors) {
          if (!result.errors.some(e => e.includes(expectedError))) {
            throw new Error(
              `Test "${testCase.name}" failed: Expected error "${expectedError}" not found in ${JSON.stringify(result.errors)}`
            );
          }
        }
      }
    } catch (error) {
      throw new Error(`Test "${testCase.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// =============================================================================
// AUCTION CYCLE TEST PATTERN
// =============================================================================

/**
 * Test auction cycle (start → bid → resolve)
 */
export function testAuctionCycle(
  state: GameState,
  context: BiddingContextWithCards,
  biddingOrder: Faction[],
  responses: AgentResponse[],
  handler: any, // BiddingPhaseHandler or similar
  assertions: (result: PhaseStepResult) => void
): void {
  // This is a high-level pattern that would need the actual handler
  // For now, it's a placeholder that shows the pattern
  throw new Error('testAuctionCycle not yet implemented - requires handler integration');
}

// =============================================================================
// MULTIPLE AUCTIONS TEST PATTERN
// =============================================================================

/**
 * Test multiple auctions in sequence
 */
export function testMultipleAuctions(
  state: GameState,
  handler: any, // BiddingPhaseHandler or similar
  auctionConfigs: Array<{
    name: string;
    responses: AgentResponse[];
    assertions: (state: GameState, events: PhaseEvent[], context: BiddingContextWithCards) => void;
  }>
): void {
  // This is a high-level pattern that would need the actual handler
  // For now, it's a placeholder that shows the pattern
  throw new Error('testMultipleAuctions not yet implemented - requires handler integration');
}

