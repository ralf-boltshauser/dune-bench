/**
 * Config Fixtures
 *
 * Reusable agent config presets for tests.
 */

import type { AgentConfig } from "../../../provider/types";

export const CONFIG_PRESETS = {
  DEFAULT: (): AgentConfig => ({}),

  VERBOSE: (): AgentConfig => ({ verbose: true }),

  CUSTOM_MODEL: (model: string): AgentConfig => ({ model }),

  CUSTOM_TOKENS: (maxTokens: number): AgentConfig => ({ maxTokens }),

  CUSTOM_TEMPERATURE: (temperature: number): AgentConfig => ({
    temperature,
  }),

  FULL: (overrides?: Partial<AgentConfig>): AgentConfig => ({
    apiKey: "test-key",
    model: "test-model",
    maxTokens: 2048,
    temperature: 0.5,
    verbose: true,
    ...overrides,
  }),

  WITH_API_KEY: (apiKey: string): AgentConfig => ({ apiKey }),

  QUIET: (): AgentConfig => ({ verbose: false }),

  INVALID: (): AgentConfig => ({}), // Missing API key - will fail if no env var

  WITH_TEMPERATURE: (temperature: number): AgentConfig => ({ temperature }),

  WITH_MAX_TOKENS: (maxTokens: number): AgentConfig => ({ maxTokens }),
} as const;

