/**
 * Azure Client Management
 *
 * Handles Azure OpenAI client creation and configuration.
 * Single source of truth for Azure client lifecycle.
 */

import { createAzure } from "@ai-sdk/azure";
import {
  getAzureApiKey,
  getAzureApiVersion,
  getAzureModel,
  getAzureResourceName,
} from "../openai-config";
import type { AgentConfig } from "./types";

/**
 * Azure OpenAI client type
 */
export type AzureClient = ReturnType<typeof createAzure>;

/**
 * Required configuration for Azure client
 */
export interface RequiredAgentConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  verbose: boolean;
}

/**
 * Create and validate required agent configuration.
 * Merges provided config with environment variable defaults.
 */
export function createAgentConfig(config: AgentConfig = {}): RequiredAgentConfig {
  const apiKey = config.apiKey ?? getAzureApiKey();
  const model = config.model ?? getAzureModel();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or AZURE_API_KEY is required");
  }

  return {
    apiKey,
    model,
    maxTokens: config.maxTokens ?? 1024,
    temperature: config.temperature ?? 0.7,
    verbose: config.verbose ?? false,
  };
}

/**
 * Create Azure OpenAI client instance.
 * Uses centralized configuration from openai-config.
 */
export function createAzureClient(config: RequiredAgentConfig): AzureClient {
  return createAzure({
    resourceName: getAzureResourceName(),
    apiKey: config.apiKey,
    apiVersion: getAzureApiVersion(),
  });
}

/**
 * Validate Azure configuration.
 * Throws if API key is missing.
 */
export function validateAzureConfig(config: AgentConfig = {}): void {
  const apiKey = config.apiKey ?? getAzureApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or AZURE_API_KEY is required");
  }
}

