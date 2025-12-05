/**
 * Test: Faction Helpers
 *
 * Tests for faction helper functions using reusable infrastructure.
 */

import { Faction, TerritoryId } from '../../../../../types';
import {
  getOpponentInBattle,
  isParticipantInBattle,
  isAllyInBattle,
  getAllyInBattle,
  getAllyOpponent,
  isAggressor,
  isDefender,
} from '../../../../../phases/handlers/battle/utils';
import { FactionHelpersTestUtils } from '@/lib/game/phase-tests/battle/helpers/module-test-utils';
import { FactionHelpersTestData } from '@/lib/game/phase-tests/battle/fixtures/module-test-data';
import { BattleStateBuilder } from '@/lib/game/phase-tests/battle/builders/battle-state-builder';

describe('Faction Helpers - getOpponentInBattle()', () => {
  FactionHelpersTestUtils.runHelperTest(
    FactionHelpersTestData.opponentScenarios,
    (testCase, battle) => {
      it(testCase.name, () => {
        const result = getOpponentInBattle(testCase.faction, battle);
        expect(result).toBe(testCase.expectedOpponent);
      });
    }
  );
});

describe('Faction Helpers - isParticipantInBattle()', () => {
  FactionHelpersTestUtils.runHelperTest(
    FactionHelpersTestData.participantScenarios,
    (testCase, battle) => {
      it(testCase.name, () => {
        const result = isParticipantInBattle(testCase.faction, battle);
        expect(result).toBe(testCase.expectedIsParticipant);
      });
    }
  );
});

describe('Faction Helpers - isAllyInBattle()', () => {
  FactionHelpersTestUtils.runHelperTest(
    FactionHelpersTestData.allyInBattleScenarios,
    (testCase, battle, state) => {
      it(testCase.name, () => {
        if (!state) {
          // Create state with alliance if needed
          const builder = new BattleStateBuilder();
          builder.twoFactionBattle(
            battle.aggressor,
            battle.defender,
            battle.territoryId,
            battle.sector
          );
          if (testCase.ally) {
            builder.withAlliance(testCase.faction, testCase.ally);
          }
          state = builder.withDefaultSpice().build();
        }

        const result = isAllyInBattle(state, testCase.faction, battle);
        expect(result).toBe(testCase.expectedAllyInBattle);
      });
    }
  );
});

describe('Faction Helpers - getAllyInBattle()', () => {
  it('should return ally when ally is in battle', () => {
    const battle = FactionHelpersTestUtils.createBattle(
      Faction.ATREIDES,
      Faction.HARKONNEN
    );
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
    builder.withAlliance(Faction.BENE_GESSERIT, Faction.ATREIDES);
    const state = builder.withDefaultSpice().build();

    const result = getAllyInBattle(state, Faction.BENE_GESSERIT, battle);
    expect(result).toBe(Faction.ATREIDES);
  });

  it('should return null when no ally', () => {
    const battle = FactionHelpersTestUtils.createBattle(
      Faction.ATREIDES,
      Faction.HARKONNEN
    );
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const state = builder.withDefaultSpice().build();

    const result = getAllyInBattle(state, Faction.ATREIDES, battle);
    expect(result).toBeNull();
  });
});

describe('Faction Helpers - getAllyOpponent()', () => {
  it('should return opponent of ally when ally is in battle', () => {
    const battle = FactionHelpersTestUtils.createBattle(
      Faction.ATREIDES,
      Faction.HARKONNEN
    );
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
    builder.withAlliance(Faction.BENE_GESSERIT, Faction.ATREIDES);
    const state = builder.withDefaultSpice().build();

    const result = getAllyOpponent(state, Faction.BENE_GESSERIT, battle);
    expect(result).toBe(Faction.HARKONNEN);
  });

  it('should return null when ally not in battle', () => {
    const battle = FactionHelpersTestUtils.createBattle(
      Faction.ATREIDES,
      Faction.HARKONNEN
    );
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
    builder.withAlliance(Faction.BENE_GESSERIT, Faction.FREMEN);
    const state = builder.withDefaultSpice().build();

    const result = getAllyOpponent(state, Faction.BENE_GESSERIT, battle);
    expect(result).toBeNull();
  });
});

describe('Faction Helpers - isAggressor() / isDefender()', () => {
  it('isAggressor should return true for aggressor', () => {
    const battle = FactionHelpersTestUtils.createBattle(
      Faction.ATREIDES,
      Faction.HARKONNEN
    );
    expect(isAggressor(Faction.ATREIDES, battle)).toBe(true);
    expect(isAggressor(Faction.HARKONNEN, battle)).toBe(false);
  });

  it('isDefender should return true for defender', () => {
    const battle = FactionHelpersTestUtils.createBattle(
      Faction.ATREIDES,
      Faction.HARKONNEN
    );
    expect(isDefender(Faction.HARKONNEN, battle)).toBe(true);
    expect(isDefender(Faction.ATREIDES, battle)).toBe(false);
  });
});

