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

    /**
     * Play Weather Control card to control storm movement.
     */
    play_weather_control: tool({
      description: `Play Weather Control card to control the storm movement this phase.

You can move the storm 0-10 sectors counterclockwise:
- 0 = prevent the storm from moving (no movement)
- 1-10 = move the storm that many sectors counterclockwise

This card overrides the normal storm dialing procedure. The card is discarded after use.

If you do not want to play Weather Control this turn, simply do not call this tool - you can save the card for a future turn.

Only available after Turn 1 (cannot be played on Turn 1).`,
      inputSchema: z.object({
        movement: z.number()
          .int()
          .min(0)
          .max(10)
          .describe('Number of sectors to move the storm (0 = no movement, 1-10 = move that many sectors)'),
      }),
      execute: async (params: { movement: number }, options) => {
        const { movement } = params;
        const state = ctx.state;

        // Weather Control cannot be played on Turn 1
        if (state.turn === 1) {
          return failureResult(
            'Weather Control cannot be played on Turn 1',
            {
              code: 'INVALID_PHASE',
              message: 'Weather Control can only be played after Turn 1',
            },
            false
          );
        }

        // Validate movement range
        if (movement < 0 || movement > 10) {
          return failureResult(
            `Invalid Weather Control movement: ${movement}`,
            {
              code: 'INVALID_MOVEMENT',
              message: 'Weather Control movement must be between 0 and 10',
              suggestion: 'Choose a number from 0 (no movement) to 10 (maximum movement)',
              field: 'movement',
              providedValue: movement,
              validRange: { min: 0, max: 10 },
            },
            false
          );
        }

        // Note: Actual Weather Control processing happens in the phase handler
        // This tool just validates and returns the movement value
        return successResult(
          movement === 0
            ? 'Played Weather Control to prevent storm movement'
            : `Played Weather Control to move storm ${movement} sectors`,
          { movement, faction: ctx.faction },
          false // State is updated by phase handler
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const STORM_TOOL_NAMES = ['dial_storm', 'play_weather_control'] as const;
export type StormToolName = (typeof STORM_TOOL_NAMES)[number];
