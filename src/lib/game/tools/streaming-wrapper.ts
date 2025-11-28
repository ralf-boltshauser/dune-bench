/**
 * Streaming Tool Wrapper
 *
 * Wraps tools to automatically emit streaming events when they execute.
 * This provides transparent tool call/result streaming without requiring
 * manual event emission in the agent provider.
 *
 * ## Architecture
 *
 * ```
 * Agent Provider
 *     │
 *     └─ generateText() with wrapped tools
 *            │
 *            ├─ Tool execute called
 *            │      │
 *            │      ├─ EMIT: AGENT_TOOL_CALL (before)
 *            │      ├─ Execute original tool
 *            │      ├─ EMIT: AGENT_TOOL_RESULT (after)
 *            │      └─ Return result
 *            │
 *            └─ State mutations (already emit delta events)
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { wrapToolsForStreaming } from './streaming-wrapper';
 *
 * const tools = createToolSetForPhase(ctx, phase);
 * const streamingTools = wrapToolsForStreaming(tools, gameId, faction);
 * ```
 */

import { tool, type Tool, type ToolCallOptions } from 'ai';
import type { Faction } from '../types';
import { eventStreamer } from '../stream/event-streamer';
import { AgentActivityEvent } from '../stream/types';
import type { ToolSet } from './registry';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for streaming tool wrapper.
 */
export interface StreamingConfig {
  /** Game ID for event emission */
  gameId: string;
  /** Faction executing the tools */
  faction: Faction;
  /** Whether to emit events (can be disabled for testing) */
  enabled?: boolean;
}

/**
 * Metadata attached to streaming-wrapped tools.
 */
export interface StreamingToolMeta {
  originalName: string;
  gameId: string;
  faction: Faction;
}

// =============================================================================
// WRAPPER IMPLEMENTATION
// =============================================================================

/**
 * Wrap a set of tools to automatically emit streaming events.
 *
 * @param tools - Original tool set
 * @param config - Streaming configuration
 * @returns Wrapped tools that emit events on execution
 */
export function wrapToolsForStreaming(
  tools: ToolSet,
  config: StreamingConfig
): ToolSet {
  const { gameId, faction, enabled = true } = config;

  if (!enabled) {
    return tools;
  }

  const wrappedTools: ToolSet = {};

  for (const [name, originalTool] of Object.entries(tools)) {
    wrappedTools[name] = createStreamingTool(originalTool, {
      originalName: name,
      gameId,
      faction,
    });
  }

  return wrappedTools;
}

/**
 * Create a streaming-enabled version of a single tool.
 *
 * @param originalTool - The original tool to wrap
 * @param meta - Streaming metadata
 * @returns Wrapped tool that emits events
 */
function createStreamingTool(
  originalTool: Tool<any, any>,
  meta: StreamingToolMeta
): Tool<any, any> {
  const { originalName, gameId, faction } = meta;

  // Extract the tool's configuration
  // In AI SDK 5.x, tools have description, inputSchema, and execute
  const description = originalTool.description ?? '';
  const inputSchema = originalTool.inputSchema;

  // Create wrapped execute function
  const wrappedExecute = async (params: unknown, options?: ToolCallOptions) => {
    // 1. Emit TOOL_CALL event before execution
    await eventStreamer.emit(AgentActivityEvent.AGENT_TOOL_CALL, gameId, {
      faction,
      toolName: originalName,
      input: params as Record<string, unknown>,
    });

    // 2. Execute the original tool
    let result: unknown;
    let error: Error | null = null;

    try {
      // AI SDK tools have an execute function we need to call
      if (typeof originalTool.execute === 'function') {
        // Provide empty options if not passed (options is required by AI SDK)
        const execOptions = options ?? ({} as ToolCallOptions);
        result = await originalTool.execute(params, execOptions);
      } else {
        throw new Error(`Tool ${originalName} has no execute function`);
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      result = {
        success: false,
        error: { code: 'EXECUTION_ERROR', message: error.message },
        message: `Tool execution failed: ${error.message}`,
        stateUpdated: false,
      };
    }

    // 3. Emit TOOL_RESULT event after execution
    await eventStreamer.emit(AgentActivityEvent.AGENT_TOOL_RESULT, gameId, {
      faction,
      toolName: originalName,
      result: result as Record<string, unknown>,
    });

    // 4. Re-throw if there was an error (so AI SDK sees it)
    if (error) {
      throw error;
    }

    return result;
  };

  // Create a new tool with the wrapped execute function
  // We need to use tool() to maintain AI SDK compatibility
  return tool({
    description,
    inputSchema: inputSchema ?? z.object({}),
    execute: wrappedExecute,
  });
}

// =============================================================================
// CONVENIENCE FACTORY
// =============================================================================

/**
 * Create a streaming tool provider factory.
 * Returns a function that wraps any tool set for a specific game/faction.
 */
export function createStreamingToolWrapper(gameId: string, faction: Faction) {
  return (tools: ToolSet): ToolSet =>
    wrapToolsForStreaming(tools, { gameId, faction });
}
