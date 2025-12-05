/**
 * Azure Agent Provider
 *
 * Implements the AgentProvider interface using Azure OpenAI via Vercel AI SDK.
 * Each faction gets its own agent instance with faction-specific instructions.
 *
 * Main orchestrator that coordinates all provider components.
 * Delegates to specialized modules for specific functionality.
 */

import type { AgentProvider } from "../../phases/phase-manager";
import type { AgentRequest, AgentResponse } from "../../phases/types";
import type { Faction, GameState } from "../../types";
import { GameLogger, createLogger } from "../logger";
import {
  createAgentConfig,
  createAzureClient,
  type AzureClient,
  type RequiredAgentConfig,
} from "./azure-client";
import {
  createAllFactionAgents,
  getAgent,
  getFactionAgentState,
  updateAllAgentsState,
} from "./faction-agent";
import { processAgentRequest } from "./request-processor";
import { syncStateFromAgent, syncStateFromAllAgents } from "./state-sync";
import type { AgentConfig, FactionAgent } from "./types";

/**
 * Agent provider that uses Azure OpenAI to make decisions for each faction.
 *
 * Main orchestrator that coordinates:
 * - Azure client management
 * - Faction agent lifecycle
 * - Request processing
 * - State synchronization
 */
export class AzureAgentProvider implements AgentProvider {
  private config: RequiredAgentConfig;
  private azure: AzureClient;
  private agents: Map<Faction, FactionAgent> = new Map();
  private gameState: GameState;
  private logger: GameLogger;
  private gameId: string; // Store gameId to ensure consistency

  constructor(initialState: GameState, config: AgentConfig = {}) {
    // Create and validate configuration
    this.config = createAgentConfig(config);

    // Create Azure OpenAI client
    this.azure = createAzureClient(this.config);

    // Initialize state and logger
    this.gameState = initialState;
    this.gameId = initialState.gameId; // Store gameId at creation time
    this.logger = createLogger(this.config.verbose);

    // Create agents for all factions in the game
    // Enable streaming on tool providers - tools automatically emit events
    this.agents = createAllFactionAgents(initialState, this.gameId);
  }

  /**
   * Get the logger instance.
   */
  getLogger(): GameLogger {
    return this.logger;
  }

  /**
   * Update the game state for all agents.
   */
  updateState(newState: GameState): void {
    this.gameState = newState;
    updateAllAgentsState(this.agents, newState);
  }

  /**
   * Set ornithopter access override for a specific faction.
   * Used during shipment-movement phase to lock ornithopter access at phase start.
   */
  setOrnithopterAccessOverride(
    faction: Faction,
    hasAccess: boolean | undefined
  ): void {
    const agent = this.agents.get(faction);
    if (agent) {
      agent.toolProvider.setOrnithopterAccessOverride(hasAccess);
    }
  }

  /**
   * Get the current game state.
   * Tools may have updated state during execution, so this returns the latest.
   */
  getState(): GameState {
    // Get the latest state from any agent's tool provider
    // (they should all be in sync, but just in case, get from first)
    const firstAgent = this.agents.values().next().value;
    if (firstAgent) {
      return getFactionAgentState(firstAgent);
    }
    return this.gameState;
  }

  /**
   * Get responses from agents for the given requests.
   */
  async getResponses(
    requests: AgentRequest[],
    simultaneous: boolean
  ): Promise<AgentResponse[]> {
    if (simultaneous) {
      // Process all requests in parallel
      const promises = requests.map((req) => this.processRequest(req));
      const responses = await Promise.all(promises);
      // Sync state from all agents that acted (merge their changes)
      this.gameState = syncStateFromAllAgents(this.agents, this.gameState);
      return responses;
    } else {
      // Process requests sequentially
      const responses: AgentResponse[] = [];
      for (const request of requests) {
        const response = await this.processRequest(request);
        responses.push(response);
        // After each agent acts, sync their state to all other agents
        // This ensures the next agent sees the updated state
        this.gameState = syncStateFromAgent(
          this.agents,
          request.factionId,
          this.gameState
        );
      }
      return responses;
    }
  }

  /**
   * Process a single agent request.
   * Delegates to request-processor module.
   */
  private async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const agent = getAgent(this.agents, request.factionId);

    return processAgentRequest({
      agent,
      request,
      azureClient: this.azure,
      config: this.config,
      gameState: this.gameState,
      gameId: this.gameId,
      logger: this.logger,
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an Azure agent provider for a game.
 */
export function createAgentProvider(
  state: GameState,
  config?: AgentConfig
): AzureAgentProvider {
  return new AzureAgentProvider(state, config);
}
