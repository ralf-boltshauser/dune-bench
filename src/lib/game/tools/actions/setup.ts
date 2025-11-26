/**
 * Setup Phase Tools
 *
 * Tools for the pre-game setup phase:
 * - Traitor selection
 * - Bene Gesserit prediction
 * - Fremen force distribution (rule 2.04.02)
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult } from '../types';
import { Faction, type TerritoryId } from '../../types';

/** Valid territories for Fremen starting force distribution (rule 2.04.02) */
const FREMEN_STARTING_TERRITORIES = ['sietch_tabr', 'false_wall_south', 'false_wall_west'] as const;

// =============================================================================
// SCHEMAS
// =============================================================================

const SelectTraitorSchema = z.object({
  traitorId: z.string().describe('The leader ID of the traitor you want to keep'),
});

const BGPredictionSchema = z.object({
  faction: z.enum([
    'atreides',
    'harkonnen',
    'emperor',
    'fremen',
    'spacing_guild',
  ]).describe('The faction you predict will win'),
  turn: z.number().min(1).max(15).describe('The turn on which you predict they will win'),
});

const FremenForceDistributionSchema = z.object({
  sietch_tabr: z.number().min(0).max(10).describe('Number of forces to place in Sietch Tabr'),
  false_wall_south: z.number().min(0).max(10).describe('Number of forces to place in False Wall South'),
  false_wall_west: z.number().min(0).max(10).describe('Number of forces to place in False Wall West'),
}).refine(
  (data) => data.sietch_tabr + data.false_wall_south + data.false_wall_west === 10,
  { message: 'Total forces must equal exactly 10' }
);

// =============================================================================
// SETUP TOOLS
// =============================================================================

/**
 * Create setup phase tools bound to a context manager.
 */
export function createSetupTools(ctx: ToolContextManager) {
  return {
    /**
     * Select a traitor to keep from the 4 dealt.
     */
    select_traitor: tool({
      description: `Choose one traitor to keep from the 4 dealt to you.

When you hold a traitor card matching an opponent's leader, you can call "Traitor!" during battle resolution if they use that leader. The battle is automatically won and their leader is killed.

Choose wisely - pick a leader you think opponents will use in battle. Strong leaders (4-5 strength) are often used.`,
      inputSchema: SelectTraitorSchema,
      execute: async (params: z.infer<typeof SelectTraitorSchema>) => {
        const { traitorId } = params;

        return successResult(
          `Selected traitor: ${traitorId}`,
          { traitorId, faction: ctx.faction },
          false
        );
      },
    }),

    /**
     * Bene Gesserit secret prediction.
     */
    bg_prediction: tool({
      description: `Make your secret prediction as the Bene Gesserit.

Predict which faction will win and on which turn. If your prediction comes true, YOU win instead of them!

This is a powerful ability - think about which faction is likely to achieve victory and when.`,
      inputSchema: BGPredictionSchema,
      execute: async (params: z.infer<typeof BGPredictionSchema>) => {
        const { faction, turn } = params;

        // Map string to Faction enum
        const factionMap: Record<string, Faction> = {
          atreides: Faction.ATREIDES,
          harkonnen: Faction.HARKONNEN,
          emperor: Faction.EMPEROR,
          fremen: Faction.FREMEN,
          spacing_guild: Faction.SPACING_GUILD,
        };

        const predictedFaction = factionMap[faction];
        if (!predictedFaction) {
          return failureResult(
            `Invalid faction: ${faction}`,
            { code: 'INVALID_FACTION', message: `Invalid faction: ${faction}` },
            false
          );
        }

        return successResult(
          `Prediction made: ${faction} will win on turn ${turn}`,
          { faction: predictedFaction, turn },
          false
        );
      },
    }),

    /**
     * Fremen force distribution (rule 2.04.02).
     * Distribute 10 starting forces across Sietch Tabr, False Wall South, and False Wall West.
     */
    distribute_fremen_forces: tool({
      description: `Distribute your 10 starting forces across three territories.

IMPORTANT: Use these EXACT territory IDs as parameter names:
- sietch_tabr (number 0-10)
- false_wall_south (number 0-10)
- false_wall_west (number 0-10)

The three numbers MUST add up to exactly 10.

Example: { "sietch_tabr": 5, "false_wall_south": 3, "false_wall_west": 2 }

Strategic considerations:
- sietch_tabr is your stronghold (needed for victory)
- false_wall_south and false_wall_west provide defensive positions`,
      inputSchema: FremenForceDistributionSchema,
      execute: async (params: z.infer<typeof FremenForceDistributionSchema>) => {
        const { sietch_tabr, false_wall_south, false_wall_west } = params;

        // Validate total = 10
        const total = sietch_tabr + false_wall_south + false_wall_west;
        if (total !== 10) {
          return failureResult(
            `Invalid distribution: total forces must equal 10 (got ${total})`,
            { code: 'INVALID_DISTRIBUTION', message: `Total forces must equal 10, got ${total}` },
            false
          );
        }

        const distribution: Record<string, number> = {
          sietch_tabr,
          false_wall_south,
          false_wall_west,
        };

        return successResult(
          `Fremen forces distributed: ${sietch_tabr} in Sietch Tabr, ${false_wall_south} in False Wall South, ${false_wall_west} in False Wall West`,
          { distribution },
          false
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const SETUP_TOOL_NAMES = ['select_traitor', 'bg_prediction', 'distribute_fremen_forces'] as const;
export type SetupToolName = (typeof SETUP_TOOL_NAMES)[number];
