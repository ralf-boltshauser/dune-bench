/**
 * Azure Agent Provider
 *
 * Implements the AgentProvider interface using Azure OpenAI via Vercel AI SDK.
 * Each faction gets its own agent instance with faction-specific instructions.
 */

import { createAzure } from "@ai-sdk/azure";
import { generateText, stepCountIs, type GenerateTextResult } from "ai";
import type { AgentProvider } from "../phases/phase-manager";
import type { AgentRequest, AgentResponse } from "../phases/types";
import { eventStreamer } from "../stream/event-streamer";
import { AgentActivityEvent } from "../stream/types";
import { createAgentToolProvider } from "../tools";
import type { Faction, GameState } from "../types";
import { FACTION_NAMES } from "../types";
import { GameLogger, createLogger } from "./logger";
import {
  getAzureApiKey,
  getAzureApiVersion,
  getAzureModel,
  getAzureResourceName,
} from "./openai-config";
import { getFactionPrompt } from "./prompts";

// =============================================================================
// GENERAL AGENT SYSTEM PROMPT
// =============================================================================

/**
 * General system prompt preamble that is prepended to every agent call.
 *
 * This defines the core behavior and expectations for all Dune agents.
 * Modify this function to update the general agent instructions for all factions.
 */
function getGeneralAgentSystemPrompt(): string {
  return `You are a Dune agent playing the board game Dune (GF9 edition). Your goal is to WIN.

  You win dune by controlling 3 strongholds (or 4 if allied) at the end of a turn. (In the mentat pause phase). 

  Try to control strongholds, win battles, and collect spice.

## Core Principles
- **Win the game**: Make decisions that advance your path to victory
- **Use tools to make informed decisions**: You have access to view tools (view_game_state, view_territory, view_my_faction, etc.) - USE THEM to gather information before making decisions
- **Think strategically**: Consider the current game state, your faction's position, and opportunities
- **Be proactive**: Don't just pass - actively seek advantages through movement, resource collection, and strategic positioning

## Multi-Step Decision Making
You can make multiple tool calls in sequence (up to 10 LLM calls):
1. **Information Gathering**: Call view tools first (view_game_state, view_territory, view_my_faction) to gather information
2. **Analysis**: Use the information from view tools to analyze opportunities
3. **Action**: Call action tools (move_forces, ship_forces, etc.) to execute your strategy

Example workflow:
- Step 1: Call view_game_state to see spice locations and board state
- Step 2: Call view_territory for a specific territory with spice
- Step 3: Call move_forces to move toward that territory

Use your multiple steps wisely - gather information before taking action.

## Decision-Making Process
1. **Gather Information**: Use view tools to understand the current game state, spice locations, territory status, and opponent positions
2. **Analyze Opportunities**: Identify strategic opportunities (spice collection, stronghold control, resource management)
3. **Take Action**: Use the appropriate action tools to execute your strategy
4. **Explain Reasoning**: After taking action, briefly explain your strategic reasoning

Remember: You are playing to WIN. Passive play (always passing) will not lead to victory. Use your tools to make informed, strategic decisions.`;
}

// =============================================================================
// TYPES
// =============================================================================

export interface AgentConfig {
  /** Azure OpenAI API key (defaults to OPENAI_API_KEY or AZURE_API_KEY env var) */
  apiKey?: string;
  /** Model/deployment name to use (defaults to gpt-5-mini) */
  model?: string;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Temperature for generation (0-1) - Note: Not used with reasoning models (responses API) */
  temperature?: number;
  /** Whether to log agent interactions */
  verbose?: boolean;
}

interface FactionAgent {
  faction: Faction;
  toolProvider: ReturnType<typeof createAgentToolProvider>;
}

// =============================================================================
// AZURE AGENT PROVIDER
// =============================================================================

/**
 * Agent provider that uses Azure OpenAI to make decisions for each faction.
 *
 * Uses the centralized Azure OpenAI configuration from './openai-config'.
 * Automatically loads environment variables from .env file.
 */
export class AzureAgentProvider implements AgentProvider {
  private config: Required<AgentConfig>;
  private azure: ReturnType<typeof createAzure>;
  private agents: Map<Faction, FactionAgent> = new Map();
  private gameState: GameState;
  private logger: GameLogger;
  private gameId: string; // Store gameId to ensure consistency

  constructor(initialState: GameState, config: AgentConfig = {}) {
    // Use API key from config or environment variable
    const apiKey = config.apiKey ?? getAzureApiKey();

    // Use model from config or default
    const model = config.model ?? getAzureModel();

    this.config = {
      apiKey,
      model,
      maxTokens: config.maxTokens ?? 1024,
      temperature: config.temperature ?? 0.7,
      verbose: config.verbose ?? false,
    };

    if (!this.config.apiKey) {
      throw new Error("OPENAI_API_KEY or AZURE_API_KEY is required");
    }

    // Create Azure OpenAI client (using centralized config)
    this.azure = createAzure({
      resourceName: getAzureResourceName(),
      apiKey: this.config.apiKey,
      apiVersion: getAzureApiVersion(),
    });

    this.gameState = initialState;
    this.gameId = initialState.gameId; // Store gameId at creation time
    this.logger = createLogger(this.config.verbose);

    // Create an agent for each faction in the game
    // Enable streaming on tool providers - tools automatically emit events
    for (const faction of initialState.factions.keys()) {
      this.agents.set(faction, {
        faction,
        toolProvider: createAgentToolProvider(initialState, faction, {
          streaming: { gameId: this.gameId },
        }),
      });
    }
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
    for (const agent of this.agents.values()) {
      agent.toolProvider.updateState(newState);
    }
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
      return firstAgent.toolProvider.getState();
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
      this.syncStateFromAllAgents();
      return responses;
    } else {
      // Process requests sequentially
      const responses: AgentResponse[] = [];
      for (const request of requests) {
        const response = await this.processRequest(request);
        responses.push(response);
        // After each agent acts, sync their state to all other agents
        // This ensures the next agent sees the updated state
        this.syncStateFromAgent(request.factionId);
      }
      return responses;
    }
  }

  /**
   * Sync state from a specific agent to all other agents.
   * Called after an agent takes an action.
   */
  private syncStateFromAgent(factionId: Faction): void {
    const agent = this.agents.get(factionId);
    if (!agent) return;

    const updatedState = agent.toolProvider.getState();
    this.gameState = updatedState;

    // Update all other agents with this state
    for (const [faction, otherAgent] of this.agents) {
      if (faction !== factionId) {
        otherAgent.toolProvider.updateState(updatedState);
      }
    }
  }

  /**
   * Sync state from all agents (for simultaneous actions).
   * Merges changes by using the state from the last agent in iteration order.
   * Note: This is imperfect for true simultaneous actions but works for most cases.
   */
  private syncStateFromAllAgents(): void {
    // Get the most recent state from any agent that acted
    // Since tools update state, we need to find which agent has the latest
    let latestState = this.gameState;
    for (const agent of this.agents.values()) {
      latestState = agent.toolProvider.getState();
    }

    // Sync to all
    this.gameState = latestState;
    for (const agent of this.agents.values()) {
      agent.toolProvider.updateState(latestState);
    }
  }

  /**
   * Process a single agent request.
   */
  private async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const agent = this.agents.get(request.factionId);
    if (!agent) {
      throw new Error(`No agent for faction ${request.factionId}`);
    }

    const startTime = Date.now();

    // Build the prompt for OpenAI (declare outside try for retry access)
    const systemPrompt = this.buildSystemPrompt(agent.faction);
    const userPrompt = this.buildUserPrompt(request);

    // Get the tools for the current phase (declare outside try for retry access)
    const tools = agent.toolProvider.getToolsForCurrentPhase();

    // Declare result outside try for retry access
    let result;

    try {
      // Log the request
      this.logger.agentRequest(
        agent.faction,
        request.requestType,
        request.prompt
      );
      this.logger.agentThinking(agent.faction);

      // Emit AGENT_THINKING event
      await eventStreamer.emit(AgentActivityEvent.AGENT_THINKING, this.gameId, {
        faction: agent.faction,
        requestType: request.requestType,
        phase: this.gameState.phase,
        prompt: request.prompt,
      });

      // Suppress AI SDK schema serialization warnings during generateText
      // These are non-fatal warnings that generate noisy logs
      const originalWarn = console.warn;
      const originalError = console.error;
      console.warn = (...args: unknown[]) => {
        const message = args[0]?.toString() || "";
        if (
          message.includes("Transforms cannot be represented in JSON Schema")
        ) {
          return; // Suppress this specific warning
        }
        originalWarn.apply(console, args);
      };
      console.error = (...args: unknown[]) => {
        const message = args[0]?.toString() || "";
        if (
          message.includes("Transforms cannot be represented in JSON Schema")
        ) {
          return; // Suppress this specific error
        }
        originalError.apply(console, args);
      };
      try {
        // Call Azure OpenAI using the responses API
        // Note: Reasoning models (responses API) don't support temperature parameter
        result = await generateText({
          model: this.azure.responses(this.config.model),
          system: systemPrompt,
          prompt: userPrompt,
          tools,
          maxOutputTokens: this.config.maxTokens,
          stopWhen: stepCountIs(10), // Allow up to 10 LLM call (step)
        });
      } finally {
        // Restore original console methods
        console.warn = originalWarn;
        console.error = originalError;
      }

      // Log tool calls (events are emitted automatically by streaming-wrapped tools)
      const toolCalls = result.steps?.flatMap((s) => s.toolCalls ?? []) ?? [];
      for (const toolCall of toolCalls) {
        const toolInput =
          "input" in toolCall
            ? (toolCall.input as Record<string, unknown>)
            : {};
        this.logger.agentToolCall(agent.faction, toolCall.toolName, toolInput);
      }

      // Parse the response
      const response = this.parseResponse(request, result);
      const duration = Date.now() - startTime;

      // Emit AGENT_DECISION event
      await eventStreamer.emit(AgentActivityEvent.AGENT_DECISION, this.gameId, {
        faction: agent.faction,
        actionType: response.actionType,
        reasoning: response.reasoning,
        data: response.data,
      });

      // Log the response
      this.logger.agentResponse(
        agent.faction,
        response.actionType,
        duration,
        response.reasoning
      );

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // Filter out non-fatal AI SDK schema serialization warnings
      // These are warnings that don't prevent tools from working
      if (
        errorMsg.includes("Transforms cannot be represented in JSON Schema")
      ) {
        // The schema serialization error occurs when AI SDK tries to convert Zod schemas to JSON Schema.
        // This happens during generateText() call setup, so retrying won't help - it will fail again.
        // The error suggests a tool schema has transforms/refinements that can't be serialized.
        // Instead of retrying (which will fail), throw a descriptive error that will be caught by the phase manager
        // and trigger the retry limit, preventing infinite loops.
        const error = new Error(
          `Schema serialization error for ${request.factionId}: ${errorMsg}. ` +
            `This indicates a tool schema has transforms that can't be serialized to JSON Schema. ` +
            `Check tool schemas for .refine() or .transform() calls.`
        );
        error.name = "SchemaSerializationError";
        throw error; // Let it propagate - phase manager will catch and handle with retry limit
      }

      this.logger.agentError(request.factionId, errorMsg);

      // Return a pass response on error
      return {
        factionId: request.factionId,
        actionType: "PASS",
        data: {},
        passed: true,
        reasoning: `Error occurred: ${errorMsg}`,
      };
    }
  }

  /**
   * Build the system prompt for a faction.
   *
   * Preprends the general agent system prompt (defined once above) to faction-specific instructions.
   */
  private buildSystemPrompt(faction: Faction): string {
    const generalPrompt = getGeneralAgentSystemPrompt();
    const factionPrompt = getFactionPrompt(faction);

    return `${generalPrompt}

---

## Faction-Specific Instructions

You are playing as the ${FACTION_NAMES[faction]} faction.

${factionPrompt}

## Game Rules Summary
- The goal is to control 3 strongholds (or 4 if allied) at the end of any phase
- Spice is the currency - used for shipping forces, buying cards, and reviving troops
- Battles are resolved simultaneously with hidden battle plans
- Each faction has unique abilities that give them advantages

## Response Format
- Use the available tools to take actions
- If you cannot or choose not to act, use a "pass" tool
- Explain your reasoning briefly after taking action`;
  }

  /**
   * Build the user prompt from a request.
   */
  private buildUserPrompt(request: AgentRequest): string {
    const contextStr = Object.entries(request.context)
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
      .join("\n");

    return `${request.prompt}

Current Context:
${contextStr}

Available Actions: ${request.availableActions.join(", ")}

Decide what to do. Use the appropriate tool to take your action.`;
  }

  /**
   * Parse OpenAI's response into an AgentResponse.
   */
  private parseResponse(
    request: AgentRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: GenerateTextResult<any, any>
  ): AgentResponse {
    // Check if any tools were called
    const toolCalls = result.steps?.flatMap((s) => s.toolCalls ?? []) ?? [];
    const toolResults = result.steps?.flatMap((s) => s.toolResults ?? []) ?? [];

    if (toolCalls.length > 0) {
      const lastToolCall = toolCalls[toolCalls.length - 1];
      const lastToolResult = toolResults[toolResults.length - 1];

      // Check if it was a pass action
      const isPass = lastToolCall.toolName.includes("pass");

      // In AI SDK 5.x, tool call inputs are in the 'input' property
      const toolInput =
        "input" in lastToolCall
          ? (lastToolCall.input as Record<string, unknown>)
          : {};

      // Tool results contain the actual returned data (e.g., cost, success, etc.)
      // Our tools return { success, data: {...}, message, stateUpdated }
      // AI SDK 5.x tool results have 'output' property containing the tool return value
      const rawOutput =
        lastToolResult && "output" in lastToolResult
          ? (lastToolResult.output as { data?: Record<string, unknown> })
          : {};
      // Extract the nested 'data' property from our tool result format
      const toolResultData = rawOutput?.data ?? {};

      // Merge tool input with tool result data (result takes precedence for computed values like cost)
      const mergedData = { ...toolInput, ...toolResultData };

      return {
        factionId: request.factionId,
        actionType: lastToolCall.toolName.toUpperCase(),
        data: mergedData,
        passed: isPass,
        reasoning: result.text || undefined,
      };
    }

    // No tool calls - treat as pass
    return {
      factionId: request.factionId,
      actionType: "PASS",
      data: {},
      passed: true,
      reasoning: result.text || "No action taken",
    };
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
