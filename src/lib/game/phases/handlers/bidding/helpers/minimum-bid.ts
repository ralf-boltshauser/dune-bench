/**
 * Minimum Bid Calculation
 * 
 * Single source of truth for minimum bid calculation.
 */

import { type BiddingContextWithCards } from "../types";

/**
 * Check if this is an opening bid.
 */
export function isOpeningBid(context: BiddingContextWithCards): boolean {
  return context.currentBid === 0 && context.highBidder === null;
}

/**
 * Calculate the minimum bid required.
 * 
 * Rule 1.04.06.01: "The player who bids first must bid 1 spice or more otherwise they must pass."
 * Subsequent bids must be higher than the current bid.
 */
export function calculateMinimumBid(context: BiddingContextWithCards): number {
  if (isOpeningBid(context)) {
    return 1;
  }
  return context.currentBid + 1;
}

