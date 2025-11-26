/**
 * Claude Agent Provider
 *
 * Implements the AgentProvider interface using Claude via Vercel AI SDK.
 * Each faction gets its own agent instance with faction-specific instructions.
 */

import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Faction, GameState } from '../types';
import type { AgentProvider } from '../phases/phase-manager';
import type { AgentRequest, AgentResponse } from '../phases/types';
import { createAgentToolProvider, type ToolSet } from '../tools';
import { getFactionPrompt } from './prompts';
import { FACTION_NAMES } from '../types';
import { GameLogger, createLogger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ClaudeAgentConfig {
  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Whether to log agent interactions */
  verbose?: boolean;
}

interface FactionAgent {
  faction: Faction;
  toolProvider: ReturnType<typeof createAgentToolProvider>;
}

// =============================================================================
// CLAUDE AGENT PROVIDER
// =============================================================================

/**
 * Agent provider that uses Claude to make decisions for each faction.
 */
export class ClaudeAgentProvider implements AgentProvider {
  private config: Required<ClaudeAgentConfig>;
  private agents: Map<Faction, FactionAgent> = new Map();
  private gameState: GameState;
  private logger: GameLogger;

  constructor(initialState: GameState, config: ClaudeAgentConfig = {}) {
    // Use Foundry API key if available, otherwise standard API key
    const apiKey = config.apiKey
      ?? process.env.ANTHROPIC_FOUNDRY_API_KEY
      ?? process.env.ANTHROPIC_API_KEY
      ?? '';

    // Use model from env or default (prefer Haiku for speed/cost)
    const model = config.model
      ?? process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
      ?? process.env.ANTHROPIC_DEFAULT_SONNET_MODEL
      ?? 'claude-haiku-4-5';

    this.config = {
      apiKey,
      model,
      maxTokens: config.maxTokens ?? 1024,
      temperature: config.temperature ?? 0.7,
      verbose: config.verbose ?? false,
    };

    if (!this.config.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.gameState = initialState;
    this.logger = createLogger(this.config.verbose);

    // Create an agent for each faction in the game
    for (const faction of initialState.factions.keys()) {
      this.agents.set(faction, {
        faction,
        toolProvider: createAgentToolProvider(initialState, faction),
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

    try {
      // Build the prompt for Claude
      const systemPrompt = this.buildSystemPrompt(agent.faction);
      const userPrompt = this.buildUserPrompt(request);

      // Get the tools for the current phase
      const tools = agent.toolProvider.getToolsForCurrentPhase();

      // Log the request
      this.logger.agentRequest(agent.faction, request.requestType, request.prompt);
      this.logger.agentThinking(agent.faction);

      // Call Claude
      const result = await generateText({
        model: anthropic(this.config.model),
        system: systemPrompt,
        prompt: userPrompt,
        tools,
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stopWhen: stepCountIs(3), // Allow up to 3 LLM calls (steps)
      });

      // Log tool calls
      const toolCalls = result.steps?.flatMap(s => s.toolCalls ?? []) ?? [];
      for (const toolCall of toolCalls) {
        const toolInput = 'input' in toolCall ? toolCall.input as Record<string, unknown> : {};
        this.logger.agentToolCall(agent.faction, toolCall.toolName, toolInput);
      }

      // Parse the response
      const response = this.parseResponse(request, result);
      const duration = Date.now() - startTime;

      // Log the response
      this.logger.agentResponse(agent.faction, response.actionType, duration, response.reasoning);

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.agentError(request.factionId, errorMsg);

      // Return a pass response on error
      return {
        factionId: request.factionId,
        actionType: 'PASS',
        data: {},
        passed: true,
        reasoning: `Error occurred: ${errorMsg}`,
      };
    }
  }

  /**
   * Build the system prompt for a faction.
   */
  private buildSystemPrompt(faction: Faction): string {
    const factionPrompt = getFactionPrompt(faction);

    return `You are an AI playing the board game Dune (GF9 edition) as the ${FACTION_NAMES[faction]} faction.

${factionPrompt}

## Game Rules Summary
- The goal is to control 3 strongholds (or 4 if allied) at the end of any phase
- Spice is the currency - used for shipping forces, buying cards, and reviving troops
- Battles are resolved simultaneously with hidden battle plans
- Each faction has unique abilities that give them advantages

## Your Decision Process
1. Analyze the current game state using the view tools
2. Consider your faction's strategic position and victory path
3. Make decisions that advance your position while denying opponents
4. Use your faction's special abilities when advantageous

## Response Format
- Use the available tools to take actions
- If you cannot or choose not to act, use a "pass" tool
- Explain your reasoning briefly after taking action

Remember: You are playing to WIN. Make strategic decisions based on the current game state.`;
  }

  /**
   * Build the user prompt from a request.
   */
  private buildUserPrompt(request: AgentRequest): string {
    const contextStr = Object.entries(request.context)
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
      .join('\n');

    return `${request.prompt}

Current Context:
${contextStr}

Available Actions: ${request.availableActions.join(', ')}

Decide what to do. Use the appropriate tool to take your action.`;
  }

  /**
   * Parse Claude's response into an AgentResponse.
   */
  private parseResponse(
    request: AgentRequest,
    result: Awaited<ReturnType<typeof generateText>>
  ): AgentResponse {
    // Check if any tools were called
    const toolCalls = result.steps?.flatMap(s => s.toolCalls ?? []) ?? [];
    const toolResults = result.steps?.flatMap(s => s.toolResults ?? []) ?? [];

    if (toolCalls.length > 0) {
      const lastToolCall = toolCalls[toolCalls.length - 1];
      const lastToolResult = toolResults[toolResults.length - 1];

      // Check if it was a pass action
      const isPass = lastToolCall.toolName.includes('pass');

      // In AI SDK 5.x, tool call inputs are in the 'input' property
      const toolInput = 'input' in lastToolCall
        ? lastToolCall.input as Record<string, unknown>
        : {};

      // Tool results contain the actual returned data (e.g., cost, success, etc.)
      // Our tools return { success, data: {...}, message, stateUpdated }
      // AI SDK 5.x tool results have 'output' property containing the tool return value
      const rawOutput = lastToolResult && 'output' in lastToolResult
        ? lastToolResult.output as { data?: Record<string, unknown> }
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
      actionType: 'PASS',
      data: {},
      passed: true,
      reasoning: result.text || 'No action taken',
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a Claude agent provider for a game.
 */
export function createClaudeAgentProvider(
  state: GameState,
  config?: ClaudeAgentConfig
): ClaudeAgentProvider {
  return new ClaudeAgentProvider(state, config);
}
