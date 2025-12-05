/**
 * Faction-Specific Test Configurations
 * 
 * Helper functions to configure faction-specific abilities and states.
 */

import { Faction, TerritoryId } from '../../../types';
import type { TestStateConfig } from '../helpers/test-state-builder';
import { TestLeaders } from './test-data';

export interface FactionSetup {
  apply: (config: Partial<TestStateConfig>) => Partial<TestStateConfig>;
}

/**
 * Faction-specific setup configurations
 */
export const FactionSetups = {
  /**
   * Atreides faction setups
   */
  atreides: {
    /**
     * Setup with Prescience ability available
     */
    withPrescience: (): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Prescience is always available if Atreides is in game
        // No special setup needed
      }),
    }),

    /**
     * Setup with Kwisatz Haderach active
     */
    withKwisatzHaderach: (): FactionSetup => ({
      apply: (config) => ({
        ...config,
        specialStates: {
          ...config.specialStates,
          atreides: {
            ...config.specialStates?.atreides,
            kwisatzHaderachActive: true,
          },
        },
      }),
    }),

    /**
     * Setup with specific leader available
     */
    withLeader: (leaderId: string): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Leader availability is handled by test-state-builder
        // This is a marker for test documentation
      }),
    }),
  },

  /**
   * Bene Gesserit faction setups
   */
  beneGesserit: {
    /**
     * Setup with Voice ability available
     */
    withVoice: (): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Voice is always available if BG is in game
      }),
    }),

    /**
     * Setup with advisors in territory
     */
    withAdvisors: (
      territory: TerritoryId,
      sector: number,
      count: number
    ): FactionSetup => ({
      apply: (config) => {
        // Advisors are added via force placement with advisor flag
        // This is a marker for test documentation
        return config;
      },
    }),

    /**
     * Setup for Universal Stewards test
     */
    withUniversalStewards: (
      territory: TerritoryId,
      sector: number,
      advisorCount: number
    ): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Advisors alone in territory will auto-flip
        // This is a marker for test documentation
      }),
    }),
  },

  /**
   * Harkonnen faction setups
   */
  harkonnen: {
    /**
     * Setup with traitor cards
     */
    withTraitors: (traitorTargets: Array<{ leaderId: string; faction: Faction }>): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Traitors are added via addTraitorCard helper
        // This is a marker for test documentation
      }),
    }),

    /**
     * Setup with captured leaders
     */
    withCapturedLeaders: (capturedLeaders: Array<{ leaderId: string; originalFaction: Faction }>): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Captured leaders are set up via state mutations
        // This is a marker for test documentation
      }),
    }),
  },

  /**
   * Emperor faction setups
   */
  emperor: {
    /**
     * Setup with Sardaukar elite forces
     */
    withSardaukar: (territory: TerritoryId, sector: number, count: number): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Elite forces are added via force placement
        // This is a marker for test documentation
      }),
    }),
  },

  /**
   * Fremen faction setups
   */
  fremen: {
    /**
     * Setup with Fedaykin elite forces
     */
    withFedaykin: (territory: TerritoryId, sector: number, count: number): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Elite forces are added via force placement
        // This is a marker for test documentation
      }),
    }),

    /**
     * Setup with Battle Hardened ability (always active)
     */
    withBattleHardened: (): FactionSetup => ({
      apply: (config) => ({
        ...config,
        // Battle Hardened is always active for Fremen
      }),
    }),
  },
};

