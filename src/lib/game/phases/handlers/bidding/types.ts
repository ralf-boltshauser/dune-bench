/**
 * Bidding Phase Types
 * 
 * Extended types for bidding phase implementation.
 */

import { type FactionState, type TreacheryCard } from "../../../types";
import { type BiddingPhaseContext } from "../../types";

/**
 * Extended FactionState with optional Karama-related runtime properties.
 * These properties are added temporarily during bidding phase.
 */
export type FactionStateWithKarama = FactionState & {
  karamaBiddingActive?: boolean;
  karamaFreeCardActive?: boolean;
};

/**
 * Extended bidding context with auction cards.
 */
export type BiddingContextWithCards = BiddingPhaseContext & {
  auctionCards?: TreacheryCard[];
};

/**
 * Hand size declaration data.
 */
export interface HandSizeDeclaration {
  faction: string;
  category: string;
  handSize: number;
}

