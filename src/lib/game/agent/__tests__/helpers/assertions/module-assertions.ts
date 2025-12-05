/**
 * Module-Specific Assertions
 *
 * Reusable assertions for testing refactored modules.
 */

import type { GameState } from "@/lib/game/types";
import type { Faction } from "@/lib/game/types";
import type { AgentResponse } from "../../../../phases/types";
import type { RequiredAgentConfig } from "../../../provider/azure-client";
import type { FactionAgent } from "../../../provider/types";

// Azure client assertions
export function assertConfigCreated(
  config: RequiredAgentConfig,
  expected: Partial<RequiredAgentConfig>
): void {
  for (const [key, value] of Object.entries(expected)) {
    if (config[key as keyof RequiredAgentConfig] !== value) {
      throw new Error(
        `Expected config.${key} to be ${value}, got ${config[key as keyof RequiredAgentConfig]}`
      );
    }
  }
}

export function assertClientCreated(
  client: any,
  expectedConfig?: Partial<RequiredAgentConfig>
): void {
  if (!client) {
    throw new Error("Expected client to be created");
  }
  if (!client.responses || typeof client.responses !== "function") {
    throw new Error("Expected client to have responses() method");
  }
}

export function assertConfigValidated(
  config: any,
  shouldPass: boolean
): void {
  if (shouldPass && !config) {
    throw new Error("Expected config validation to pass");
  }
  if (!shouldPass && config) {
    throw new Error("Expected config validation to fail");
  }
}

// Faction agent assertions
export function assertAgentCreated(
  agent: FactionAgent,
  faction: Faction,
  state: GameState
): void {
  if (!agent) {
    throw new Error(`Expected agent for faction ${faction}`);
  }
  if (agent.faction !== faction) {
    throw new Error(
      `Expected agent.faction to be ${faction}, got ${agent.faction}`
    );
  }
  if (!agent.toolProvider) {
    throw new Error("Expected agent to have toolProvider");
  }
  const agentState = agent.toolProvider.getState();
  if (agentState.gameId !== state.gameId) {
    throw new Error("Expected agent state to match initial state");
  }
}

export function assertAllAgentsCreated(
  agents: Map<Faction, FactionAgent>,
  factions: Faction[]
): void {
  if (agents.size !== factions.length) {
    throw new Error(
      `Expected ${factions.length} agents, got ${agents.size}`
    );
  }
  for (const faction of factions) {
    if (!agents.has(faction)) {
      throw new Error(`Expected agent for faction ${faction}`);
    }
  }
}

export function assertAgentStateUpdated(
  agent: FactionAgent,
  newState: GameState
): void {
  const agentState = agent.toolProvider.getState();
  if (agentState.gameId !== newState.gameId) {
    throw new Error("Expected agent state to be updated");
  }
}

export function assertAgentRetrieved(
  agents: Map<Faction, FactionAgent>,
  faction: Faction,
  expectedAgent: FactionAgent | undefined
): void {
  const agent = agents.get(faction);
  if (expectedAgent && !agent) {
    throw new Error(`Expected agent for faction ${faction}`);
  }
  if (!expectedAgent && agent) {
    throw new Error(`Expected no agent for faction ${faction}`);
  }
  if (expectedAgent && agent && agent !== expectedAgent) {
    throw new Error(`Expected specific agent instance for faction ${faction}`);
  }
}

// Request processor assertions
export function assertRequestProcessed(
  result: AgentResponse,
  expectedResponse: Partial<AgentResponse>
): void {
  for (const [key, value] of Object.entries(expectedResponse)) {
    if (result[key as keyof AgentResponse] !== value) {
      throw new Error(
        `Expected response.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(result[key as keyof AgentResponse])}`
      );
    }
  }
}

export function assertPromptsBuilt(
  systemPrompt: string,
  userPrompt: string,
  faction: Faction,
  request: any
): void {
  if (!systemPrompt || systemPrompt.length === 0) {
    throw new Error("Expected system prompt to be built");
  }
  if (!userPrompt || userPrompt.length === 0) {
    throw new Error("Expected user prompt to be built");
  }
  // Can add more specific checks if needed
}

export function assertToolsRetrieved(tools: any, phase: string): void {
  if (!tools || typeof tools !== "object") {
    throw new Error("Expected tools to be retrieved");
  }
}

export function assertResponseParsed(
  response: AgentResponse,
  expected: Partial<AgentResponse>
): void {
  assertRequestProcessed(response, expected);
}

export function assertEventsEmitted(
  events: any[],
  expectedEvents: string[]
): void {
  const emittedTypes = events.map((e) => e.type || e);
  for (const expectedType of expectedEvents) {
    if (!emittedTypes.includes(expectedType)) {
      throw new Error(
        `Expected event ${expectedType} to be emitted, but it was not`
      );
    }
  }
}

export function assertLogsCreated(
  logs: any[],
  expectedLogs: string[]
): void {
  const logMethods = logs.map((l) => l.method || l);
  for (const expectedMethod of expectedLogs) {
    if (!logMethods.includes(expectedMethod)) {
      throw new Error(
        `Expected log ${expectedMethod} to be created, but it was not`
      );
    }
  }
}

// State sync assertions
export function assertStateSyncedFromAgent(
  agents: Map<Faction, FactionAgent>,
  faction: Faction,
  expectedState: GameState
): void {
  const agent = agents.get(faction);
  if (!agent) {
    throw new Error(`Expected agent for faction ${faction}`);
  }
  const agentState = agent.toolProvider.getState();
  // Verify state is synced (basic check)
  if (agentState.gameId !== expectedState.gameId) {
    throw new Error("Expected state to be synced from agent");
  }
}

export function assertStateSyncedFromAllAgents(
  agents: Map<Faction, FactionAgent>,
  expectedState: GameState
): void {
  for (const agent of agents.values()) {
    const agentState = agent.toolProvider.getState();
    if (agentState.gameId !== expectedState.gameId) {
      throw new Error("Expected all agents to have synced state");
    }
  }
}

export function assertAllAgentsUpdated(
  agents: Map<Faction, FactionAgent>,
  newState: GameState
): void {
  for (const agent of agents.values()) {
    assertAgentStateUpdated(agent, newState);
  }
}

// Error handler assertions
export function assertErrorHandled(
  error: unknown,
  expectedResponse: AgentResponse
): void {
  // This is a placeholder - actual implementation depends on how errors are handled
  if (!expectedResponse) {
    throw new Error("Expected error to be handled");
  }
}

export function assertSchemaErrorDetected(
  error: unknown,
  expected: boolean
): void {
  const isSchemaError =
    error instanceof Error &&
    error.message.includes("Transforms cannot be represented in JSON Schema");
  if (isSchemaError !== expected) {
    throw new Error(
      `Expected schema error detection to be ${expected}, got ${isSchemaError}`
    );
  }
}

export function assertPassResponseCreated(
  response: AgentResponse,
  faction: Faction,
  errorMessage?: string
): void {
  if (response.factionId !== faction) {
    throw new Error(
      `Expected pass response for faction ${faction}, got ${response.factionId}`
    );
  }
  if (response.actionType !== "PASS") {
    throw new Error(
      `Expected pass response actionType to be PASS, got ${response.actionType}`
    );
  }
  if (!response.passed) {
    throw new Error("Expected pass response to have passed=true");
  }
  if (errorMessage && !response.reasoning?.includes(errorMessage)) {
    throw new Error(
      `Expected pass response reasoning to include error message: ${errorMessage}`
    );
  }
}

// Response handler assertions
export function assertToolCallsExtracted(
  result: any,
  expectedCalls: number
): void {
  const toolCalls = result.steps?.flatMap((s: any) => s.toolCalls ?? []) ?? [];
  if (toolCalls.length !== expectedCalls) {
    throw new Error(
      `Expected ${expectedCalls} tool calls, got ${toolCalls.length}`
    );
  }
}

export function assertToolResultsExtracted(
  result: any,
  expectedResults: number
): void {
  const toolResults = result.steps?.flatMap((s: any) => s.toolResults ?? []) ?? [];
  if (toolResults.length !== expectedResults) {
    throw new Error(
      `Expected ${expectedResults} tool results, got ${toolResults.length}`
    );
  }
}

export function assertPassActionDetected(
  toolName: string,
  expected: boolean
): void {
  const isPass = toolName.includes("pass");
  if (isPass !== expected) {
    throw new Error(
      `Expected pass action detection to be ${expected} for toolName ${toolName}, got ${isPass}`
    );
  }
}

export function assertToolDataMerged(
  input: Record<string, unknown>,
  result: Record<string, unknown>,
  expected: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value) {
      throw new Error(
        `Expected merged data.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(result[key])}`
      );
    }
  }
}

export function assertResponseParsedCorrectly(
  response: AgentResponse,
  request: any,
  result: any
): void {
  if (response.factionId !== request.factionId) {
    throw new Error(
      `Expected response.factionId to match request.factionId: ${request.factionId}`
    );
  }
  if (!response.actionType) {
    throw new Error("Expected response to have actionType");
  }
  if (typeof response.data !== "object") {
    throw new Error("Expected response to have data object");
  }
}

