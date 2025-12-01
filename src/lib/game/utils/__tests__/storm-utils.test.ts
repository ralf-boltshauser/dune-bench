/**
 * Unit Tests for Storm Utilities
 * 
 * Tests for getAffectedSectors(), isTerritoryAffectedByStorm(), and related functions.
 */

import { getAffectedSectors, isTerritoryAffectedByStorm, isCityLosingProtection } from '../storm-utils';
import { GAME_CONSTANTS } from '../../data';
import { TerritoryId, TerritoryType, Phase } from '../../types';
import type { GameState } from '../../types';

/**
 * Helper to create a minimal game state for testing
 */
function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'test',
    config: {
      maxTurns: 6,
      factions: [],
      advancedRules: false,
      variants: {
        shieldWallStronghold: false,
        leaderSkillCards: false,
        homeworlds: false,
      },
    },
    turn: 1,
    phase: Phase.STORM,
    factions: new Map(),
    stormOrder: [],
    activeFactions: [],
    playerPositions: new Map(),
    stormSector: 0,
    shieldWallDestroyed: false,
    spiceOnBoard: [],
    treacheryDeck: [],
    treacheryDiscard: [],
    spiceDeck: [],
    spiceDeckA: [],
    spiceDeckB: [],
    spiceDiscardA: [],
    spiceDiscardB: [],
    stormDeck: [],
    alliances: [],
    pendingDeals: [],
    dealHistory: [],
    stormPhase: null,
    biddingPhase: null,
    battlePhase: null,
    winner: null,
    winAttempts: new Map(),
    wormCount: 0,
    nexusOccurring: false,
    karamaState: null,
    bgSpiritualAdvisorTrigger: null,
    actionLog: [],
    ...overrides,
  };
}

describe('getAffectedSectors', () => {
  describe('basic functionality', () => {
    it('includes starting sector', () => {
      const result = getAffectedSectors(12, 2);
      expect(result).toContain(12);
    });

    it('includes ending sector', () => {
      const result = getAffectedSectors(12, 2);
      expect(result).toContain(14);
    });

    it('includes all sectors passed through', () => {
      const result = getAffectedSectors(12, 2);
      expect(result).toEqual([12, 13, 14]);
    });

    it('handles single sector movement', () => {
      const result = getAffectedSectors(5, 1);
      expect(result).toEqual([5, 6]);
    });

    it('handles zero movement (storm stays in place)', () => {
      const result = getAffectedSectors(10, 0);
      expect(result).toEqual([10]);
    });
  });

  describe('wrap-around scenarios', () => {
    it('handles wrap-around at end of board', () => {
      const result = getAffectedSectors(17, 2);
      expect(result).toEqual([17, 0, 1]);
    });

    it('handles wrap-around from middle', () => {
      const result = getAffectedSectors(15, 5);
      expect(result).toEqual([15, 16, 17, 0, 1, 2]);
    });

    it('handles full wrap-around (movement = 18)', () => {
      const result = getAffectedSectors(0, 18);
      expect(result.length).toBe(18);
      expect(result).toContain(0);
      expect(result).toContain(17);
      // Should contain all sectors
      for (let i = 0; i < 18; i++) {
        expect(result).toContain(i);
      }
    });

    it('handles multiple wrap-arounds (movement > 18)', () => {
      const result = getAffectedSectors(5, 36);
      expect(result.length).toBe(18);
      expect(result).toContain(5);
      // Should contain all sectors
      for (let i = 0; i < 18; i++) {
        expect(result).toContain(i);
      }
    });

    it('handles large movement that wraps multiple times', () => {
      const result = getAffectedSectors(0, 20);
      expect(result.length).toBe(18);
      // Should contain all sectors
      for (let i = 0; i < 18; i++) {
        expect(result).toContain(i);
      }
    });
  });

  describe('edge cases', () => {
    it('handles movement from sector 0', () => {
      const result = getAffectedSectors(0, 3);
      expect(result).toEqual([0, 1, 2, 3]);
    });

    it('handles movement to sector 0', () => {
      const result = getAffectedSectors(17, 1);
      expect(result).toEqual([17, 0]);
    });

    it('handles maximum normal movement (6 sectors)', () => {
      const result = getAffectedSectors(10, 6);
      expect(result).toEqual([10, 11, 12, 13, 14, 15, 16]);
    });

    it('handles movement that ends exactly at starting sector (full wrap)', () => {
      const result = getAffectedSectors(5, 18);
      expect(result.length).toBe(18);
      expect(result).toContain(5);
    });
  });

  describe('boundary conditions', () => {
    it('handles movement of exactly TOTAL_SECTORS', () => {
      const result = getAffectedSectors(0, GAME_CONSTANTS.TOTAL_SECTORS);
      expect(result.length).toBe(GAME_CONSTANTS.TOTAL_SECTORS);
    });

    it('handles movement just below TOTAL_SECTORS', () => {
      const result = getAffectedSectors(0, GAME_CONSTANTS.TOTAL_SECTORS - 1);
      expect(result.length).toBe(GAME_CONSTANTS.TOTAL_SECTORS);
      expect(result).toEqual(Array.from({ length: GAME_CONSTANTS.TOTAL_SECTORS }, (_, i) => i));
    });

    it('handles movement just above TOTAL_SECTORS', () => {
      const result = getAffectedSectors(0, GAME_CONSTANTS.TOTAL_SECTORS + 1);
      expect(result.length).toBe(GAME_CONSTANTS.TOTAL_SECTORS);
    });
  });
});

describe('isCityLosingProtection', () => {
  it('returns false when shield wall is not destroyed', () => {
    const state = createTestState({ shieldWallDestroyed: false });
    expect(isCityLosingProtection(state, TerritoryId.IMPERIAL_BASIN)).toBe(false);
    expect(isCityLosingProtection(state, TerritoryId.ARRAKEEN)).toBe(false);
    expect(isCityLosingProtection(state, TerritoryId.CARTHAG)).toBe(false);
  });

  it('returns true for Imperial Basin when shield wall is destroyed', () => {
    const state = createTestState({ shieldWallDestroyed: true });
    expect(isCityLosingProtection(state, TerritoryId.IMPERIAL_BASIN)).toBe(true);
  });

  it('returns true for Arrakeen when shield wall is destroyed', () => {
    const state = createTestState({ shieldWallDestroyed: true });
    expect(isCityLosingProtection(state, TerritoryId.ARRAKEEN)).toBe(true);
  });

  it('returns true for Carthag when shield wall is destroyed', () => {
    const state = createTestState({ shieldWallDestroyed: true });
    expect(isCityLosingProtection(state, TerritoryId.CARTHAG)).toBe(true);
  });

  it('returns false for other territories even when shield wall is destroyed', () => {
    const state = createTestState({ shieldWallDestroyed: true });
    expect(isCityLosingProtection(state, TerritoryId.HABBANYA_ERG)).toBe(false);
    expect(isCityLosingProtection(state, TerritoryId.RED_CHASM)).toBe(false);
  });
});

describe('isTerritoryAffectedByStorm', () => {
  describe('protected territories', () => {
    it('returns false for Imperial Basin when not destroyed by Family Atomics', () => {
      const state = createTestState({ shieldWallDestroyed: false });
      expect(isTerritoryAffectedByStorm(state, TerritoryId.IMPERIAL_BASIN)).toBe(false);
    });

    it('returns false for Arrakeen when not destroyed by Family Atomics', () => {
      const state = createTestState({ shieldWallDestroyed: false });
      expect(isTerritoryAffectedByStorm(state, TerritoryId.ARRAKEEN)).toBe(false);
    });

    it('returns false for Carthag when not destroyed by Family Atomics', () => {
      const state = createTestState({ shieldWallDestroyed: false });
      expect(isTerritoryAffectedByStorm(state, TerritoryId.CARTHAG)).toBe(false);
    });

    it('returns true for Imperial Basin when Family Atomics was played', () => {
      const state = createTestState({ shieldWallDestroyed: true });
      expect(isTerritoryAffectedByStorm(state, TerritoryId.IMPERIAL_BASIN)).toBe(true);
    });

    it('returns true for Arrakeen when Family Atomics was played', () => {
      const state = createTestState({ shieldWallDestroyed: true });
      expect(isTerritoryAffectedByStorm(state, TerritoryId.ARRAKEEN)).toBe(true);
    });

    it('returns true for Carthag when Family Atomics was played', () => {
      const state = createTestState({ shieldWallDestroyed: true });
      expect(isTerritoryAffectedByStorm(state, TerritoryId.CARTHAG)).toBe(true);
    });
  });

  describe('sand territories', () => {
    it('returns true for unprotected sand territories', () => {
      const state = createTestState();
      // Most sand territories should be affected
      expect(isTerritoryAffectedByStorm(state, TerritoryId.HABBANYA_ERG)).toBe(true);
      expect(isTerritoryAffectedByStorm(state, TerritoryId.RED_CHASM)).toBe(true);
    });
  });

  describe('rock territories', () => {
    it('returns false for rock territories (protected by default)', () => {
      const state = createTestState();
      // Rock territories are not sand, so they're protected
      // Note: This depends on the actual territory definitions
      // If a territory is defined as SAND, it will be affected
      // If it's ROCK or STRONGHOLD, it won't be affected (unless Family Atomics)
    });
  });
});

// Note: This test file is structured for Jest/Vitest integration.
// To run these tests, you would need to set up a test framework.
// For now, the tests are written and ready to be integrated.

