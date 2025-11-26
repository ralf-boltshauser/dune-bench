/**
 * Bidding validation rules.
 * Handles treachery card auction bidding.
 */

import { Faction, type GameState } from '../types';
import { getFactionState, getFactionHandSize, canFactionBid, getFactionMaxHandSize } from '../state';
import {
  type ValidationResult,
  type BidSuggestion,
  validResult,
  invalidResult,
  createError,
} from './types';

// =============================================================================
// BIDDING ELIGIBILITY
// =============================================================================

/**
 * Check if a faction is eligible to bid (hand not full).
 */
export function validateBiddingEligibility(
  state: GameState,
  faction: Faction
): ValidationResult<never> {
  const handSize = getFactionHandSize(state, faction);
  const maxHandSize = getFactionMaxHandSize(faction);

  const context = {
    handSize,
    maxHandSize,
    isEligible: handSize < maxHandSize,
  };

  if (handSize >= maxHandSize) {
    return invalidResult(
      [
        createError(
          'HAND_FULL',
          `Your hand is full (${handSize}/${maxHandSize} cards)`,
          {
            actual: handSize,
            expected: `< ${maxHandSize}`,
            suggestion: 'You must pass on all bids this phase',
          }
        ),
      ],
      context
    );
  }

  return validResult(context);
}

// =============================================================================
// BID VALIDATION
// =============================================================================

/**
 * Validate a bid on a treachery card.
 */
export function validateBid(
  state: GameState,
  faction: Faction,
  bidAmount: number,
  currentHighBid: number,
  isOpeningBid: boolean = false
): ValidationResult<BidSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  const handSize = getFactionHandSize(state, faction);
  const maxHandSize = getFactionMaxHandSize(faction);

  const context = {
    spiceAvailable: factionState.spice,
    currentHighBid,
    bidAmount,
    handSize,
    maxHandSize,
    isOpeningBid,
  };

  // Check: Hand not full
  if (handSize >= maxHandSize) {
    errors.push(
      createError(
        'HAND_FULL',
        `Cannot bid - your hand is full (${handSize}/${maxHandSize})`,
        { suggestion: 'You must pass' }
      )
    );
    return invalidResult(errors, context);
  }

  // Check: Bid is positive
  if (bidAmount < 1) {
    errors.push(
      createError(
        'BID_TOO_LOW',
        'Bid must be at least 1 spice',
        {
          field: 'bidAmount',
          actual: bidAmount,
          expected: '>= 1',
          suggestion: 'Bid at least 1 spice or pass',
        }
      )
    );
  }

  // Check: Bid is higher than current (unless opening bid)
  if (!isOpeningBid && bidAmount <= currentHighBid) {
    errors.push(
      createError(
        'BID_TOO_LOW',
        `Bid must be higher than current bid of ${currentHighBid}`,
        {
          field: 'bidAmount',
          actual: bidAmount,
          expected: `> ${currentHighBid}`,
          suggestion: `Bid at least ${currentHighBid + 1} spice`,
        }
      )
    );
  }

  // Check: Sufficient spice (without Karama)
  // Note: With Karama, player can bid more than they have
  if (bidAmount > factionState.spice) {
    errors.push(
      createError(
        'BID_EXCEEDS_SPICE',
        `Bid of ${bidAmount} exceeds your spice (${factionState.spice})`,
        {
          field: 'bidAmount',
          actual: bidAmount,
          expected: `<= ${factionState.spice}`,
          suggestion: factionState.spice > currentHighBid
            ? `Bid ${factionState.spice} spice (your maximum)`
            : 'Pass or use Karama to bid more than you have',
        }
      )
    );
  }

  if (errors.length === 0) {
    return validResult({
      ...context,
      remainingSpice: factionState.spice - bidAmount,
    });
  }

  // Generate suggestions
  const suggestions = generateBidSuggestions(
    factionState.spice,
    currentHighBid,
    isOpeningBid
  );

  return invalidResult(errors, context, suggestions);
}

/**
 * Generate bid suggestions.
 */
function generateBidSuggestions(
  spiceAvailable: number,
  currentHighBid: number,
  isOpeningBid: boolean
): BidSuggestion[] {
  const suggestions: BidSuggestion[] = [];
  const minBid = isOpeningBid ? 1 : currentHighBid + 1;

  if (minBid <= spiceAvailable) {
    // Minimum bid
    suggestions.push({
      amount: minBid,
      remainingSpice: spiceAvailable - minBid,
      isMinimumBid: true,
    });

    // Half spice bid
    const halfBid = Math.floor(spiceAvailable / 2);
    if (halfBid > minBid) {
      suggestions.push({
        amount: halfBid,
        remainingSpice: spiceAvailable - halfBid,
        isMinimumBid: false,
      });
    }

    // All-in bid
    if (spiceAvailable > minBid) {
      suggestions.push({
        amount: spiceAvailable,
        remainingSpice: 0,
        isMinimumBid: false,
      });
    }
  }

  return suggestions;
}

// =============================================================================
// ALLY BIDDING SUPPORT
// =============================================================================

/**
 * Validate ally paying for part of a bid.
 * Allies can help each other by paying some or all of the cost.
 */
export function validateAllyBidSupport(
  state: GameState,
  biddingFaction: Faction,
  allyFaction: Faction,
  supportAmount: number,
  totalBid: number
): ValidationResult<never> {
  const errors: ReturnType<typeof createError>[] = [];
  const bidderState = getFactionState(state, biddingFaction);
  const allyState = getFactionState(state, allyFaction);

  const context = {
    bidderSpice: bidderState.spice,
    allySpice: allyState.spice,
    supportAmount,
    totalBid,
    bidderContribution: totalBid - supportAmount,
  };

  // Check: They are actually allied
  if (bidderState.allyId !== allyFaction) {
    errors.push(
      createError(
        'ABILITY_NOT_AVAILABLE',
        `${biddingFaction} and ${allyFaction} are not allied`,
        { suggestion: 'Only allies can help pay for bids' }
      )
    );
    return invalidResult(errors, context);
  }

  // Check: Ally has enough spice
  if (supportAmount > allyState.spice) {
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Ally only has ${allyState.spice} spice, cannot contribute ${supportAmount}`,
        {
          field: 'supportAmount',
          actual: supportAmount,
          expected: `<= ${allyState.spice}`,
          suggestion: `Ally can contribute up to ${allyState.spice} spice`,
        }
      )
    );
  }

  // Check: Combined spice covers bid
  const bidderContribution = totalBid - supportAmount;
  if (bidderContribution > bidderState.spice) {
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Even with ally support, you need ${bidderContribution} spice but only have ${bidderState.spice}`,
        {
          suggestion: `Ask ally to contribute ${totalBid - bidderState.spice} or more`,
        }
      )
    );
  }

  if (errors.length === 0) {
    return validResult(context);
  }

  return invalidResult(errors, context);
}

// =============================================================================
// AUCTION STATE HELPERS
// =============================================================================

/**
 * Get list of factions eligible to bid in current auction.
 */
export function getEligibleBidders(state: GameState): Faction[] {
  const eligible: Faction[] = [];

  for (const [faction] of state.factions) {
    if (canFactionBid(state, faction)) {
      eligible.push(faction);
    }
  }

  return eligible;
}

/**
 * Determine the starting bidder based on storm order.
 */
export function getStartingBidder(
  state: GameState,
  previousBidder?: Faction
): Faction | null {
  const eligible = getEligibleBidders(state);
  if (eligible.length === 0) return null;

  // First card: first player in storm order who is eligible
  if (!previousBidder) {
    for (const faction of state.stormOrder) {
      if (eligible.includes(faction)) {
        return faction;
      }
    }
    return eligible[0];
  }

  // Subsequent cards: next eligible player to the right of previous bidder
  const prevIndex = state.stormOrder.indexOf(previousBidder);
  for (let i = 1; i <= state.stormOrder.length; i++) {
    const nextFaction = state.stormOrder[(prevIndex + i) % state.stormOrder.length];
    if (eligible.includes(nextFaction)) {
      return nextFaction;
    }
  }

  return null;
}
