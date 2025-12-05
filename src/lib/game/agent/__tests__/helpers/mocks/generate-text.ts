/**
 * Mock GenerateText
 *
 * Controls generateText responses in tests.
 */

import type { GenerateTextResult } from "ai";

export interface MockGenerateTextResult {
  text?: string;
  steps?: Array<{
    toolCalls?: Array<{
      toolName: string;
      input?: Record<string, unknown>;
    }>;
    toolResults?: Array<{
      output?: { data?: Record<string, unknown> };
    }>;
  }>;
}

export interface MockGenerateTextOptions {
  result?: MockGenerateTextResult;
  error?: Error;
  delay?: number;
}

let mockGenerateTextImpl: ((
  options: any
) => Promise<GenerateTextResult<any, any>>) | null = null;

export function setupMockGenerateText(
  options: MockGenerateTextOptions
): () => void {
  mockGenerateTextImpl = async () => {
    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    if (options.error) {
      throw options.error;
    }

    if (options.result) {
      return options.result as GenerateTextResult<any, any>;
    }

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
    } as unknown as GenerateTextResult<any, any>;
  };

  // Return cleanup function
  return () => {
    mockGenerateTextImpl = null;
  };
}

export function getMockGenerateText():
  | ((options: any) => Promise<GenerateTextResult<any, any>>)
  | null {
  return mockGenerateTextImpl;
}

export function createMockResult(
  toolCalls?: Array<{
    toolName: string;
    input?: Record<string, unknown>;
  }>,
  toolResults?: Array<{
    output?: { data?: Record<string, unknown> };
  }>,
  text?: string
): MockGenerateTextResult {
  return {
    text: text || "",
    steps: [
      {
        toolCalls: toolCalls || [],
        toolResults: toolResults || [],
      },
    ],
  };
}

// Presets for common scenarios
export const MOCK_RESULTS = {
  PASS: () => createMockResult([{ toolName: "pass", input: {} }]),
  SINGLE_TOOL_CALL: (toolName: string, input: Record<string, unknown>) =>
    createMockResult([{ toolName, input }]),
  MULTI_STEP: (
    steps: Array<{
      toolName: string;
      input?: Record<string, unknown>;
    }>
  ) => createMockResult(steps),
  NO_TOOL_CALLS: () => createMockResult([], [], "No action taken"),
  WITH_REASONING: (reasoning: string) =>
    createMockResult([{ toolName: "pass", input: {} }], [], reasoning),
  ACTION: (toolName: string, input: Record<string, unknown>, reasoning?: string) =>
    createMockResult([{ toolName, input }], [], reasoning),
  ERROR: (error: Error) => {
    throw error;
  },
  SCHEMA_ERROR: () => {
    throw new Error("Transforms cannot be represented in JSON Schema");
  },
  NETWORK_ERROR: () => {
    throw new Error("Network error: Failed to connect");
  },
  TIMEOUT: () => {
    throw new Error("Request timeout");
  },
};

// Call tracking for verification
interface CallRecord {
  args: any[];
  timestamp: number;
}

let callRecords: CallRecord[] = [];

export function getMockGenerateTextCalls(): CallRecord[] {
  return [...callRecords];
}

export function getMockGenerateTextCallCount(): number {
  return callRecords.length;
}

export function getLastMockGenerateTextCall(): CallRecord | undefined {
  return callRecords[callRecords.length - 1];
}

export function clearMockGenerateTextCalls(): void {
  callRecords = [];
}

// Enhanced setup with call tracking
export function setupMockGenerateTextWithTracking(
  options: MockGenerateTextOptions
): () => void {
  const cleanup = setupMockGenerateText({
    ...options,
    result: options.result,
    error: options.error,
    delay: options.delay,
  });

  // Wrap to track calls
  const originalImpl = mockGenerateTextImpl;
  if (originalImpl) {
    mockGenerateTextImpl = async (args: any) => {
      callRecords.push({ args, timestamp: Date.now() });
      const result = await originalImpl(args);
      return result;
    };
  }

  return () => {
    cleanup();
    clearMockGenerateTextCalls();
  };
}

