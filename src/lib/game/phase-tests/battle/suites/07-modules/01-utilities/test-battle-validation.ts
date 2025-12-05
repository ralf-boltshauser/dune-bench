/**
 * Test: Battle Validation
 *
 * Tests for battle validation utility functions.
 */

import { Faction, TerritoryId } from '../../../../../types';
import { validateBattleChoice, validateBGCanBattle, validateBattleSetup } from '../../../../../phases/handlers/battle/utils/battle-validation';
import { BattleStateBuilder } from '@/lib/game/phase-tests/battle/builders/battle-state-builder';
import { DEFAULT_SECTOR } from '@/lib/game/phase-tests/battle/fixtures';
import type { PendingBattle, CurrentBattle } from '../../../../../phases/types';

describe('Battle Validation - validateBattleChoice()', () => {
  it('should validate correct battle choice', () => {
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const state = builder.withDefaultSpice().build();

    const battle: PendingBattle = {
      territoryId: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
    };

    const result = validateBattleChoice(state, battle, Faction.ATREIDES);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when aggressor not in battle', () => {
    const builder = new BattleStateBuilder();
    builder.twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN);
    const state = builder.withDefaultSpice().build();

    const battle: PendingBattle = {
      territoryId: TerritoryId.ARRAKEEN,
      sector: DEFAULT_SECTOR,
      factions: [Faction.ATREIDES, Faction.HARKONNEN],
    };

    const result = validateBattleChoice(state, battle, Faction.FREMEN);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Battle Validation - validateBGCanBattle()', () => {
  it('should return true when BG has fighters', () => {
    const builder = new BattleStateBuilder();
    builder.addForces(Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, DEFAULT_SECTOR, 5, 0);
    const state = builder.withDefaultSpice().build();

    const result = validateBGCanBattle(state, TerritoryId.ARRAKEEN, DEFAULT_SECTOR);
    expect(result).toBe(true);
  });

  it('should return false when BG has no forces', () => {
    const builder = new BattleStateBuilder();
    const state = builder.withDefaultSpice().build();

    const result = validateBGCanBattle(state, TerritoryId.ARRAKEEN, DEFAULT_SECTOR);
    expect(result).toBe(false);
  });
});

describe('Battle Validation - validateBattleSetup()', () => {
  it('should validate correct battle setup', () => {
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
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when battle is null', () => {
    const builder = new BattleStateBuilder();
    const state = builder.withDefaultSpice().build();

    const result = validateBattleSetup(null, state);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

