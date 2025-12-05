/**
 * Module Utilities Test Runner
 *
 * Tests for refactored battle module utilities.
 * Uses custom test runner compatible with existing test infrastructure.
 */

import { Faction, TerritoryId } from '../../../../types';
import {
  getBattleCapableForces,
  isBattleCapable,
  createBattleContext,
  filterBattleCapableFactions,
} from '../../../../phases/handlers/battle/utils';
import {
  getOpponentInBattle,
  isParticipantInBattle,
  isAllyInBattle,
  getAllyInBattle,
  getAllyOpponent,
  isAggressor,
  isDefender,
} from '../../../../phases/handlers/battle/utils';
import { validateBattleChoice, validateBGCanBattle, validateBattleSetup } from '../../../../phases/handlers/battle/utils/battle-validation';
import { BattleUtilsTestUtils, FactionHelpersTestUtils } from '../../helpers/module-test-utils';
import { BattleUtilsTestData, FactionHelpersTestData } from '../../fixtures/module-test-data';
import { DEFAULT_SECTOR } from '../../fixtures/test-data';
import { BattleStateBuilder } from '../../builders/battle-state-builder';
import { buildTestState, DefaultSpice } from '../../helpers/test-state-builder';
import { Phase, TerritoryId } from '../../../../types';
import { formAlliance } from '../../../../state';
import type { PendingBattle, CurrentBattle } from '../../../../phases/types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

function runTest(name: string, testFn: () => void): TestResult {
  try {
    testFn();
    return { name, passed: true };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

/**
 * Run all utility tests
 */
export function runModuleUtilityTests(): {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  // ============================================================================
  // Battle Utilities Tests
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('BATTLE UTILITIES TESTS');
  console.log('='.repeat(80));

  // Test: getBattleCapableForces
  BattleUtilsTestData.forceCountScenarios.forEach((testCase) => {
    results.push(
      runTest(`getBattleCapableForces: ${testCase.name}`, () => {
        const state = BattleUtilsTestUtils.createForceCountScenario(
          testCase.faction,
          testCase.territory,
          testCase.sector,
          testCase.setup
        );
        const result = getBattleCapableForces(
          state,
          testCase.faction,
          testCase.territory,
          testCase.sector
        );
        assertEqual(result, testCase.expected, `${testCase.name}: Expected ${testCase.expected}, got ${result}`);
      })
    );
  });

  // Test: isBattleCapable
  BattleUtilsTestData.battleCapableScenarios.forEach((testCase) => {
    results.push(
      runTest(`isBattleCapable: ${testCase.name}`, () => {
        const state = BattleUtilsTestUtils.createBattleCapableScenario(
          testCase.faction,
          testCase.territory,
          testCase.sector,
          testCase.expected,
          testCase.setup
        );
        const result = isBattleCapable(
          state,
          testCase.faction,
          testCase.territory,
          testCase.sector
        );
        assertEqual(result, testCase.expected, `${testCase.name}: Expected ${testCase.expected}, got ${result}`);
      })
    );
  });

  // Test: createBattleContext
  BattleUtilsTestData.contextCreationScenarios.forEach((testCase) => {
    results.push(
      runTest(`createBattleContext: ${testCase.name}`, () => {
        const context = createBattleContext(
          testCase.territory,
          testCase.sector,
          testCase.aggressor,
          testCase.defender
        );
        assertEqual(context.territoryId, testCase.expected.territoryId);
        assertEqual(context.sector, testCase.expected.sector);
        assertEqual(context.aggressor, testCase.expected.aggressor);
        assertEqual(context.defender, testCase.expected.defender);
        assert(context.aggressorPlan === null, 'aggressorPlan should be null');
        assert(context.defenderPlan === null, 'defenderPlan should be null');
      })
    );
  });

  // Test: filterBattleCapableFactions
  results.push(
    runTest('filterBattleCapableFactions: filters out factions without forces', () => {
      // Create state with both factions
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
      // Remove Harkonnen forces to test filtering
      const state = builder.withDefaultSpice().build();
      
      // Manually remove Harkonnen forces for this test
      const harkonnenState = state.factions.get(Faction.HARKONNEN);
      if (harkonnenState) {
        harkonnenState.forces.onBoard = [];
      }
      
      const factions = [Faction.ATREIDES, Faction.HARKONNEN];
      const result = filterBattleCapableFactions(
        state,
        factions,
        TerritoryId.ARRAKEEN,
        DEFAULT_SECTOR
      );
      assert(result.includes(Faction.ATREIDES), 'Should include ATREIDES');
      assert(!result.includes(Faction.HARKONNEN), 'Should exclude HARKONNEN (no forces)');
    })
  );

  results.push(
    runTest('filterBattleCapableFactions: returns empty array when no factions are capable', () => {
      const state = buildTestState({
        factions: [Faction.ATREIDES, Faction.HARKONNEN],
        phase: Phase.BATTLE,
        advancedRules: true,
        turn: 1,
        spice: DefaultSpice,
        forces: [], // No forces
      });

      const factions = [Faction.ATREIDES, Faction.HARKONNEN];
      const result = filterBattleCapableFactions(
        state,
        factions,
        TerritoryId.ARRAKEEN,
        DEFAULT_SECTOR
      );
      assertEqual(result.length, 0, 'Should return empty array');
    })
  );

  results.push(
    runTest('filterBattleCapableFactions: handles empty input array', () => {
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const state = builder.withDefaultSpice().build();

      const result = filterBattleCapableFactions(
        state,
        [],
        TerritoryId.ARRAKEEN,
        DEFAULT_SECTOR
      );
      assertEqual(result.length, 0, 'Should return empty array for empty input');
    })
  );

  // ============================================================================
  // Faction Helpers Tests
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('FACTION HELPERS TESTS');
  console.log('='.repeat(80));

  // Test: getOpponentInBattle
  FactionHelpersTestData.opponentScenarios.forEach((testCase) => {
    results.push(
      runTest(`getOpponentInBattle: ${testCase.name}`, () => {
        const battle = FactionHelpersTestUtils.createBattle(
          testCase.battle.aggressor,
          testCase.battle.defender,
          testCase.battle.territory,
          testCase.battle.sector
        );
        const result = getOpponentInBattle(testCase.faction, battle);
        assertEqual(result, testCase.expectedOpponent);
      })
    );
  });

  // Test: isParticipantInBattle
  FactionHelpersTestData.participantScenarios.forEach((testCase) => {
    results.push(
      runTest(`isParticipantInBattle: ${testCase.name}`, () => {
        const battle = FactionHelpersTestUtils.createBattle(
          testCase.battle.aggressor,
          testCase.battle.defender,
          testCase.battle.territory,
          testCase.battle.sector
        );
        const result = isParticipantInBattle(testCase.faction, battle);
        assertEqual(result, testCase.expectedIsParticipant);
      })
    );
  });

  // Test: isAllyInBattle
  FactionHelpersTestData.allyInBattleScenarios.forEach((testCase) => {
    results.push(
      runTest(`isAllyInBattle: ${testCase.name}`, () => {
        // Use a non-stronghold territory to avoid occupancy limits
        const testTerritory = TerritoryId.THE_GREAT_FLAT;
        
        const battle = FactionHelpersTestUtils.createBattle(
          testCase.battle.aggressor,
          testCase.battle.defender,
          testTerritory, // Use non-stronghold
          testCase.battle.sector
        );
        
        // Ensure all needed factions are in the game
        const allFactions = [
          battle.aggressor,
          battle.defender,
          testCase.faction,
          testCase.ally,
        ].filter((f): f is Faction => f !== null && f !== undefined);
        const uniqueFactions = Array.from(new Set(allFactions));
        
        let state: any;
        const builder = new BattleStateBuilder();
        
        // Always include all factions in the game, even if they're not in the battle
        // Use buildTestState directly if we have 4+ factions
        if (uniqueFactions.length >= 4) {
          // Need all 4 factions - use buildTestState directly
          const forces = uniqueFactions.map((f) => ({
            faction: f,
            territory: testTerritory,
            sector: battle.sector,
            regular: f === battle.aggressor || f === battle.defender ? 10 : 5, // Battle participants get more
            elite: 0,
          }));
          
          state = buildTestState({
            factions: uniqueFactions,
            phase: Phase.BATTLE,
            advancedRules: true,
            turn: 1,
            spice: DefaultSpice,
            forces,
          });
        } else if (uniqueFactions.length === 3) {
          builder.threeFactionBattle(
            uniqueFactions[0], 
            uniqueFactions[1], 
            uniqueFactions[2],
            testTerritory, 
            battle.sector
          );
          state = builder.withDefaultSpice().build();
        } else if (uniqueFactions.length === 2) {
          builder.twoFactionBattle(uniqueFactions[0], uniqueFactions[1], testTerritory, battle.sector);
          state = builder.withDefaultSpice().build();
        } else {
          builder.twoFactionBattle(battle.aggressor, battle.defender, testTerritory, battle.sector);
          state = builder.withDefaultSpice().build();
        }
        
        // Apply alliance if needed
        if (testCase.ally) {
          if (uniqueFactions.length >= 4 && state) {
            // Already built state above - add alliance directly
            state = formAlliance(state, testCase.faction, testCase.ally);
          } else {
            // Use builder for alliance
            if (!state) {
              builder.withAlliance(testCase.faction, testCase.ally);
              state = builder.withDefaultSpice().build();
            } else {
              // State exists but not from builder - add alliance directly
              state = formAlliance(state, testCase.faction, testCase.ally);
            }
          }
        }
        
        if (!state) {
          state = builder.withDefaultSpice().build();
        }
        
        // Update battle territory to match
        battle.territoryId = testTerritory;
        
        const result = isAllyInBattle(state, testCase.faction, battle);
        assertEqual(result, testCase.expectedAllyInBattle);
      })
    );
  });

  // Test: isAggressor / isDefender
  results.push(
    runTest('isAggressor: returns true for aggressor', () => {
      const battle = FactionHelpersTestUtils.createBattle(
        Faction.ATREIDES,
        Faction.HARKONNEN
      );
      assertEqual(isAggressor(Faction.ATREIDES, battle), true);
      assertEqual(isAggressor(Faction.HARKONNEN, battle), false);
    })
  );

  results.push(
    runTest('isDefender: returns true for defender', () => {
      const battle = FactionHelpersTestUtils.createBattle(
        Faction.ATREIDES,
        Faction.HARKONNEN
      );
      assertEqual(isDefender(Faction.HARKONNEN, battle), true);
      assertEqual(isDefender(Faction.ATREIDES, battle), false);
    })
  );

  // ============================================================================
  // Battle Validation Tests
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('BATTLE VALIDATION TESTS');
  console.log('='.repeat(80));

  results.push(
    runTest('validateBattleChoice: validates correct battle choice', () => {
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const state = builder.withDefaultSpice().build();

      const battle: PendingBattle = {
        territoryId: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
        factions: [Faction.ATREIDES, Faction.HARKONNEN],
      };

      const result = validateBattleChoice(state, battle, Faction.ATREIDES);
      assert(result.valid, 'Battle choice should be valid');
      assertEqual(result.errors.length, 0, 'Should have no errors');
    })
  );

  results.push(
    runTest('validateBattleChoice: rejects aggressor not in battle', () => {
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const state = builder.withDefaultSpice().build();

      const battle: PendingBattle = {
        territoryId: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
        factions: [Faction.ATREIDES, Faction.HARKONNEN],
      };

      const result = validateBattleChoice(state, battle, Faction.FREMEN);
      assert(!result.valid, 'Battle choice should be invalid');
      assert(result.errors.length > 0, 'Should have error messages');
      assert(
        result.errors.some((e) => e.includes('not a participant')),
        'Error should mention aggressor not in battle'
      );
    })
  );

  results.push(
    runTest('validateBGCanBattle: returns true when BG has fighters', () => {
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.BENE_GESSERIT, Faction.ATREIDES);
      const state = builder.withDefaultSpice().build();

      const result = validateBGCanBattle(state, TerritoryId.ARRAKEEN, DEFAULT_SECTOR);
      assert(result, 'BG should be able to battle');
    })
  );

  results.push(
    runTest('validateBGCanBattle: returns false when BG has no forces', () => {
      // Create state without BG forces
      const state = buildTestState({
        factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
        phase: Phase.BATTLE,
        advancedRules: true,
        turn: 1,
        spice: DefaultSpice,
        forces: [], // No forces
      });

      const result = validateBGCanBattle(state, TerritoryId.ARRAKEEN, DEFAULT_SECTOR);
      assert(!result, 'BG should not be able to battle without forces');
    })
  );

  results.push(
    runTest('validateBattleSetup: validates correct battle setup', () => {
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const state = builder.withDefaultSpice().build();

      const battle: CurrentBattle = {
        territoryId: TerritoryId.ARRAKEEN,
        sector: DEFAULT_SECTOR,
        aggressor: Faction.ATREIDES,
        defender: Faction.HARKONNEN,
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

      const result = validateBattleSetup(battle, state);
      assert(result.valid, 'Battle setup should be valid');
      assertEqual(result.errors.length, 0, 'Should have no errors');
    })
  );

  results.push(
    runTest('validateBattleSetup: rejects null battle', () => {
      const builder = new BattleStateBuilder();
      builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
      const state = builder.withDefaultSpice().build();

      const result = validateBattleSetup(null, state);
      assert(!result.valid, 'Battle setup should be invalid');
      assert(result.errors.length > 0, 'Should have error messages');
      assert(
        result.errors.some((e) => e.includes('null')),
        'Error should mention battle is null'
      );
    })
  );

  // Print results
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ✗ ${r.name}`);
        if (r.error) {
          console.log(`    Error: ${r.error}`);
        }
      });
  }

  return {
    suite: 'Module Utilities',
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Run tests if executed directly
if (require.main === module) {
  const result = runModuleUtilityTests();
  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${result.passed} passed, ${result.failed} failed`);
  console.log('='.repeat(80));
  process.exit(result.failed > 0 ? 1 : 0);
}

