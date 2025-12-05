/**
 * State Sync Module Unit Tests
 *
 * Tests for state-sync.ts module functions.
 */

import { describe, test } from "../helpers/utils/test-utils";
import {
  syncStateFromAgent,
  syncStateFromAllAgents,
} from "../../provider/state-sync";
import { Faction } from "@/lib/game/types";
import { GAME_STATE_PRESETS } from "../helpers/fixtures";
import { createAllFactionAgents } from "../../provider/faction-agent";
import {
  assertStateSyncedFromAgent,
  assertStateSyncedFromAllAgents,
  assertAllAgentsUpdated,
} from "../helpers/assertions/module-assertions";
import {
  createTestAgentsMap,
  testStateSyncFromAgent,
  testStateSyncFromAllAgents,
} from "../helpers/module-test-utils";

describe("State Sync Module", () => {
  describe("syncStateFromAgent", () => {
    test("should sync state from specific agent to others", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      const newState = { ...state, turn: 2 };
      // Update one agent's state
      agents.get(Faction.ATREIDES)!.toolProvider.updateState(newState);

      const syncedState = syncStateFromAgent(agents, Faction.ATREIDES, state);

      // Verify state was synced
      if (syncedState.turn !== 2) {
        throw new Error(`Expected synced state turn to be 2, got ${syncedState.turn}`);
      }

      // Verify other agent received the update
      const harkonnenState = agents.get(Faction.HARKONNEN)!.toolProvider.getState();
      if (harkonnenState.turn !== 2) {
        throw new Error(
          `Expected Harkonnen agent to have synced state (turn 2), got turn ${harkonnenState.turn}`
        );
      }
    });

    test("should return current state when agent not found", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agents = createAllFactionAgents(state, state.gameId);

      const syncedState = syncStateFromAgent(agents, Faction.HARKONNEN, state);

      // Should return current state unchanged
      if (syncedState.gameId !== state.gameId) {
        throw new Error("Expected synced state to be unchanged when agent not found");
      }
    });

    test("should sync state to all other agents", () => {
      const state = GAME_STATE_PRESETS.ALL_FACTIONS();
      const agents = createAllFactionAgents(state, state.gameId);

      const newState = { ...state, turn: 3 };
      // Update one agent's state
      agents.get(Faction.ATREIDES)!.toolProvider.updateState(newState);

      syncStateFromAgent(agents, Faction.ATREIDES, state);

      // Verify all other agents received the update
      for (const [faction, agent] of agents.entries()) {
        if (faction !== Faction.ATREIDES) {
          const agentState = agent.toolProvider.getState();
          if (agentState.turn !== 3) {
            throw new Error(
              `Expected ${faction} agent to have synced state (turn 3), got turn ${agentState.turn}`
            );
          }
        }
      }
    });
  });

  describe("syncStateFromAllAgents", () => {
    test("should sync state from all agents", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      // Update both agents with different states
      agents.get(Faction.ATREIDES)!.toolProvider.updateState({ ...state, turn: 2 });
      agents.get(Faction.HARKONNEN)!.toolProvider.updateState({ ...state, turn: 3 });

      const syncedState = syncStateFromAllAgents(agents, state);

      // Should use latest state (from last agent in iteration)
      if (syncedState.turn !== 3) {
        throw new Error(
          `Expected synced state to use latest turn (3), got ${syncedState.turn}`
        );
      }

      // Verify all agents have the latest state
      for (const agent of agents.values()) {
        const agentState = agent.toolProvider.getState();
        if (agentState.turn !== 3) {
          throw new Error(
            `Expected all agents to have synced state (turn 3), got turn ${agentState.turn}`
          );
        }
      }
    });

    test("should sync state when all agents have same state", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      const newState = { ...state, turn: 5 };
      // Update all agents to same state
      for (const agent of agents.values()) {
        agent.toolProvider.updateState(newState);
      }

      const syncedState = syncStateFromAllAgents(agents, state);

      if (syncedState.turn !== 5) {
        throw new Error(`Expected synced state turn to be 5, got ${syncedState.turn}`);
      }
    });

    test("should handle empty agents map", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agents = new Map();

      const syncedState = syncStateFromAllAgents(agents, state);

      // Should return current state unchanged
      if (syncedState.gameId !== state.gameId) {
        throw new Error("Expected synced state to be unchanged for empty agents map");
      }
    });
  });
});

// Explicitly exit after tests complete to prevent hanging
if (typeof process !== 'undefined') {
  setTimeout(() => process.exit(0), 50);
}

