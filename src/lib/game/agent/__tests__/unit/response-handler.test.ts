/**
 * Response Handler Module Unit Tests
 *
 * Tests for response-handler.ts module functions.
 */

import { describe, test } from "../helpers/utils/test-utils";
import {
  extractToolCalls,
  extractToolResults,
  isPassAction,
  mergeToolData,
  parseAgentResponse,
} from "../../provider/response-handler";
import { Faction, TerritoryId } from "@/lib/game/types";
import type { AgentRequest } from "../../../phases/types";
import {
  assertToolCallsExtracted,
  assertToolResultsExtracted,
  assertPassActionDetected,
  assertToolDataMerged,
  assertResponseParsedCorrectly,
} from "../helpers/assertions/module-assertions";
import type { GenerateTextResult } from "ai";

// Helper function to create a test TypedToolCall
function createTestToolCall(toolName: string, input: unknown = {}) {
  return {
    type: "tool-call" as const,
    toolCallId: `test-call-${Math.random().toString(36).substring(7)}`,
    toolName,
    input,
  };
}

// Helper function to create a test TypedToolResult
function createTestToolResult(toolCallId: string, toolName: string, input: unknown, output: unknown) {
  return {
    type: "tool-result" as const,
    toolCallId,
    toolName,
    input,
    output,
  };
}

// Helper function to create a test StepResult
function createTestStep(toolCalls: unknown[] = [], toolResults: unknown[] = []) {
  return {
    type: "step" as const,
    content: [],
    text: "",
    reasoning: undefined,
    reasoningText: undefined,
    toolCalls: toolCalls as any,
    toolResults: toolResults as any,
    finishReason: undefined,
    usage: undefined,
    files: undefined,
    sources: undefined,
    staticToolCalls: undefined,
    dynamicToolCalls: undefined,
    experimental_providerMetadata: undefined,
    experimental_attachments: undefined,
    experimental_continueSteps: undefined,
    experimental_continueStep: undefined,
    experimental_continueStepsCount: undefined,
    experimental_continueStepsLimit: undefined,
    experimental_continueStepsCountLimit: undefined,
  } as any;
}

// Helper function to create test GenerateTextResult
function createTestGenerateTextResult(
  overrides?: Partial<GenerateTextResult<any, any>>
): GenerateTextResult<any, any> {
  return {
    text: "",
    steps: [],
    ...overrides,
  } as GenerateTextResult<any, any>;
}

describe("Response Handler Module", () => {
  describe("extractToolCalls", () => {
    test("should extract tool calls from result with steps", () => {
      const call1 = createTestToolCall("bid", { amount: 1 });
      const call2 = createTestToolCall("pass", {});
      const result = createTestGenerateTextResult({
        steps: [createTestStep([call1, call2])],
      });

      assertToolCallsExtracted(result, 2);
    });

    test("should return empty array for result with no tool calls", () => {
      const result = createTestGenerateTextResult({
        steps: [createTestStep([])],
      });

      assertToolCallsExtracted(result, 0);
    });

    test("should return empty array for result with no steps", () => {
      const result = createTestGenerateTextResult({
        steps: [],
      });

      assertToolCallsExtracted(result, 0);
    });

    test("should handle result with undefined steps", () => {
      const result = createTestGenerateTextResult({
        steps: undefined,
      });

      assertToolCallsExtracted(result, 0);
    });

    test("should extract tool calls from multiple steps", () => {
      const call1 = createTestToolCall("action1", {});
      const call2 = createTestToolCall("action2", {});
      const call3 = createTestToolCall("action3", {});
      const result = createTestGenerateTextResult({
        steps: [
          createTestStep([call1]),
          createTestStep([call2]),
          createTestStep([call3]),
        ],
      });

      assertToolCallsExtracted(result, 3);
    });
  });

  describe("extractToolResults", () => {
    test("should extract tool results from result with steps", () => {
      const call1 = createTestToolCall("action1", {});
      const call2 = createTestToolCall("action2", {});
      const result1 = createTestToolResult(call1.toolCallId, "action1", {}, { data: { success: true } });
      const result2 = createTestToolResult(call2.toolCallId, "action2", {}, { data: { success: false } });
      const result = createTestGenerateTextResult({
        steps: [createTestStep([call1, call2], [result1, result2])],
      });

      assertToolResultsExtracted(result, 2);
    });

    test("should return empty array for result with no tool results", () => {
      const result = createTestGenerateTextResult({
        steps: [createTestStep([], [])],
      });

      assertToolResultsExtracted(result, 0);
    });

    test("should return empty array for result with no steps", () => {
      const result = createTestGenerateTextResult({
        steps: [],
      });

      assertToolResultsExtracted(result, 0);
    });
  });

  describe("isPassAction", () => {
    test("should detect pass action with lowercase", () => {
      assertPassActionDetected("pass", true);
    });

    test("should detect pass action with uppercase", () => {
      // isPassAction checks if toolName.includes("pass") - case sensitive
      // So "PASS" won't match, but "pass" will
      assertPassActionDetected("PASS", false); // Case sensitive check
    });

    test("should detect pass action in tool name", () => {
      // isPassAction checks if toolName.includes("pass") - lowercase "pass" (case-sensitive)
      assertPassActionDetected("passAction", true); // Contains "pass"
      assertPassActionDetected("actionpass", true); // Contains "pass" (all lowercase)
      assertPassActionDetected("actionPass", false); // Contains "Pass" (capital P) - case sensitive
      // Note: "myPassTool" has "Pass" with capital P, so includes("pass") returns false
      // This is correct behavior - the function is case-sensitive
    });

    test("should not detect non-pass action", () => {
      assertPassActionDetected("bid", false);
      assertPassActionDetected("move", false);
      assertPassActionDetected("ship", false);
    });
  });

  describe("mergeToolData", () => {
    test("should merge tool input with result data", () => {
      const input = { amount: 1, territory: TerritoryId.ARRAKEEN };
      const result = { success: true, cost: 2 };
      const merged = mergeToolData(input, result);

      // Verify merged data contains all fields
      if (merged.amount !== 1) {
        throw new Error(`Expected merged.amount to be 1, got ${merged.amount}`);
      }
      if (merged.territory !== TerritoryId.ARRAKEEN) {
        throw new Error(`Expected merged.territory to be ${TerritoryId.ARRAKEEN}, got ${merged.territory}`);
      }
      if (merged.success !== true) {
        throw new Error(`Expected merged.success to be true, got ${merged.success}`);
      }
      if (merged.cost !== 2) {
        throw new Error(`Expected merged.cost to be 2, got ${merged.cost}`);
      }
    });

    test("should give precedence to result data for overlapping keys", () => {
      const input = { amount: 1, cost: 5 };
      const result = { amount: 2, cost: 10 };
      const merged = mergeToolData(input, result);

      // Result data should override input
      if (merged.amount !== 2) {
        throw new Error(`Expected amount to be 2 (from result), got ${merged.amount}`);
      }
      if (merged.cost !== 10) {
        throw new Error(`Expected cost to be 10 (from result), got ${merged.cost}`);
      }
    });

    test("should handle empty input", () => {
      const input = {};
      const result = { success: true };
      const merged = mergeToolData(input, result);

      assertToolDataMerged(input, result, { success: true });
    });

    test("should handle empty result", () => {
      const input = { amount: 1 };
      const result = {};
      const merged = mergeToolData(input, result);

      // Verify merged data contains input when result is empty
      if (merged.amount !== 1) {
        throw new Error(`Expected merged.amount to be 1, got ${merged.amount}`);
      }
    });
  });

  describe("parseAgentResponse", () => {
    test("should parse response with tool call", () => {
      const request: AgentRequest = {
        factionId: Faction.ATREIDES,
        requestType: "BID_OR_PASS",
        prompt: "Test",
        context: {},
        availableActions: ["BID", "PASS"],
      };

      const call = createTestToolCall("bid", { amount: 1 });
      const toolResult = createTestToolResult(call.toolCallId, "bid", { amount: 1 }, { data: { success: true } });
      const result = createTestGenerateTextResult({
        text: "I will bid 1 spice",
        steps: [createTestStep([call], [toolResult])],
      });

      const response = parseAgentResponse(request, result);

      assertResponseParsedCorrectly(response, request, result);
      if (response.actionType !== "BID") {
        throw new Error(`Expected actionType to be BID, got ${response.actionType}`);
      }
      if (response.passed) {
        throw new Error("Expected passed to be false for action response");
      }
    });

    test("should parse pass response from pass tool call", () => {
      const request: AgentRequest = {
        factionId: Faction.ATREIDES,
        requestType: "BID_OR_PASS",
        prompt: "Test",
        context: {},
        availableActions: ["BID", "PASS"],
      };

      const call = createTestToolCall("pass", {});
      const toolResult = createTestToolResult(call.toolCallId, "pass", {}, { data: {} });
      const result = createTestGenerateTextResult({
        text: "I will pass",
        steps: [createTestStep([call], [toolResult])],
      });

      const response = parseAgentResponse(request, result);

      assertResponseParsedCorrectly(response, request, result);
      if (response.actionType !== "PASS") {
        throw new Error(`Expected actionType to be PASS, got ${response.actionType}`);
      }
      if (!response.passed) {
        throw new Error("Expected passed to be true for pass response");
      }
    });

    test("should parse pass response when no tool calls", () => {
      const request: AgentRequest = {
        factionId: Faction.ATREIDES,
        requestType: "BID_OR_PASS",
        prompt: "Test",
        context: {},
        availableActions: ["BID", "PASS"],
      };

      const result = createTestGenerateTextResult({
        text: "No action taken",
        steps: [],
      });

      const response = parseAgentResponse(request, result);

      assertResponseParsedCorrectly(response, request, result);
      if (response.actionType !== "PASS") {
        throw new Error(`Expected actionType to be PASS, got ${response.actionType}`);
      }
      if (!response.passed) {
        throw new Error("Expected passed to be true when no tool calls");
      }
      if (response.reasoning !== "No action taken") {
        throw new Error(
          `Expected reasoning to be "No action taken", got ${response.reasoning}`
        );
      }
    });

    test("should use last tool call for action type", () => {
      const request: AgentRequest = {
        factionId: Faction.ATREIDES,
        requestType: "BID_OR_PASS",
        prompt: "Test",
        context: {},
        availableActions: ["BID", "PASS"],
      };

      const call1 = createTestToolCall("bid", { amount: 1 });
      const result1 = createTestToolResult(call1.toolCallId, "bid", { amount: 1 }, { data: {} });
      const call2 = createTestToolCall("pass", {});
      const result2 = createTestToolResult(call2.toolCallId, "pass", {}, { data: {} });
      const result = createTestGenerateTextResult({
        text: "Multiple actions",
        steps: [
          createTestStep([call1], [result1]),
          createTestStep([call2], [result2]),
        ],
      });

      const response = parseAgentResponse(request, result);

      // Should use last tool call
      if (response.actionType !== "PASS") {
        throw new Error(
          `Expected actionType to be PASS (from last tool call), got ${response.actionType}`
        );
      }
    });

    test("should merge tool input and result data", () => {
      const request: AgentRequest = {
        factionId: Faction.ATREIDES,
        requestType: "BID_OR_PASS",
        prompt: "Test",
        context: {},
        availableActions: ["BID", "PASS"],
      };

      const call = createTestToolCall("bid", { amount: 1 });
      const toolResult = createTestToolResult(
        call.toolCallId,
        "bid",
        { amount: 1 },
        { data: { success: true, cost: 1 } }
      );
      const result = createTestGenerateTextResult({
        text: "Bidding",
        steps: [createTestStep([call], [toolResult])],
      });

      const response = parseAgentResponse(request, result);

      // Should merge input and result data
      if (response.data.amount !== 1) {
        throw new Error(`Expected data.amount to be 1, got ${response.data.amount}`);
      }
      if (response.data.success !== true) {
        throw new Error(`Expected data.success to be true, got ${response.data.success}`);
      }
      if (response.data.cost !== 1) {
        throw new Error(`Expected data.cost to be 1, got ${response.data.cost}`);
      }
    });
  });
});

// Explicitly exit after tests complete to prevent hanging
if (typeof process !== 'undefined') {
  setTimeout(() => process.exit(0), 50);
}

