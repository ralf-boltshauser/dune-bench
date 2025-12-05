/**
 * Bid Event Creation
 * 
 * Centralized event creation for bid-related events.
 */

import { FACTION_NAMES, Faction } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type BiddingContextWithCards } from "../types";

/**
 * Create a BID_PLACED event.
 */
export function createBidPlacedEvent(
  faction: Faction,
  amount: number
): PhaseEvent {
  return {
    type: "BID_PLACED",
    data: { faction, amount },
    message: `${FACTION_NAMES[faction]} bids ${amount} spice`,
  };
}

/**
 * Create a BID_PASSED event.
 */
export function createBidPassedEvent(
  faction: Faction,
  reason: string,
  message?: string
): PhaseEvent {
  return {
    type: "BID_PASSED",
    data: { faction, reason },
    message: message ?? `${FACTION_NAMES[faction]} passes`,
  };
}

/**
 * Create a BID_REJECTED event (used internally, creates BID_PASSED with rejection reason).
 */
export function createBidRejectedEvent(
  context: BiddingContextWithCards,
  faction: Faction,
  reason: string,
  errorMessage: string
): PhaseEvent {
  return createBidPassedEvent(
    faction,
    reason,
    `${FACTION_NAMES[faction]} bid rejected: ${errorMessage}`
  );
}

/**
 * Create a KARAMA_FREE_CARD event.
 */
export function createKaramaFreeCardEvent(
  faction: Faction,
  cardIndex: number,
  cardId: string,
  cardName?: string
): PhaseEvent {
  return {
    type: "KARAMA_FREE_CARD",
    data: {
      faction,
      cardIndex,
      cardId,
      cardName,
    },
    message: `${FACTION_NAMES[faction]} trades Karama for the current treachery card (auction ends immediately)`,
  };
}

/**
 * Create a KARAMA_BUY_WITHOUT_PAYING event.
 */
export function createKaramaBuyWithoutPayingEvent(
  faction: Faction,
  amount: number
): PhaseEvent {
  return {
    type: "KARAMA_BUY_WITHOUT_PAYING",
    data: { faction, amount },
    message: `${FACTION_NAMES[faction]} uses Karama to buy card without paying spice`,
  };
}

