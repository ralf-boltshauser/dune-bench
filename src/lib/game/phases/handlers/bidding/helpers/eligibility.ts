/**
 * Eligibility Checking
 * 
 * Single source of truth for bid eligibility logic.
 */

import { getFactionMaxHandSize, getFactionState, validateHandSize } from "../../../../state";
import { canUseKarama } from "../../../../rules/karama";
import { Faction, type GameState } from "../../../../types";
import { type BiddingContextWithCards } from "../types";
import { calculateMinimumBid } from "./minimum-bid";
import { hasKaramaFreeCard } from "./karama-flags";

/**
 * Check if a faction is eligible to bid on the current auction.
 * Considers hand size, spice availability, and Karama options.
 * 
 * This is the SINGLE SOURCE OF TRUTH for eligibility checking.
 */
export function isEligibleToBid(
  state: GameState,
  faction: Faction,
  context: BiddingContextWithCards
): boolean {
  const factionState = getFactionState(state, faction);
  const maxHand = getFactionMaxHandSize(faction);

  // Defensive assertion: validate current hand size before checking eligibility
  validateHandSize(state, faction);

  // @rule 1.04.03
  // @rule 2.05.07 - TRAMENDOUSLY TREACHEROUS: Harkonnen hand size is 8, must pass when at 8
  // Can't bid if hand is full
  if (factionState.hand.length >= maxHand) {
    return false;
  }

  // Check if faction can afford minimum bid OR has karama card OR has karama free card active
  // Rule 1.04.06.01: "The player who bids first must bid 1 spice or more otherwise they must pass."
  const minimumBid = calculateMinimumBid(context);

  const canAffordMinimumBid = factionState.spice >= minimumBid;
  const hasKarama = canUseKarama(state, faction);
  const karamaFreeCardActive = hasKaramaFreeCard(state, faction);

  // Can bid if they can afford minimum bid OR have karama card OR have karama free card active
  // (Karama allows bidding over spice limit, buying without paying, or trading for free card)
  if (!canAffordMinimumBid && !hasKarama && !karamaFreeCardActive) {
    return false;
  }

  return true;
}

/**
 * Get all factions eligible to bid (hand not full).
 */
export function getEligibleBidders(
  state: GameState,
  context: BiddingContextWithCards,
  biddingOrder: Faction[]
): Faction[] {
  return biddingOrder.filter((faction) => isEligibleToBid(state, faction, context));
}

/**
 * Get the reason why a faction is ineligible to bid.
 * Returns null if eligible.
 */
export function getIneligibilityReason(
  state: GameState,
  faction: Faction,
  context: BiddingContextWithCards
): "full_hand" | "insufficient_spice" | null {
  const factionState = getFactionState(state, faction);
  const maxHand = getFactionMaxHandSize(faction);

  // Check if hand is full
  if (factionState.hand.length >= maxHand) {
    return "full_hand";
  }

  // Check if faction can afford minimum bid OR has karama card OR has karama free card active
  const minimumBid = calculateMinimumBid(context);
  const canAffordMinimumBid = factionState.spice >= minimumBid;
  const hasKarama = canUseKarama(state, faction);
  const karamaFreeCardActive = hasKaramaFreeCard(state, faction);

  if (!canAffordMinimumBid && !hasKarama && !karamaFreeCardActive) {
    return "insufficient_spice";
  }

  return null;
}

