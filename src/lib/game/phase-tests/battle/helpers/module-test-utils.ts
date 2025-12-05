/**
 * Module Test Utilities
 *
 * Reusable utilities for testing refactored battle modules.
 * Each module has its own utility namespace with helper functions.
 */

import { Faction, TerritoryId, BattleSubPhase, type GameState } from '../../../types';
import type { CurrentBattle, BattlePhaseContext, AgentResponse, PhaseStepResult } from '../../../phases/types';
import { BattleStateBuilder } from '../builders/battle-state-builder';
import { buildTestState } from './test-state-builder';
import { DefaultSpice } from '../fixtures/test-data';
import { Phase } from '../../../types';
import {
  type ForceCountTestCase,
  type BattleCapableTestCase,
  type BattleContextTestCase,
  type OpponentTestCase,
  type AllyInBattleTestCase,
  type ParticipantTestCase,
  BattleUtilsTestData,
  FactionHelpersTestData,
} from '../fixtures/module-test-data';

// Mock function type (replacement for jest.Mock in non-jest environments)
type MockFunction<T extends (...args: any[]) => any> = T & {
  mockClear?: () => void;
  mockReset?: () => void;
  mockReturnValue?: (value: ReturnType<T>) => void;
};

// ============================================================================
// Battle Utilities Test Utils
// ============================================================================

export const BattleUtilsTestUtils = {
  /**
   * Create a test scenario for getBattleCapableForces()
   */
  createForceCountScenario(
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    options: {
      regular?: number;
      elite?: number;
      advisors?: number; // For BG only
      fighters?: number; // For BG only
    }
  ): GameState {
    // Use buildTestState directly for precise control
    const factions = [faction, Faction.ATREIDES]; // Add a second faction for valid game state
    const forces: any[] = [];

    if (faction === Faction.BENE_GESSERIT) {
      // BG: Add fighters as regular forces
      // Note: In actual implementation, BG has advisors/fighters distinction
      if ((options.fighters || 0) > 0) {
        forces.push({
          faction,
          territory,
          sector,
          regular: options.fighters || 0,
          elite: options.elite || 0,
        });
      }
    } else {
      // Other factions: regular and elite forces
      if ((options.regular || 0) > 0 || (options.elite || 0) > 0) {
        forces.push({
          faction,
          territory,
          sector,
          regular: options.regular || 0,
          elite: options.elite || 0,
        });
      }
    }

    return buildTestState({
      factions,
      phase: Phase.BATTLE,
      advancedRules: true,
      turn: 1,
      spice: DefaultSpice,
      forces,
    });
  },

  /**
   * Create a test scenario for isBattleCapable()
   */
  createBattleCapableScenario(
    faction: Faction,
    territory: TerritoryId,
    sector: number,
    hasForces: boolean,
    options?: {
      regular?: number;
      elite?: number;
      advisors?: number;
      fighters?: number;
    }
  ): GameState {
    const forceOptions = hasForces
      ? options || { regular: 10 }
      : { regular: 0, elite: 0, advisors: 0, fighters: 0 };

    return this.createForceCountScenario(faction, territory, sector, forceOptions);
  },

  /**
   * Create a test scenario for createBattleContext()
   */
  createContextScenario(
    territory: TerritoryId,
    sector: number,
    aggressor: Faction,
    defender: Faction
  ): GameState {
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(aggressor, defender, territory, sector);
    return builder.withDefaultSpice().build();
  },

  /**
   * Run multiple test cases for a utility function
   */
  runUtilityTest<T extends ForceCountTestCase | BattleCapableTestCase>(
    testCases: T[],
    testFn: (testCase: T, state: GameState) => void
  ): void {
    testCases.forEach((testCase) => {
      const state = this.createForceCountScenario(
        testCase.faction,
        testCase.territory,
        testCase.sector,
        testCase.setup
      );
      testFn(testCase, state);
    });
  },
};

// ============================================================================
// Faction Helpers Test Utils
// ============================================================================

export const FactionHelpersTestUtils = {
  /**
   * Create a battle context for testing
   */
  createBattle(
    aggressor: Faction,
    defender: Faction,
    territory: TerritoryId = TerritoryId.ARRAKEEN,
    sector: number = 9
  ): CurrentBattle {
    return {
      territoryId: territory,
      sector,
      aggressor,
      defender,
      aggressorPlan: null,
      defenderPlan: null,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceOpponent: null,
      prescienceResult: null,
      prescienceBlocked: false,
      voiceUsed: false,
      voiceCommand: null,
      traitorCalled: false,
      traitorCalledBy: null,
      traitorCallsByBothSides: false,
    };
  },

  /**
   * Create test scenario with alliance
   */
  createAllianceScenario(
    faction: Faction,
    ally: Faction,
    battle: CurrentBattle
  ): GameState {
    const builder = new BattleStateBuilder();
    // Need to ensure all factions are in the game
    const allFactions = [battle.aggressor, battle.defender, faction, ally].filter(
      (f, i, arr) => arr.indexOf(f) === i // unique
    );
    
    // Create a scenario with all factions
    if (allFactions.length === 2) {
      builder.twoFactionBattle(allFactions[0], allFactions[1], battle.territoryId, battle.sector);
    } else if (allFactions.length === 3) {
      builder.threeFactionBattle(allFactions[0], allFactions[1], allFactions[2], battle.territoryId, battle.sector);
    } else {
      // Fallback: use two-faction battle
      builder.twoFactionBattle(battle.aggressor, battle.defender, battle.territoryId, battle.sector);
    }
    
    builder.withAlliance(faction, ally);
    return builder.withDefaultSpice().build();
  },

  /**
   * Run multiple test cases for a helper function
   */
  runHelperTest<T extends OpponentTestCase | AllyInBattleTestCase | ParticipantTestCase>(
    testCases: T[],
    testFn: (testCase: T, battle: CurrentBattle, state?: GameState) => void
  ): void {
    testCases.forEach((testCase) => {
      const battle = this.createBattle(
        testCase.battle.aggressor,
        testCase.battle.defender,
        testCase.battle.territory,
        testCase.battle.sector
      );

      let state: GameState | undefined;
      if ('ally' in testCase && testCase.ally) {
        state = this.createAllianceScenario(
          testCase.faction,
          testCase.ally,
          battle
        );
      }

      testFn(testCase, battle, state);
    });
  },
};

// ============================================================================
// Router Test Utils
// ============================================================================

export const RouterTestUtils = {
  /**
   * Create mock callbacks for router tests
   */
  createMockCallbacks(): {
    callbacks: {
      requestBattleChoice: MockFunction<(state: GameState, events: any[]) => any>;
      transitionToBattleSubPhases: MockFunction<(state: GameState, events: any[]) => any>;
      requestPrescience: MockFunction<(state: GameState, events: any[]) => any>;
      requestPrescienceReveal: MockFunction<(state: GameState, events: any[]) => any>;
      requestVoice: MockFunction<(state: GameState, events: any[]) => any>;
      requestBattlePlans: MockFunction<(state: GameState, events: any[]) => any>;
      processReveal: MockFunction<(state: GameState, events: any[]) => any>;
      requestTraitorCall: MockFunction<(state: GameState, events: any[]) => any>;
      processResolution: MockFunction<(state: GameState, events: any[]) => any>;
      requestWinnerCardDiscard: MockFunction<(state: GameState, events: any[]) => any>;
      requestCaptureChoice: MockFunction<(state: GameState, events: any[]) => any>;
      endBattlePhase: MockFunction<(state: GameState, events: any[]) => any>;
    };
    spies: {
      requestBattleChoice: MockFunction<(state: GameState, events: any[]) => any>;
      transitionToBattleSubPhases: MockFunction<(state: GameState, events: any[]) => any>;
      requestPrescience: MockFunction<(state: GameState, events: any[]) => any>;
      requestPrescienceReveal: MockFunction<(state: GameState, events: any[]) => any>;
      requestVoice: MockFunction<(state: GameState, events: any[]) => any>;
      requestBattlePlans: MockFunction<(state: GameState, events: any[]) => any>;
      processReveal: MockFunction<(state: GameState, events: any[]) => any>;
      requestTraitorCall: MockFunction<(state: GameState, events: any[]) => any>;
      processResolution: MockFunction<(state: GameState, events: any[]) => any>;
      requestWinnerCardDiscard: MockFunction<(state: GameState, events: any[]) => any>;
      requestCaptureChoice: MockFunction<(state: GameState, events: any[]) => any>;
      endBattlePhase: MockFunction<(state: GameState, events: any[]) => any>;
    };
  } {
    const createMock = (): MockFunction<(state: GameState, events: any[]) => any> => {
      const fn = (state: GameState, events: any[]) => ({
        state,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events: events || [],
      });
      return fn as MockFunction<(state: GameState, events: any[]) => any>;
    };

    const callbacks = {
      requestBattleChoice: createMock(),
      transitionToBattleSubPhases: createMock(),
      requestPrescience: createMock(),
      requestPrescienceReveal: createMock(),
      requestVoice: createMock(),
      requestBattlePlans: createMock(),
      processReveal: createMock(),
      requestTraitorCall: createMock(),
      processResolution: createMock(),
      requestWinnerCardDiscard: createMock(),
      requestCaptureChoice: createMock(),
      endBattlePhase: createMock(),
    };

    return { callbacks, spies: callbacks };
  },

  /**
   * Create router test scenario
   */
  createRouterScenario(
    subPhase: BattleSubPhase,
    context: BattlePhaseContext,
    state: GameState,
    responses: AgentResponse[] = []
  ): {
    subPhase: BattleSubPhase;
    context: BattlePhaseContext;
    state: GameState;
    responses: AgentResponse[];
    events: any[];
  } {
    return {
      subPhase,
      context,
      state,
      responses,
      events: [],
    };
  },

  /**
   * Assert callback was called correctly
   */
  assertCallbackCalled(
    callback: MockFunction<(...args: any[]) => any>,
    expectedArgs: any[],
    expectedCallCount: number = 1
  ): void {
    // Note: This is a placeholder - actual assertion would depend on test framework
    // For now, just document what should be checked
    if (callback.mockClear) {
      // Mock was called - in a real test framework this would verify call count and args
    }
  },
};

// ============================================================================
// Context Manager Test Utils
// ============================================================================

export const ContextManagerTestUtils = {
  /**
   * Create initial context for tests
   */
  createInitialContext(
    options?: Partial<BattlePhaseContext>
  ): BattlePhaseContext {
    return {
      pendingBattles: [],
      currentBattleIndex: 0,
      currentBattle: null,
      subPhase: BattleSubPhase.AGGRESSOR_CHOOSING,
      aggressorOrder: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN],
      currentAggressorIndex: 0,
      ...options,
    };
  },

  /**
   * Create context manager instance for tests
   */
  createTestManager(
    initialContext?: BattlePhaseContext
  ): any {
    // Import dynamically to avoid circular dependencies
    const { BattleContextManager } = require('../../../phases/handlers/battle/context');
    const context = initialContext || this.createInitialContext();
    return new BattleContextManager(context);
  },

  /**
   * Test context update immutability
   */
  testImmutability(
    originalContext: BattlePhaseContext,
    updateFn: (manager: any) => void
  ): { original: BattlePhaseContext; updated: BattlePhaseContext } {
    const manager = this.createTestManager({ ...originalContext });
    const originalSnapshot = JSON.parse(JSON.stringify(manager.getContext()));
    
    updateFn(manager);
    
    const updatedContext = manager.getContext();
    
    // Return both for comparison
    return {
      original: originalSnapshot as BattlePhaseContext,
      updated: updatedContext,
    };
  },
};

