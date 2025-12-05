/**
 * Request Processor
 *
 * Handles processing of a single agent request end-to-end.
 * Single source of truth for request processing logic.
 */

import { generateText, stepCountIs, type GenerateTextResult } from "ai";
import type { AgentRequest, AgentResponse } from "../../phases/types";
import { eventStreamer } from "../../stream/event-streamer";
import { AgentActivityEvent } from "../../stream/types";
import type { Faction, GameState } from "../../types";
import type { GameLogger } from "../logger";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-builder";
import { suppressSchemaWarnings } from "./console-suppress";
import { handleAgentError, isSchemaSerializationError, isReasoningAPIError } from "./error-handler";
import { parseAgentResponse, extractToolCalls } from "./response-handler";
import type { AgentConfig, FactionAgent } from "./types";
import type { AzureClient, RequiredAgentConfig } from "./azure-client";

/**
 * Options for processing an agent request.
 */
export interface ProcessRequestOptions {
  /** The faction agent making the request */
  agent: FactionAgent;
  /** The agent request to process */
  request: AgentRequest;
  /** Azure OpenAI client */
  azureClient: AzureClient;
  /** Agent configuration */
  config: RequiredAgentConfig;
  /** Current game state */
  gameState: GameState;
  /** Game ID for event streaming */
  gameId: string;
  /** Logger instance */
  logger: GameLogger;
}

/**
 * Process a single agent request end-to-end.
 *
 * Handles:
 * - Prompt building
 * - Tool preparation
 * - AI SDK call
 * - Logging
 * - Event emission
 * - Response parsing
 * - Error handling
 */
export async function processAgentRequest(
  options: ProcessRequestOptions
): Promise<AgentResponse> {
  const {
    agent,
    request,
    azureClient,
    config,
    gameState,
    gameId,
    logger,
  } = options;

  const startTime = Date.now();

  // Build prompts (declare outside try for retry access)
  const systemPrompt = buildSystemPrompt(agent.faction);
  const userPrompt = buildUserPrompt(request);

  // Get tools for current phase (declare outside try for retry access)
  const tools = agent.toolProvider.getToolsForCurrentPhase();

  // Declare result outside try for retry access
  let result: GenerateTextResult<any, any>;

  try {
    // Log the request
    logger.agentRequest(agent.faction, request.requestType, request.prompt);
    logger.agentThinking(agent.faction);

    // Emit AGENT_THINKING event
    await eventStreamer.emit(AgentActivityEvent.AGENT_THINKING, gameId, {
      faction: agent.faction,
      requestType: request.requestType,
      phase: gameState.phase,
      prompt: request.prompt,
    });

    // Suppress AI SDK schema serialization warnings during generateText
    const restoreConsole = suppressSchemaWarnings();
    try {
      // Call Azure OpenAI using the responses API
      // Note: Reasoning models (responses API) don't support temperature parameter
      result = await generateText({
        model: azureClient.responses(config.model),
        system: systemPrompt,
        prompt: userPrompt,
        tools,
        maxOutputTokens: config.maxTokens,
        stopWhen: stepCountIs(10), // Allow up to 10 LLM call (step)
      });
    } finally {
      // Restore original console methods
      restoreConsole();
    }

    // Log tool calls (events are emitted automatically by streaming-wrapped tools)
    const toolCalls = extractToolCalls(result);
    for (const toolCall of toolCalls) {
      const toolInput =
        "input" in toolCall
          ? (toolCall.input as Record<string, unknown>)
          : {};
      logger.agentToolCall(agent.faction, toolCall.toolName, toolInput);
    }

    // Parse the response
    const response = parseAgentResponse(request, result);
    const duration = Date.now() - startTime;

    // Emit AGENT_DECISION event
    await eventStreamer.emit(AgentActivityEvent.AGENT_DECISION, gameId, {
      faction: agent.faction,
      actionType: response.actionType,
      reasoning: response.reasoning,
      data: response.data,
    });

    // Log the response
    logger.agentResponse(
      agent.faction,
      response.actionType,
      duration,
      response.reasoning
    );

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Log the error (unless it's a schema serialization error that will be re-thrown)
    // Reasoning API errors are logged but non-fatal
    if (!isSchemaSerializationError(error)) {
      // Add detailed logging for reasoning API errors
      if (isReasoningAPIError(error)) {
        console.error(
          `\n❌ [Azure OpenAI] Reasoning API error for ${request.factionId}:`
        );
        console.error(`   Request Type: ${request.requestType}`);
        console.error(`   Phase: ${gameState.phase}`);
        console.error(`   Error: ${errorMsg}`);
        if (error instanceof Error && error.stack) {
          console.error(`   Stack: ${error.stack}`);
        }
      }
      logger.agentError(request.factionId, errorMsg);
    }

    // Handle error (may throw or return pass response)
    return handleAgentError(error, request.factionId);
  }
}

