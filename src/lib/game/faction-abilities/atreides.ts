/**
 * Atreides Faction Abilities
 * 
 * Rule references from handwritten-rules/0_setup.md and handwritten-rules/4_bidding.md
 */

import { Faction, FACTION_NAMES, type GameState } from '../types';
import { type AgentRequest } from '../phases/types';
import { getTreacheryCardDefinition } from '../data';
import type { AbilityContext, AbilityResult } from './types';

// =============================================================================
// BIDDING PHASE ABILITIES
// =============================================================================

/**
 * @rule 2.01.05
 * BIDDING ability: During the Bidding Phase when a Treachery Card comes up for purchase,
 * you may look at it before any faction bids on it.
 * 
 * ARCHITECTURAL SAFEGUARD: This function is idempotent - it checks if Atreides has already
 * peeked at this card index to prevent duplicate requests and infinite loops.
 * 
 * @param context - Ability context containing state, card info, and auction details
 * @param cardIndex - The index of the card in the auction (0-based)
 * @param atreidesPeekedCards - Set of card indices that Atreides has already peeked at
 * @returns Ability result with peek request if Atreides is in game and hasn't peeked yet
 */
export function createAtreidesBiddingPeekRequest(
  context: AbilityContext & {
    cardId: string;
    auctionNumber: number;
    totalAuctions: number;
    startingBidder: Faction;
  },
  cardIndex: number,
  atreidesPeekedCards: Set<number>
): AbilityResult {
  const { state, cardId, auctionNumber, totalAuctions, startingBidder } = context;

  // Check if Atreides is in the game
  if (!state.factions.has(Faction.ATREIDES)) {
    return { shouldTrigger: false };
  }

  // ARCHITECTURAL SAFEGUARD: Prevent duplicate peek requests for the same card
  // This makes the function idempotent and prevents infinite loops
  if (atreidesPeekedCards.has(cardIndex)) {
    // Atreides has already peeked at this card - don't create another request
    return { shouldTrigger: false };
  }

  const cardDef = getTreacheryCardDefinition(cardId);

  const request: AgentRequest = {
    factionId: Faction.ATREIDES,
    requestType: 'PEEK_CARD',
    prompt: `A new Treachery Card is up for auction. As Atreides, you may look at it before any faction bids on it (Prescience ability).\n\nCard: ${
      cardDef?.name ?? 'Unknown Card'
    }\nType: ${
      cardDef?.type ?? 'Unknown'
    }\n\nThis card will be auctioned starting with ${
      FACTION_NAMES[startingBidder]
    }.`,
    context: {
      cardInfo: {
        id: cardId,
        name: cardDef?.name,
        type: cardDef?.type,
      },
      auctionNumber,
      totalAuctions,
      startingBidder,
      isAtreides: true,
      cardIndex, // Include card index for tracking
    },
    availableActions: ['PASS'], // This is informational - they can acknowledge
  };

  return {
    shouldTrigger: true,
    request,
  };
}

/**
 * Check if a response is an Atreides PEEK_CARD acknowledgment
 * 
 * @param response - Agent response to check
 * @param isAuctionStart - Whether we're at auction start (no bids yet)
 * @returns True if this is a PEEK_CARD acknowledgment
 */
export function isAtreidesPeekAcknowledgment(
  response: { factionId: Faction; actionType: string; passed?: boolean },
  isAuctionStart: boolean
): boolean {
  return (
    response.factionId === Faction.ATREIDES &&
    isAuctionStart &&
    (response.actionType === 'PASS' || response.passed === true)
  );
}

/**
 * Create CARD_PEEKED event for logging
 * 
 * @param cardIndex - Index of the card that was peeked
 * @returns Event object
 */
export function createCardPeekedEvent(cardIndex: number) {
  return {
    type: 'CARD_PEEKED' as const,
    data: {
      faction: Faction.ATREIDES,
      cardIndex,
    },
    message: 'Atreides has seen the card (Prescience ability)',
  };
}

/**
 * Check if Atreides can see a card during bidding
 * (They always can, per rule 2.01.05)
 * 
 * @param bidder - The faction that's bidding
 * @returns True if bidder is Atreides
 */
export function canAtreidesSeeCard(bidder: Faction): boolean {
  return bidder === Faction.ATREIDES;
}

/**
 * Get card description for bidding prompt
 * Atreides sees the full card name, others see "unknown Treachery card"
 * 
 * @param cardDef - Card definition
 * @param isAtreides - Whether the bidder is Atreides
 * @returns Card description string
 */
export function getCardDescriptionForBidding(
  cardDef: { name?: string } | null | undefined,
  isAtreides: boolean
): string {
  return isAtreides
    ? `${cardDef?.name ?? 'Unknown Card'}`
    : 'an unknown Treachery card';
}

