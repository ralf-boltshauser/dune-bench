/**
 * Shared types for Azure Agent Provider
 *
 * Single source of truth for provider-related types.
 */

import type { Faction } from "../../types";
import type { createAgentToolProvider } from "../../tools";

/**
 * Configuration for Azure Agent Provider
 */
export interface AgentConfig {
  /** Azure OpenAI API key (defaults to OPENAI_API_KEY or AZURE_API_KEY env var) */
  apiKey?: string;
  /** Model/deployment name to use (defaults to gpt-5-mini) */
  model?: string;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Temperature for generation (0-1) - Note: Not used with reasoning models (responses API) */
  temperature?: number;
  /** Whether to log agent interactions */
  verbose?: boolean;
}

/**
 * Faction agent with its tool provider
 */
export interface FactionAgent {
  faction: Faction;
  toolProvider: ReturnType<typeof createAgentToolProvider>;
}

