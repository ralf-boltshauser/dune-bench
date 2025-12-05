/**
 * Provider Assertions
 *
 * Reusable assertions for provider structure and configuration.
 */

import { AzureAgentProvider } from "@/lib/game/agent/provider/azure-provider";
import { Faction } from "@/lib/game/types";

export class ProviderAssertions {
  static expectAgentCreated(
    provider: AzureAgentProvider,
    faction: Faction
  ): void {
    const state = provider.getState();
    const factionExists = state.factions.has(faction);
    if (!factionExists) {
      throw new Error(`Expected agent for faction ${faction} but faction not in game state`);
    }

    // Try to get logger - if it works, provider is set up
    const logger = provider.getLogger();
    if (!logger) {
      throw new Error("Provider logger is null");
    }
  }

  static expectAllAgentsCreated(
    provider: AzureAgentProvider,
    factions: Faction[]
  ): void {
    factions.forEach((f) => this.expectAgentCreated(provider, f));
  }

  static expectLogger(provider: AzureAgentProvider): void {
    const logger = provider.getLogger();
    if (!logger) {
      throw new Error("Expected logger to exist");
    }
  }

  static expectStateMatches(
    provider: AzureAgentProvider,
    expectedGameId: string
  ): void {
    const state = provider.getState();
    if (state.gameId !== expectedGameId) {
      throw new Error(
        `Expected gameId ${expectedGameId}, got ${state.gameId}`
      );
    }
  }
}

