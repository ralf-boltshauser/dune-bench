/**
 * State Assertions
 *
 * Reusable assertions for game state validation.
 */

import { AzureAgentProvider } from "@/lib/game/agent/provider/azure-provider";
import type { GameState } from "@/lib/game/types";

export class StateAssertions {
  static expectStateUpdated(
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

  static expectStateHasFactions(
    provider: AzureAgentProvider,
    expectedFactions: string[]
  ): void {
    const state = provider.getState();
    const actualFactions = Array.from(state.factions.keys()).map((f) =>
      f.toString()
    );
    for (const faction of expectedFactions) {
      if (!actualFactions.includes(faction)) {
        throw new Error(
          `Expected faction ${faction} in state, but not found`
        );
      }
    }
  }

  static expectStatePhase(
    provider: AzureAgentProvider,
    expectedPhase: string
  ): void {
    const state = provider.getState();
    if (state.phase !== expectedPhase) {
      throw new Error(
        `Expected phase ${expectedPhase}, got ${state.phase}`
      );
    }
  }

  static expectStateSynced(
    provider: AzureAgentProvider,
    factions: string[]
  ): void {
    const state = provider.getState();
    // Verify state is consistent across all agents
    // This is a basic check - can be enhanced
    for (const faction of factions) {
      const factionState = state.factions.get(faction as any);
      if (!factionState) {
        throw new Error(`Expected faction ${faction} in synced state`);
      }
    }
  }

  static expectStateConsistent(provider: AzureAgentProvider): void {
    const state = provider.getState();
    if (!state.gameId) {
      throw new Error("Expected state to have gameId");
    }
    if (!state.factions || state.factions.size === 0) {
      throw new Error("Expected state to have factions");
    }
  }

  static expectGameIdUnchanged(
    provider: AzureAgentProvider,
    originalGameId: string
  ): void {
    const state = provider.getState();
    if (state.gameId !== originalGameId) {
      throw new Error(
        `Expected gameId to remain ${originalGameId}, got ${state.gameId}`
      );
    }
  }
}

