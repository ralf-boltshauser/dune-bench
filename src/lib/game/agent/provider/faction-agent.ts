/**
 * Faction Agent Management
 *
 * Handles creation and management of faction agents.
 * Single source of truth for faction agent lifecycle.
 */

import type { Faction, GameState } from "../../types";
import { createAgentToolProvider } from "../../tools";
import type { FactionAgent } from "./types";

/**
 * Create a faction agent for a given faction.
 */
export function createFactionAgent(
  state: GameState,
  faction: Faction,
  gameId: string
): FactionAgent {
  return {
    faction,
    toolProvider: createAgentToolProvider(state, faction, {
      streaming: { gameId },
    }),
  };
}

/**
 * Create agents for all factions in the game.
 * Returns a map of faction to agent.
 */
export function createAllFactionAgents(
  state: GameState,
  gameId: string
): Map<Faction, FactionAgent> {
  const agents = new Map<Faction, FactionAgent>();
  for (const faction of state.factions.keys()) {
    agents.set(faction, createFactionAgent(state, faction, gameId));
  }
  return agents;
}

/**
 * Update the game state for a faction agent.
 */
export function updateFactionAgentState(
  agent: FactionAgent,
  newState: GameState
): void {
  agent.toolProvider.updateState(newState);
}

/**
 * Update game state for all agents.
 */
export function updateAllAgentsState(
  agents: Map<Faction, FactionAgent>,
  newState: GameState
): void {
  for (const agent of agents.values()) {
    updateFactionAgentState(agent, newState);
  }
}

/**
 * Get the current game state from a faction agent.
 */
export function getFactionAgentState(agent: FactionAgent): GameState {
  return agent.toolProvider.getState();
}

/**
 * Get an agent for a faction, throwing if not found.
 */
export function getAgent(
  agents: Map<Faction, FactionAgent>,
  faction: Faction
): FactionAgent {
  const agent = agents.get(faction);
  if (!agent) {
    throw new Error(`No agent for faction ${faction}`);
  }
  return agent;
}

/**
 * Check if an agent exists for a faction.
 */
export function hasAgent(
  agents: Map<Faction, FactionAgent>,
  faction: Faction
): boolean {
  return agents.has(faction);
}

