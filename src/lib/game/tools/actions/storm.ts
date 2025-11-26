/**
 * Storm Phase Tools
 *
 * Tools for the Storm phase where players dial storm movement.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import { StormDialSchema } from '../schemas';
import { GAME_CONSTANTS } from '../../data';

// =============================================================================
// STORM TOOLS
// =============================================================================

/**
 * Create storm phase tools bound to a context manager.
 */
export function createStormTools(ctx: ToolContextManager) {
  return {
    /**
     * Dial storm movement value.
     */
    dial_storm: tool({
      description: `Dial a number for storm movement.

On Turn 1: Dial 0-20. The two players nearest the storm start dial, and the total determines initial storm position.

On later turns: Dial 1-3. The two players who last used battle wheels dial, and the total (2-6) determines how many sectors the storm moves counterclockwise.

The storm destroys forces in sand territories and spice in its path.`,
      inputSchema: StormDialSchema,
      execute: async (params: z.infer<typeof StormDialSchema>, options) => {
        const { dial } = params;
        const state = ctx.state;
        const turn = state.turn;

        // Validate dial range based on turn
        const maxDial = turn === 1 ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL : GAME_CONSTANTS.MAX_STORM_DIAL;
        const minDial = turn === 1 ? 0 : 1;

        if (dial < minDial || dial > maxDial) {
          return failureResult(
            `Invalid storm dial: ${dial}`,
            {
              code: 'INVALID_DIAL',
              message: `Storm dial must be between ${minDial} and ${maxDial} on turn ${turn}`,
              suggestion: `Choose a number from ${minDial} to ${maxDial}`,
              field: 'dial',
              providedValue: dial,
              validRange: { min: minDial, max: maxDial },
            },
            false
          );
        }

        // Note: Actual storm processing happens in the phase handler
        // This tool just validates and returns the dial value
        return successResult(
          `Dialed ${dial} for storm movement`,
          { dial, turn, faction: ctx.faction },
          false // State is updated by phase handler
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const STORM_TOOL_NAMES = ['dial_storm'] as const;
export type StormToolName = (typeof STORM_TOOL_NAMES)[number];
