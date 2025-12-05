/**
 * Response Handler
 *
 * Parses AI SDK responses into AgentResponse format.
 */

import type { GenerateTextResult } from "ai";
import type { AgentRequest, AgentResponse } from "../../phases/types";

/**
 * Extract all tool calls from a generateText result.
 */
export function extractToolCalls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: GenerateTextResult<any, any>
) {
  return result.steps?.flatMap((s) => s.toolCalls ?? []) ?? [];
}

/**
 * Extract all tool results from a generateText result.
 */
export function extractToolResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: GenerateTextResult<any, any>
) {
  return result.steps?.flatMap((s) => s.toolResults ?? []) ?? [];
}

/**
 * Check if a tool name indicates a pass action.
 */
export function isPassAction(toolName: string): boolean {
  return toolName.includes("pass");
}

/**
 * Merge tool input with tool result data.
 * Result data takes precedence for computed values like cost.
 */
export function mergeToolData(
  toolInput: Record<string, unknown>,
  toolResultData: Record<string, unknown>
): Record<string, unknown> {
  return { ...toolInput, ...toolResultData };
}

/**
 * Parse OpenAI's response into an AgentResponse.
 */
export function parseAgentResponse(
  request: AgentRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: GenerateTextResult<any, any>
): AgentResponse {
  // Check if any tools were called
  const toolCalls = extractToolCalls(result);
  const toolResults = extractToolResults(result);

  if (toolCalls.length > 0) {
    const lastToolCall = toolCalls[toolCalls.length - 1];
    const lastToolResult = toolResults[toolResults.length - 1];

    // Check if it was a pass action
    const isPass = isPassAction(lastToolCall.toolName);

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
    const mergedData = mergeToolData(toolInput, toolResultData);

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

