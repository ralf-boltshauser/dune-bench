/**
 * Phase Event Creation
 * 
 * Centralized event creation for phase lifecycle events.
 */

import { Phase } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type HandSizeDeclaration } from "../types";

/**
 * Create a HAND_SIZE_DECLARED event.
 */
export function createHandSizeDeclaredEvent(
  declarations: HandSizeDeclaration[]
): PhaseEvent {
  return {
    type: "HAND_SIZE_DECLARED",
    data: { declarations },
    message: `Hand size declarations: ${declarations
      .map((d) => `${d.faction}: ${d.category}`)
      .join(", ")}`,
  };
}

/**
 * Create a BIDDING_COMPLETE event.
 */
export function createBiddingCompleteEvent(): PhaseEvent {
  return {
    type: "BIDDING_COMPLETE",
    data: { phase: Phase.BIDDING },
    message: "Bidding complete",
  };
}

/**
 * Create a CARD_WON event.
 */
export function createCardWonEvent(
  winner: string,
  amount: number,
  cardIndex: number
): PhaseEvent {
  return {
    type: "CARD_WON",
    data: {
      winner,
      amount,
      cardIndex,
    },
    message: `${winner} wins the auction for ${amount} spice`,
  };
}

/**
 * Create a CARD_DRAWN_FREE event (for Harkonnen TOP CARD).
 */
export function createCardDrawnFreeEvent(
  faction: string,
  ability: string
): PhaseEvent {
  return {
    type: "CARD_DRAWN_FREE",
    data: { faction, ability },
    message: `${faction} draws a free card (${ability} ability)`,
  };
}

/**
 * Create an ERROR event.
 */
export function createErrorEvent(
  faction: string,
  error: string,
  message: string
): PhaseEvent {
  return {
    type: "ERROR",
    data: {
      faction,
      error,
      message,
    },
    message,
  };
}

/**
 * Create a SPICE_REFUNDED event.
 */
export function createSpiceRefundedEvent(
  faction: string,
  amount: number,
  reason: string
): PhaseEvent {
  return {
    type: "SPICE_REFUNDED",
    data: { faction, amount, reason },
    message: `${faction} refunded ${amount} spice (${reason})`,
  };
}

