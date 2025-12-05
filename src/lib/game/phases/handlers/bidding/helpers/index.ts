/**
 * Bidding Phase Helpers
 * 
 * Re-exports all helper functions.
 */

// Eligibility
export {
  isEligibleToBid,
  getEligibleBidders,
  getIneligibilityReason,
} from "./eligibility";

// Minimum bid
export {
  isOpeningBid,
  calculateMinimumBid,
} from "./minimum-bid";

// Active bidders
export {
  getActiveBidders,
  shouldResolveAuction,
} from "./active-bidders";

// Karama flags
export {
  getKaramaFlags,
  hasKaramaFreeCard,
  hasKaramaBidding,
  clearKaramaFlags,
  type KaramaFlags,
} from "./karama-flags";

// Context updates
export {
  resetAuctionContext,
  updateBidContext,
  addPassedFaction,
  incrementCardIndex,
  markCardForReturn,
} from "./context-updates";

// Card management
export {
  getRemainingAuctionCards,
  returnCardsToDeckAndShuffle,
} from "./card-management";

// Phase transitions
export {
  endBiddingPhase,
} from "./phase-transitions";

// Note: handleBoughtIn is exported from ../helpers.ts (not from subdirectory)
// to avoid circular dependencies

