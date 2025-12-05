/**
 * Game State Fixtures
 *
 * Reusable game state presets for tests.
 */

import { createGameState } from "../../../../state";
import type { GameState } from "@/lib/game/types";
import { Faction, Phase } from "@/lib/game/types";

export const GAME_STATE_PRESETS = {
  // Minimal states
  TWO_FACTIONS: (factions: [Faction, Faction]): GameState =>
    createGameState({ factions, maxTurns: 1 }),

  ALL_FACTIONS: (): GameState =>
    createGameState({
      factions: [
        Faction.ATREIDES,
        Faction.BENE_GESSERIT,
        Faction.EMPEROR,
        Faction.FREMEN,
        Faction.HARKONNEN,
        Faction.SPACING_GUILD,
      ],
      maxTurns: 1,
    }),

  SINGLE_FACTION: (faction: Faction): GameState =>
    createGameState({ factions: [faction, Faction.HARKONNEN], maxTurns: 1 }),

  // Phase-specific states
  STORM_PHASE: (factions: Faction[]): GameState => {
    const state = createGameState({ factions, maxTurns: 1 });
    return { ...state, phase: Phase.STORM };
  },

  BIDDING_PHASE: (factions: Faction[]): GameState => {
    const state = createGameState({ factions, maxTurns: 1 });
    return { ...state, phase: Phase.BIDDING };
  },

  REVIVAL_PHASE: (factions: Faction[]): GameState => {
    const state = createGameState({ factions, maxTurns: 1 });
    return { ...state, phase: Phase.REVIVAL };
  },

  SHIPMENT_MOVEMENT_PHASE: (factions: Faction[]): GameState => {
    const state = createGameState({ factions, maxTurns: 1 });
    return { ...state, phase: Phase.SHIPMENT_MOVEMENT };
  },

  BATTLE_PHASE: (factions: Faction[]): GameState => {
    const state = createGameState({ factions, maxTurns: 1 });
    return { ...state, phase: Phase.BATTLE };
  },

  // Edge case states - removed EMPTY_FACTIONS as game requires 2-6 factions

  // State with specific turn
  WITH_TURN: (turn: number, factions: Faction[]): GameState => {
    const state = createGameState({ factions, maxTurns: 10 });
    return { ...state, turn };
  },

  // State with updates
  WITH_STATE_UPDATES: (
    baseState: GameState,
    updates: Partial<GameState>
  ): GameState => {
    return { ...baseState, ...updates };
  },
} as const;

// Helper to create custom states
export function createTestGameState(
  overrides?: Partial<GameState>
): GameState {
  // Game requires at least 2 factions
  const base = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    maxTurns: 1,
  });
  return { ...base, ...overrides };
}

