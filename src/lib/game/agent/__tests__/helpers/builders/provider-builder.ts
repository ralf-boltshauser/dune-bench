/**
 * Provider Builder
 *
 * Fluent API for creating Azure provider instances in tests.
 * Note: This builder helps set up test state but actual mocking
 * of Azure SDK and generateText needs to be done at the test level
 * using manual mocks or by setting environment variables.
 */

import { AzureAgentProvider } from "@/lib/game/agent/provider/azure-provider";
import type { AgentConfig } from "@/lib/game/agent/provider/types";
import type { GameState } from "@/lib/game/types";
import { createMockLogger, type MockLogger } from "../mocks/logger";
import { mockEventStreamer } from "../mocks/event-streamer";

let mockLoggerInstance: MockLogger | null = null;

export class ProviderBuilder {
  private state?: GameState;
  private config?: AgentConfig;
  private logger?: MockLogger;

  static create(): ProviderBuilder {
    return new ProviderBuilder();
  }

  withState(state: GameState): this {
    this.state = state;
    return this;
  }

  withConfig(config: AgentConfig): this {
    this.config = config;
    return this;
  }

  withMockLogger(logger: MockLogger): this {
    this.logger = logger;
    mockLoggerInstance = logger;
    return this;
  }

  build(): {
    provider: AzureAgentProvider;
    logger: MockLogger;
    cleanup: () => void;
  } {
    // Reset event streamer
    mockEventStreamer.clear();

    // Create logger if not provided
    const logger = this.logger || createMockLogger();
    mockLoggerInstance = logger;

    // Create provider
    if (!this.state) {
      throw new Error("State is required");
    }

    // Ensure API key is set in config for tests
    const testConfig: AgentConfig = {
      apiKey: "test-api-key",
      ...this.config,
    };

    const provider = new AzureAgentProvider(this.state, testConfig);

    // Return cleanup function
    const cleanup = () => {
      mockEventStreamer.clear();
      logger.clear();
      mockLoggerInstance = null;
    };

    return { provider, logger, cleanup };
  }

  // Preset methods
  withVerboseLogging(): this {
    this.config = { ...this.config, verbose: true };
    return this;
  }
}

