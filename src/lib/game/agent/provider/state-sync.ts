/**
 * State Synchronization
 *
 * Handles synchronization of game state across multiple faction agents.
 * Single source of truth for state synchronization logic.
 */

import type { Faction, GameState } from "../../types";
import type { FactionAgent } from "./types";
import {
  getFactionAgentState,
  updateFactionAgentState,
  updateAllAgentsState,
} from "./faction-agent";

/**
 * Sync state from a specific agent to all other agents.
 * Called after an agent takes an action in sequential mode.
 *
 * @returns Updated game state
 */
export function syncStateFromAgent(
  agents: Map<Faction, FactionAgent>,
  factionId: Faction,
  currentState: GameState
): GameState {
  const agent = agents.get(factionId);
  if (!agent) return currentState;

  const updatedState = getFactionAgentState(agent);

  // Update all other agents with this state
  const otherAgents = new Map<Faction, FactionAgent>();
  for (const [faction, otherAgent] of agents) {
    if (faction !== factionId) {
      otherAgents.set(faction, otherAgent);
    }
  }
  updateAllAgentsState(otherAgents, updatedState);

  return updatedState;
}

/**
 * Sync state from all agents (for simultaneous actions).
 * Merges changes by using the state from the last agent in iteration order.
 * Note: This is imperfect for true simultaneous actions but works for most cases.
 *
 * @returns Latest game state
 */
export function syncStateFromAllAgents(
  agents: Map<Faction, FactionAgent>,
  currentState: GameState
): GameState {
  // Get the most recent state from any agent that acted
  // Since tools update state, we need to find which agent has the latest
  let latestState = currentState;
  for (const agent of agents.values()) {
    latestState = getFactionAgentState(agent);
  }

  // Sync to all agents
  updateAllAgentsState(agents, latestState);

  return latestState;
}

