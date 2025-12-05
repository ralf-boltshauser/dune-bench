/**
 * Mock Azure Client
 *
 * Single source of truth for Azure OpenAI client mocking.
 */

export interface MockModel {
  // Model interface for generateText - just a placeholder
  [key: string]: unknown;
}

export interface MockAzureClient {
  responses: (model: string) => MockModel;
}

let mockAzureClient: MockAzureClient | null = null;

export function createMockAzureClient(): MockAzureClient {
  mockAzureClient = {
    responses: (model: string) => {
      return {
        model,
      } as MockModel;
    },
  };
  return mockAzureClient;
}

export function getMockAzureClient(): MockAzureClient | null {
  return mockAzureClient;
}

export function resetMockAzureClient(): void {
  mockAzureClient = null;
}

