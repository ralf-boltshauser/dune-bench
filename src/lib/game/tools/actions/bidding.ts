/**
 * Bidding Phase Tools
 *
 * Tools for the Bidding phase where players bid on treachery cards.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import { PlaceBidSchema, PassActionSchema } from '../schemas';
import { getFactionState } from '../../state';
import { validateBid } from '../../rules';

// =============================================================================
// BIDDING TOOLS
// =============================================================================

/**
 * Create bidding phase tools bound to a context manager.
 */
export function createBiddingTools(ctx: ToolContextManager) {
  return {
    /**
     * Place a bid on the current treachery card.
     */
    place_bid: tool({
      description: `Bid spice on the current treachery card up for auction.

Rules:
- Your bid must be higher than the current bid
- You cannot bid more spice than you have
- If you win, you pay the bid amount and receive the card
- Spice goes to the Emperor (if in game) or the bank
- Atreides can see the card before bidding (prescience)

Max hand size is 4 cards (8 for Harkonnen).`,
      inputSchema: PlaceBidSchema,
      execute: async (params: z.infer<typeof PlaceBidSchema>, options) => {
        const { amount } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // For now, assume current bid is 0 and this is opening bid
        // In actual play, current bid comes from phase context
        const currentBid = 0;
        const isOpeningBid = true;

        // Validate the bid
        const validation = validateBid(
          state,
          faction,
          amount,
          currentBid,
          isOpeningBid
        );

        if (!validation.valid) {
          const error = validation.errors[0];
          return failureResult(
            `Bid rejected: ${error.message}`,
            validationToToolError(error),
            false
          );
        }

        return successResult(
          `Bid ${amount} spice`,
          {
            faction,
            amount,
            spiceRemaining: factionState.spice - amount,
          },
          false // State updated by phase handler
        );
      },
    }),

    /**
     * Pass on the current auction.
     */
    pass_bid: tool({
      description: `Pass on bidding for the current treachery card.

Once you pass, you cannot bid again on this card.
If everyone passes, the first eligible player in storm order takes the card for free (buy-in).`,
      inputSchema: PassActionSchema,
      execute: async (params, options) => {
        return successResult(
          'Passed on this auction',
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

export const BIDDING_TOOL_NAMES = ['place_bid', 'pass_bid'] as const;
export type BiddingToolName = (typeof BIDDING_TOOL_NAMES)[number];
