/**
 * Active Bidders Calculation
 * 
 * Single source of truth for active bidder logic.
 */

import { Faction, type GameState } from "../../../../types";
import { type BiddingContextWithCards } from "../types";
import { isEligibleToBid } from "./eligibility";

/**
 * Get all active bidders (eligible and not passed).
 */
export function getActiveBidders(
  state: GameState,
  context: BiddingContextWithCards,
  biddingOrder: Faction[]
): Faction[] {
  return biddingOrder.filter(
    (faction) =>
      !context.passedFactions.has(faction) &&
      isEligibleToBid(state, faction, context)
  );
}

/**
 * Check if auction should resolve (high bidder wins).
 * 
 * Auction resolves when:
 * 1. There IS a high bidder and only they remain, OR
 * 2. There IS a high bidder and no active bidders remain (everyone else passed/can't bid)
 */
export function shouldResolveAuction(
  context: BiddingContextWithCards,
  activeBidders: Faction[]
): boolean {
  if (context.highBidder === null) {
    return false;
  }

  // Only high bidder remains
  const onlyHighBidderRemains =
    activeBidders.length === 1 && activeBidders[0] === context.highBidder;

  // No active bidders (everyone passed/can't bid)
  const noActiveBidders = activeBidders.length === 0;

  return onlyHighBidderRemains || noActiveBidders;
}

