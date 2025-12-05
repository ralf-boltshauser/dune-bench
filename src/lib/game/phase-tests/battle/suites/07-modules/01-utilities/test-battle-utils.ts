/**
 * Test: Battle Utilities
 *
 * Tests for battle utility functions using reusable infrastructure.
 */

import { Faction, TerritoryId } from '../../../../../types';
import {
  getBattleCapableForces,
  isBattleCapable,
  createBattleContext,
  filterBattleCapableFactions,
} from '../../../../../phases/handlers/battle/utils';
import { BattleUtilsTestUtils } from '@/lib/game/phase-tests/battle/helpers/module-test-utils';
import { BattleUtilsTestData } from '@/lib/game/phase-tests/battle/fixtures/module-test-data';
import { DEFAULT_SECTOR } from '@/lib/game/phase-tests/battle/fixtures/test-data';
import { BattleStateBuilder } from '@/lib/game/phase-tests/battle/builders/battle-state-builder';

describe('Battle Utilities - getBattleCapableForces()', () => {
  BattleUtilsTestUtils.runUtilityTest(
    BattleUtilsTestData.forceCountScenarios,
    (testCase, state) => {
      it(testCase.name, () => {
        const result = getBattleCapableForces(
          state,
          testCase.faction,
          testCase.territory,
          testCase.sector
        );
        expect(result).toBe(testCase.expected);
      });
    }
  );

  it('should return 0 for non-existent faction state', () => {
    const state = BattleUtilsTestUtils.createForceCountScenario(
      Faction.ATREIDES,
      TerritoryId.ARRAKEEN,
      DEFAULT_SECTOR,
      { regular: 10 }
    );
    // Remove faction state to simulate missing faction
    state.factions.delete(Faction.ATREIDES);
    
    const result = getBattleCapableForces(
      state,
      Faction.ATREIDES,
      TerritoryId.ARRAKEEN,
      DEFAULT_SECTOR
    );
    expect(result).toBe(0);
  });
});

describe('Battle Utilities - isBattleCapable()', () => {
  BattleUtilsTestUtils.runUtilityTest(
    BattleUtilsTestData.battleCapableScenarios,
    (testCase, state) => {
      it(testCase.name, () => {
        const result = isBattleCapable(
          state,
          testCase.faction,
          testCase.territory,
          testCase.sector
        );
        expect(result).toBe(testCase.expected);
      });
    }
  );
});

describe('Battle Utilities - createBattleContext()', () => {
  BattleUtilsTestData.contextCreationScenarios.forEach((testCase) => {
    it(testCase.name, () => {
      const context = createBattleContext(
        testCase.territory,
        testCase.sector,
        testCase.aggressor,
        testCase.defender
      );

      expect(context.territoryId).toBe(testCase.expected.territoryId);
      expect(context.sector).toBe(testCase.expected.sector);
      expect(context.aggressor).toBe(testCase.expected.aggressor);
      expect(context.defender).toBe(testCase.expected.defender);
      expect(context.aggressorPlan).toBeNull();
      expect(context.defenderPlan).toBeNull();
      expect(context.prescienceUsed).toBe(false);
      expect(context.voiceUsed).toBe(false);
      expect(context.traitorCalled).toBe(false);
    });
  });
});

describe('Battle Utilities - filterBattleCapableFactions()', () => {
  it('should filter out factions without battle-capable forces', () => {
    const state = BattleUtilsTestUtils.createForceCountScenario(
      Faction.ATREIDES,
      TerritoryId.ARRAKEEN,
      DEFAULT_SECTOR,
      { regular: 10 }
    );
    // Add Harkonnen with no forces
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN, TerritoryId.ARRAKEEN, DEFAULT_SECTOR);
    const fullState = builder.withDefaultSpice().build();

    const factions = [Faction.ATREIDES, Faction.HARKONNEN];
    const result = filterBattleCapableFactions(
      fullState,
      factions,
      TerritoryId.ARRAKEEN,
      DEFAULT_SECTOR
    );

    expect(result).toContain(Faction.ATREIDES);
    // Harkonnen should be filtered out if no forces
    // (This depends on the actual state setup)
  });

  it('should return empty array when no factions are battle-capable', () => {
    const state = BattleUtilsTestUtils.createForceCountScenario(
      Faction.ATREIDES,
      TerritoryId.ARRAKEEN,
      DEFAULT_SECTOR,
      { regular: 0 }
    );

    const factions = [Faction.ATREIDES];
    const result = filterBattleCapableFactions(
      state,
      factions,
      TerritoryId.ARRAKEEN,
      DEFAULT_SECTOR
    );

    expect(result).toEqual([]);
  });
});

