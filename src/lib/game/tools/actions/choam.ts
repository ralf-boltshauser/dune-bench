/**
 * CHOAM Charity Phase Tools
 *
 * Tools for the CHOAM Charity phase where eligible players can claim charity.
 */

import { tool } from 'ai';
import type { ToolContextManager } from '../context';
import { successResult } from '../types';
import { ClaimCharitySchema, PassActionSchema } from '../schemas';

// =============================================================================
// CHOAM CHARITY TOOLS
// =============================================================================

/**
 * Create CHOAM charity phase tools bound to a context manager.
 */
export function createChoamTools(ctx: ToolContextManager) {
  return {
    /**
     * Claim CHOAM charity.
     * 
     * Rule 1.03.01: Players with 0 or 1 spice can claim CHOAM Charity
     * Rule 2.02.09 (Advanced): Bene Gesserit always eligible regardless of spice
     * 
     * You will receive spice from the bank to bring your total to 2 spice.
     * This is optional - you can decline if you have a strategic reason.
     */
    claim_charity: tool({
      description: `Claim CHOAM charity to receive spice from the bank.

Rules:
- Standard: Eligible if you have 0 or 1 spice
- Bene Gesserit (Advanced): Always eligible regardless of spice
- You will receive enough spice to bring your total to 2 spice
- This is free spice with no strings attached
- You can decline if you have a strategic reason (rare)

This is optional - only claim if you want the spice.`,
      inputSchema: ClaimCharitySchema,
      execute: async (_params, _options) => {
        return successResult(
          'Claimed CHOAM charity',
          { faction: ctx.faction, action: 'claim_charity' },
          false
        );
      },
    }),

    /**
     * Pass on claiming CHOAM charity.
     */
    pass: tool({
      description: `Pass on claiming CHOAM charity.

You decline to receive charity spice this turn.
This is rarely done, but you may have a strategic reason to decline.`,
      inputSchema: PassActionSchema,
      execute: async (_params, _options) => {
        return successResult(
          'Passed on CHOAM charity',
          { faction: ctx.faction, action: 'pass' },
          false
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const CHOAM_TOOL_NAMES = ['claim_charity', 'pass'] as const;
export type ChoamToolName = (typeof CHOAM_TOOL_NAMES)[number];

