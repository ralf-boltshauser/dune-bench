/**
 * Faction Agent Module Unit Tests
 *
 * Tests for faction-agent.ts module functions.
 */

import { describe, test } from "../helpers/utils/test-utils";
import {
  createFactionAgent,
  createAllFactionAgents,
  updateFactionAgentState,
  updateAllAgentsState,
  getAgent,
  hasAgent,
} from "../../provider/faction-agent";
import { Faction } from "@/lib/game/types";
import { GAME_STATE_PRESETS } from "../helpers/fixtures";
import {
  assertAgentCreated,
  assertAllAgentsCreated,
  assertAgentStateUpdated,
  assertAgentRetrieved,
} from "../helpers/assertions/module-assertions";
import {
  testAgentCreation,
  testBatchAgentCreation,
  testAgentStateManagement,
  testAgentRetrieval,
} from "../helpers/module-test-utils";

describe("Faction Agent Module", () => {
  describe("createFactionAgent", () => {
    test("should create agent for Atreides", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agent = createFactionAgent(state, Faction.ATREIDES, state.gameId);

      assertAgentCreated(agent, Faction.ATREIDES, state);
    });

    test("should create agent for each faction", () => {
      const factions = [
        Faction.ATREIDES,
        Faction.BENE_GESSERIT,
        Faction.EMPEROR,
        Faction.FREMEN,
        Faction.HARKONNEN,
        Faction.SPACING_GUILD,
      ];

      for (const faction of factions) {
        const state = GAME_STATE_PRESETS.SINGLE_FACTION(faction);
        const agent = createFactionAgent(state, faction, state.gameId);
        assertAgentCreated(agent, faction, state);
      }
    });

    test("should create agent with correct tool provider", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agent = createFactionAgent(state, Faction.ATREIDES, state.gameId);

      if (!agent.toolProvider) {
        throw new Error("Expected agent to have toolProvider");
      }

      const agentState = agent.toolProvider.getState();
      if (agentState.gameId !== state.gameId) {
        throw new Error("Expected toolProvider to have correct gameId");
      }
    });
  });

  describe("createAllFactionAgents", () => {
    test("should create agents for all factions in state", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      assertAllAgentsCreated(agents, [Faction.ATREIDES, Faction.HARKONNEN]);
    });

    test("should create agents for all 6 factions", () => {
      const state = GAME_STATE_PRESETS.ALL_FACTIONS();
      const agents = createAllFactionAgents(state, state.gameId);

      assertAllAgentsCreated(agents, [
        Faction.ATREIDES,
        Faction.BENE_GESSERIT,
        Faction.EMPEROR,
        Faction.FREMEN,
        Faction.HARKONNEN,
        Faction.SPACING_GUILD,
      ]);
    });

    test("should create agents only for factions in state", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agents = createAllFactionAgents(state, state.gameId);

      // Should only create agent for Atreides (and Harkonnen which is added by SINGLE_FACTION)
      if (agents.size !== 2) {
        throw new Error(`Expected 2 agents, got ${agents.size}`);
      }
    });
  });

  describe("updateFactionAgentState", () => {
    test("should update single agent state", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agent = createFactionAgent(state, Faction.ATREIDES, state.gameId);

      const newState = { ...state, turn: 2 };
      updateFactionAgentState(agent, newState);

      assertAgentStateUpdated(agent, newState);
    });

    test("should update agent state multiple times", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agent = createFactionAgent(state, Faction.ATREIDES, state.gameId);

      updateFactionAgentState(agent, { ...state, turn: 2 });
      updateFactionAgentState(agent, { ...state, turn: 3 });
      updateFactionAgentState(agent, { ...state, turn: 4 });

      const agentState = agent.toolProvider.getState();
      if (agentState.turn !== 4) {
        throw new Error(`Expected turn to be 4, got ${agentState.turn}`);
      }
    });
  });

  describe("updateAllAgentsState", () => {
    test("should update all agents state", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      const newState = { ...state, turn: 2 };
      updateAllAgentsState(agents, newState);

      for (const agent of agents.values()) {
        assertAgentStateUpdated(agent, newState);
      }
    });

    test("should update all agents state multiple times", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      updateAllAgentsState(agents, { ...state, turn: 2 });
      updateAllAgentsState(agents, { ...state, turn: 3 });
      updateAllAgentsState(agents, { ...state, turn: 4 });

      for (const agent of agents.values()) {
        const agentState = agent.toolProvider.getState();
        if (agentState.turn !== 4) {
          throw new Error(`Expected turn to be 4, got ${agentState.turn}`);
        }
      }
    });
  });

  describe("getAgent", () => {
    test("should return agent for existing faction", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      const agent = getAgent(agents, Faction.ATREIDES);
      assertAgentRetrieved(agents, Faction.ATREIDES, agent);
    });

    test("should throw for non-existent faction", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agents = createAllFactionAgents(state, state.gameId);

      // Note: SINGLE_FACTION actually creates 2 factions (Atreides + Harkonnen)
      // So we need to use a faction that's truly not in the game
      let errorThrown = false;
      try {
        getAgent(agents, Faction.BENE_GESSERIT); // Not in game
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("No agent for faction")
        ) {
          errorThrown = true;
        } else {
          throw error;
        }
      }

      if (!errorThrown) {
        throw new Error("Expected getAgent to throw for non-existent faction");
      }
    });
  });

  describe("hasAgent", () => {
    test("should return true for existing faction", () => {
      const state = GAME_STATE_PRESETS.TWO_FACTIONS([
        Faction.ATREIDES,
        Faction.HARKONNEN,
      ]);
      const agents = createAllFactionAgents(state, state.gameId);

      if (!hasAgent(agents, Faction.ATREIDES)) {
        throw new Error("Expected hasAgent to return true for existing faction");
      }
    });

    test("should return false for non-existent faction", () => {
      const state = GAME_STATE_PRESETS.SINGLE_FACTION(Faction.ATREIDES);
      const agents = createAllFactionAgents(state, state.gameId);

      // Note: SINGLE_FACTION actually creates 2 factions (Atreides + Harkonnen)
      // So we need to use a faction that's truly not in the game
      if (hasAgent(agents, Faction.BENE_GESSERIT)) { // Not in game
        throw new Error("Expected hasAgent to return false for non-existent faction");
      }
    });
  });
});

