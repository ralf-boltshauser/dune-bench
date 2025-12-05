/**
 * Module Test Utilities
 *
 * Utilities for testing individual refactored modules.
 */

import type { GameState } from "@/lib/game/types";
import type { Faction } from "@/lib/game/types";
import type { AgentConfig } from "../../provider/types";
import type { RequiredAgentConfig } from "../../provider/azure-client";
import { createAgentConfig, createAzureClient } from "../../provider/azure-client";
import {
  createFactionAgent,
  createAllFactionAgents,
  updateFactionAgentState,
  updateAllAgentsState,
  getAgent,
  hasAgent,
} from "../../provider/faction-agent";
import type { ProcessRequestOptions } from "../../provider/request-processor";
import { processAgentRequest } from "../../provider/request-processor";
import { syncStateFromAgent, syncStateFromAllAgents } from "../../provider/state-sync";
import { isSchemaSerializationError, handleAgentError, createPassResponse } from "../../provider/error-handler";
import {
  extractToolCalls,
  extractToolResults,
  isPassAction,
  mergeToolData,
  parseAgentResponse,
} from "../../provider/response-handler";
import type { AgentRequest } from "@/lib/game/phases/types";
import type { GenerateTextResult } from "ai";

// Azure client module utilities
export function createTestConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    apiKey: "test-api-key",
    ...overrides,
  };
}

export interface ConfigTestCase {
  name: string;
  input: AgentConfig;
  expected: Partial<RequiredAgentConfig>;
  shouldThrow?: boolean;
}

export function testConfigCreation(testCases: ConfigTestCase[]): void {
  for (const testCase of testCases) {
    try {
      const config = createAgentConfig(testCase.input);
      if (testCase.shouldThrow) {
        throw new Error(`Expected test case "${testCase.name}" to throw but it didn't`);
      }
      // Verify expected values
      for (const [key, value] of Object.entries(testCase.expected)) {
        if (config[key as keyof RequiredAgentConfig] !== value) {
          throw new Error(
            `Test case "${testCase.name}": Expected config.${key} to be ${value}, got ${config[key as keyof RequiredAgentConfig]}`
          );
        }
      }
    } catch (error) {
      if (!testCase.shouldThrow) {
        throw error;
      }
    }
  }
}

export function testClientCreation(testCases: Array<{ name: string; config: RequiredAgentConfig }>): void {
  for (const testCase of testCases) {
    try {
      const client = createAzureClient(testCase.config);
      if (!client || !client.responses) {
        throw new Error(`Test case "${testCase.name}": Expected client to be created`);
      }
    } catch (error) {
      throw new Error(`Test case "${testCase.name}": ${error}`);
    }
  }
}

// Faction agent module utilities
export function createTestAgent(
  faction: Faction,
  state: GameState,
  gameId: string
) {
  return createFactionAgent(state, faction, gameId);
}

export interface AgentCreationTestCase {
  name: string;
  faction: Faction;
  state: GameState;
  gameId: string;
  expectedFaction: Faction;
}

export function testAgentCreation(testCases: AgentCreationTestCase[]): void {
  for (const testCase of testCases) {
    const agent = createFactionAgent(testCase.state, testCase.faction, testCase.gameId);
    if (agent.faction !== testCase.expectedFaction) {
      throw new Error(
        `Test case "${testCase.name}": Expected agent.faction to be ${testCase.expectedFaction}, got ${agent.faction}`
      );
    }
    if (!agent.toolProvider) {
      throw new Error(`Test case "${testCase.name}": Expected agent to have toolProvider`);
    }
  }
}

export function testBatchAgentCreation(
  testCases: Array<{ name: string; factions: Faction[]; state: GameState; gameId: string }>
): void {
  for (const testCase of testCases) {
    const agents = createAllFactionAgents(testCase.state, testCase.gameId);
    if (agents.size !== testCase.factions.length) {
      throw new Error(
        `Test case "${testCase.name}": Expected ${testCase.factions.length} agents, got ${agents.size}`
      );
    }
    for (const faction of testCase.factions) {
      if (!agents.has(faction)) {
        throw new Error(
          `Test case "${testCase.name}": Expected agent for faction ${faction}`
        );
      }
    }
  }
}

export function testAgentStateManagement(
  testCases: Array<{ name: string; agent: any; newState: GameState; expectedGameId: string }>
): void {
  for (const testCase of testCases) {
    updateFactionAgentState(testCase.agent, testCase.newState);
    const agentState = testCase.agent.toolProvider.getState();
    if (agentState.gameId !== testCase.expectedGameId) {
      throw new Error(
        `Test case "${testCase.name}": Expected agent state gameId to be ${testCase.expectedGameId}, got ${agentState.gameId}`
      );
    }
  }
}

export function testAgentRetrieval(
  testCases: Array<{ name: string; agents: Map<Faction, any>; faction: Faction; shouldThrow: boolean }>
): void {
  for (const testCase of testCases) {
    try {
      const agent = getAgent(testCase.agents, testCase.faction);
      if (testCase.shouldThrow) {
        throw new Error(`Test case "${testCase.name}": Expected to throw but didn't`);
      }
      if (!agent) {
        throw new Error(`Test case "${testCase.name}": Expected agent to be returned`);
      }
    } catch (error) {
      if (!testCase.shouldThrow) {
        throw error;
      }
    }
  }
}

// Request processor module utilities
export function createTestRequestProcessorOptions(
  overrides?: Partial<ProcessRequestOptions>
): ProcessRequestOptions {
  // This is a helper - actual implementation would need all required fields
  throw new Error("createTestRequestProcessorOptions not fully implemented - needs all required fields");
}

// State sync module utilities
export function createTestAgentsMap(
  factions: Faction[],
  state: GameState,
  gameId: string
): Map<Faction, any> {
  return createAllFactionAgents(state, gameId);
}

export interface StateSyncTestCase {
  name: string;
  agents: Map<Faction, any>;
  faction: Faction;
  currentState: GameState;
  expectedGameId: string;
}

export function testStateSyncFromAgent(testCases: StateSyncTestCase[]): void {
  for (const testCase of testCases) {
    const syncedState = syncStateFromAgent(
      testCase.agents,
      testCase.faction,
      testCase.currentState
    );
    if (syncedState.gameId !== testCase.expectedGameId) {
      throw new Error(
        `Test case "${testCase.name}": Expected synced state gameId to be ${testCase.expectedGameId}, got ${syncedState.gameId}`
      );
    }
  }
}

export function testStateSyncFromAllAgents(
  testCases: Array<{ name: string; agents: Map<Faction, any>; currentState: GameState; expectedGameId: string }>
): void {
  for (const testCase of testCases) {
    const syncedState = syncStateFromAllAgents(testCase.agents, testCase.currentState);
    if (syncedState.gameId !== testCase.expectedGameId) {
      throw new Error(
        `Test case "${testCase.name}": Expected synced state gameId to be ${testCase.expectedGameId}, got ${syncedState.gameId}`
      );
    }
  }
}

// Error handler module utilities
export interface ErrorDetectionTestCase {
  name: string;
  error: unknown;
  expected: boolean;
}

export function testErrorDetection(testCases: ErrorDetectionTestCase[]): void {
  for (const testCase of testCases) {
    const result = isSchemaSerializationError(testCase.error);
    if (result !== testCase.expected) {
      throw new Error(
        `Test case "${testCase.name}": Expected schema error detection to be ${testCase.expected}, got ${result}`
      );
    }
  }
}

export interface ErrorHandlingTestCase {
  name: string;
  error: unknown;
  factionId: Faction;
  expectedActionType: string;
  expectedPassed: boolean;
}

export function testErrorHandling(testCases: ErrorHandlingTestCase[]): void {
  for (const testCase of testCases) {
    try {
      const response = handleAgentError(testCase.error, testCase.factionId);
      if (response.actionType !== testCase.expectedActionType) {
        throw new Error(
          `Test case "${testCase.name}": Expected actionType to be ${testCase.expectedActionType}, got ${response.actionType}`
        );
      }
      if (response.passed !== testCase.expectedPassed) {
        throw new Error(
          `Test case "${testCase.name}": Expected passed to be ${testCase.expectedPassed}, got ${response.passed}`
        );
      }
    } catch (error) {
      // Some errors are re-thrown (schema errors)
      if (testCase.expectedActionType !== "THROW") {
        throw error;
      }
    }
  }
}

export function testPassResponseCreation(
  testCases: Array<{ name: string; factionId: Faction; reasoning: string; expectedReasoning: string }>
): void {
  for (const testCase of testCases) {
    const response = createPassResponse(testCase.factionId, testCase.reasoning);
    if (response.factionId !== testCase.factionId) {
      throw new Error(
        `Test case "${testCase.name}": Expected factionId to be ${testCase.factionId}, got ${response.factionId}`
      );
    }
    if (response.reasoning !== testCase.expectedReasoning) {
      throw new Error(
        `Test case "${testCase.name}": Expected reasoning to be ${testCase.expectedReasoning}, got ${response.reasoning}`
      );
    }
  }
}

// Response handler module utilities
export function createTestGenerateTextResult(
  overrides?: Partial<GenerateTextResult<any, any>>
): GenerateTextResult<any, any> {
  return {
    text: "",
    content: [],
    steps: [],
    reasoning: undefined,
    reasoningText: undefined,
    files: [],
    finishReason: "stop",
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    warnings: [],
    request: {} as any,
    response: {} as any,
    providerMetadata: {},
    ...overrides,
  } as GenerateTextResult<any, any>;
}

export interface ToolExtractionTestCase {
  name: string;
  result: GenerateTextResult<any, any>;
  expectedCalls: number;
}

export function testToolCallExtraction(testCases: ToolExtractionTestCase[]): void {
  for (const testCase of testCases) {
    const toolCalls = extractToolCalls(testCase.result);
    if (toolCalls.length !== testCase.expectedCalls) {
      throw new Error(
        `Test case "${testCase.name}": Expected ${testCase.expectedCalls} tool calls, got ${toolCalls.length}`
      );
    }
  }
}

export function testToolResultExtraction(testCases: ToolExtractionTestCase[]): void {
  for (const testCase of testCases) {
    const toolResults = extractToolResults(testCase.result);
    if (toolResults.length !== testCase.expectedCalls) { // Reusing expectedCalls for results
      throw new Error(
        `Test case "${testCase.name}": Expected ${testCase.expectedCalls} tool results, got ${toolResults.length}`
      );
    }
  }
}

export interface PassActionTestCase {
  name: string;
  toolName: string;
  expected: boolean;
}

export function testPassActionDetection(testCases: PassActionTestCase[]): void {
  for (const testCase of testCases) {
    const result = isPassAction(testCase.toolName);
    if (result !== testCase.expected) {
      throw new Error(
        `Test case "${testCase.name}": Expected pass action detection to be ${testCase.expected}, got ${result}`
      );
    }
  }
}

export interface ToolDataMergeTestCase {
  name: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  expected: Record<string, unknown>;
}

export function testToolDataMerging(testCases: ToolDataMergeTestCase[]): void {
  for (const testCase of testCases) {
    const merged = mergeToolData(testCase.input, testCase.result);
    for (const [key, value] of Object.entries(testCase.expected)) {
      if (merged[key] !== value) {
        throw new Error(
          `Test case "${testCase.name}": Expected merged.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(merged[key])}`
        );
      }
    }
  }
}

export interface ResponseParsingTestCase {
  name: string;
  request: AgentRequest;
  result: GenerateTextResult<any, any>;
  expectedActionType: string;
  expectedPassed: boolean;
}

export function testResponseParsing(testCases: ResponseParsingTestCase[]): void {
  for (const testCase of testCases) {
    const response = parseAgentResponse(testCase.request, testCase.result);
    if (response.actionType !== testCase.expectedActionType) {
      throw new Error(
        `Test case "${testCase.name}": Expected actionType to be ${testCase.expectedActionType}, got ${response.actionType}`
      );
    }
    if (response.passed !== testCase.expectedPassed) {
      throw new Error(
        `Test case "${testCase.name}": Expected passed to be ${testCase.expectedPassed}, got ${response.passed}`
      );
    }
  }
}

