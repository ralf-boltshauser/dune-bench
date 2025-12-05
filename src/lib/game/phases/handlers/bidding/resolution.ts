/**
 * Auction Resolution
 * 
 * Handles auction resolution: payment, card distribution, and special abilities.
 * 
 * Rules:
 * - Payment processing (normal and Karama cases)
 * - Card distribution to winner
 * - Hand size validation
 * - Harkonnen TOP CARD ability (Rule 2.05.08)
 * - No bidder handling
 */

import {
  drawTreacheryCard,
  getFactionMaxHandSize,
  getFactionState,
  logAction,
  removeSpice,
  validateHandSize,
  addSpice,
} from "../../../state";
import {
  CardLocation,
  Faction,
  FACTION_NAMES,
  type GameState,
  type TreacheryCard,
} from "../../../types";
import { type PhaseEvent, type PhaseStepResult } from "../../types";
import { type BiddingContextWithCards } from "./types";
import { endBiddingPhase, incrementCardIndex } from "./helpers";
import { payEmperor, refundFromEmperor } from "./emperor";
import {
  hasKaramaFreeCard,
  hasKaramaBidding,
  clearKaramaFlags,
} from "./helpers";
import {
  createCardWonEvent,
  createCardDrawnFreeEvent,
  createKaramaBuyWithoutPayingEvent,
  createErrorEvent,
  createSpiceRefundedEvent,
} from "./events";
import { logError } from "./logging";

/**
 * Resolve an auction: process payment, distribute card, handle special abilities.
 */
export function resolveAuction(
  context: BiddingContextWithCards,
  state: GameState,
  events: PhaseEvent[],
  biddingOrder: Faction[],
  currentBidderIndex: number
): {
  context: BiddingContextWithCards;
  result: PhaseStepResult;
  currentBidderIndex: number;
} {
  let newState = state;
  const auctionCard =
    context.auctionCards?.[context.currentCardIndex];

  if (context.highBidder && auctionCard) {
    // Winner pays for and receives the card
    const winner = context.highBidder;
    const amount = context.currentBid;
    let winnerState = getFactionState(newState, winner);
    const karamaBiddingActive = hasKaramaBidding(newState, winner);
    const karamaFreeCardActive = hasKaramaFreeCard(newState, winner);

    // Check if this is a free card purchase via Karama trade.
    // NOTE: We no longer model this as a "bid 0". Instead, Karama allows
    // a *legal* winning bid to waive payment (rules enforcement for the
    // bid amount is handled entirely in validateBid()).
    const isFreeCardPurchase = karamaFreeCardActive;

    // Karama card can be used to buy without paying (Rule 3.01.11)
    // The tools set these flags:
    // - karamaBiddingActive: may bid over spice limit (still pay if you win)
    // - karamaFreeCardActive: trade Karama for this auction card and waive payment
    // Determine if payment should be made
    // Payment is NOT made only in these cases:
    // 1. Free card purchase (karamaFreeCardActive)
    // 2. Karama used to buy without paying (karamaBiddingActive, has enough spice, not free card)
    const hasEnoughSpice = amount <= winnerState.spice;
    const usedKaramaToBuyWithoutPaying =
      karamaBiddingActive && hasEnoughSpice && !isFreeCardPurchase;
    const shouldSkipPayment =
      isFreeCardPurchase || usedKaramaToBuyWithoutPaying;

    // Ensure amount is valid (should always be >= 0, but defensive check)
    if (typeof amount !== "number" || amount < 0) {
      logError(`Invalid bid amount in resolveAuction: ${amount} for winner ${winner}`, {
        amount,
        winner,
      });
      // Continue anyway - will attempt to remove spice (removing 0 or negative is handled by removeSpice)
    }

    if (!shouldSkipPayment) {
      // @rule 1.04.06.03
      // Normal payment: Remove spice from winner
      newState = removeSpice(newState, winner, amount);

      // Pay Emperor if in game, otherwise to bank (Rule 2.03.04)
      newState = payEmperor(newState, winner, amount);
    } else if (shouldSkipPayment) {
      // No payment made - either free card or Karama used
      // Note: Emperor does NOT receive payment when payment is skipped
      if (isFreeCardPurchase) {
        // Already logged in bid-processing.ts when Karama free card was triggered
        // Just add event for consistency
        events.push({
          type: "KARAMA_FREE_CARD",
          data: {
            faction: winner,
            amount: 0,
            cardId: auctionCard.definitionId,
          },
          message: `${FACTION_NAMES[winner]} trades Karama for the current treachery card`,
        });
      } else {
        events.push(
          createKaramaBuyWithoutPayingEvent(winner, amount)
        );
      }
    }

    // Clear Karama flags after use
    if (karamaBiddingActive || karamaFreeCardActive) {
      newState = clearKaramaFlags(newState, winner);
      // Update winnerState reference after clearing flag
      winnerState = getFactionState(newState, winner);
    }

    // @rule 1.04.06.03 - Give the specific auction card to winner (not draw from deck!)
    const newFactions = new Map(newState.factions);
    const currentWinnerState = { ...newFactions.get(winner)! };
    const wonCard: TreacheryCard = {
      ...auctionCard,
      location: CardLocation.HAND,
      ownerId: winner,
    };

    // Hand size validation: prevent exceeding max hand size
    const maxHandSize = getFactionMaxHandSize(winner);
    const currentHandSize = currentWinnerState.hand.length;

    if (currentHandSize >= maxHandSize) {
      // This should never happen if eligibility checks are working correctly,
      // but add defensive check to prevent exceeding hand size limit
      logError(
        `[BIDDING] Faction ${FACTION_NAMES[winner]} attempted to purchase card but hand is full (${currentHandSize}/${maxHandSize}). Card not added.`,
        { winner, currentHandSize, maxHandSize }
      );
      events.push(
        createErrorEvent(
          FACTION_NAMES[winner],
          "hand_size_exceeded",
          `${FACTION_NAMES[winner]} cannot receive card: hand is full`
        )
      );

      // Refund payment if payment was made (should not happen, but defensive check)
      if (!shouldSkipPayment && amount > 0) {
        // Refund spice to winner
        newState = addSpice(newState, winner, amount);
        // Remove spice from Emperor if it was paid
        newState = refundFromEmperor(newState, winner, amount);
        events.push(
          createSpiceRefundedEvent(
            FACTION_NAMES[winner],
            amount,
            "hand_size_exceeded"
          )
        );
      }

      // Don't add the card - track it for return to deck
      if (!context.cardsToReturnToDeck) {
        context.cardsToReturnToDeck = [];
      }
      if (auctionCard) {
        context.cardsToReturnToDeck.push(auctionCard.definitionId);
      }
      events.push({
        type: "CARD_RETURNED_TO_DECK",
        data: {
          cardIndex: context.currentCardIndex,
          reason: "hand_size_exceeded",
        },
        message: `Card returned to deck (hand size exceeded)`,
      });

      // Continue with next auction
      // Move to next card
      const errorContext = incrementCardIndex(context);

      if (errorContext.currentCardIndex >= errorContext.cardsForAuction.length) {
        return {
          context: errorContext,
          result: endBiddingPhase(newState, events),
          currentBidderIndex: 0,
        };
      }

      // Return to main handler to start next auction
      return {
        context: errorContext,
        result: {
          state: newState,
          phaseComplete: false,
          pendingRequests: [],
          actions: [],
          events,
        },
        currentBidderIndex: 0,
      };
    }

    currentWinnerState.hand = [...currentWinnerState.hand, wonCard];
    newFactions.set(winner, currentWinnerState);
    newState = { ...newState, factions: newFactions };

    // Defensive assertion: validate hand size after card purchase
    validateHandSize(newState, winner);

    events.push(
      createCardWonEvent(
        FACTION_NAMES[winner],
        amount,
        context.currentCardIndex
      )
    );

    newState = logAction(newState, "CARD_PURCHASED", winner, {
      amount,
      cardIndex: context.currentCardIndex,
    });

    // @rule 2.05.08 - TOP CARD: Harkonnen draws an extra free card when buying
    // "TOP CARD: When you Buy a card, you Draw an extra card for free from
    // the Treachery Deck (unless you are at 7 cards, because you can never
    // have more than 8 total Treachery Cards in hand).✷"
    if (winner === Faction.HARKONNEN) {
      const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
      const maxHand = getFactionMaxHandSize(Faction.HARKONNEN);
      // Can draw if hand size is 7 or less (will become 8)
      if (
        harkonnenState.hand.length < maxHand &&
        newState.treacheryDeck.length > 0
      ) {
        newState = drawTreacheryCard(newState, Faction.HARKONNEN);
        // Defensive assertion: validate hand size after Harkonnen TOP CARD draw
        validateHandSize(newState, Faction.HARKONNEN);
        events.push(
          createCardDrawnFreeEvent(FACTION_NAMES[Faction.HARKONNEN], "TOP_CARD")
        );
        newState = logAction(newState, "CARD_DRAWN_FREE", Faction.HARKONNEN, {
          ability: "TOP_CARD",
        });
      }
    }
  } else {
    // No bidder - per rules 1.04.06, card is set aside and returned to deck
    events.push({
      type: "CARD_RETURNED_TO_DECK",
      data: { cardIndex: context.currentCardIndex },
      message: `No bids - card is set aside and will be returned to the deck`,
    });

    // Track cards to return to deck at end of bidding phase
    if (!context.cardsToReturnToDeck) {
      context.cardsToReturnToDeck = [];
    }
    if (auctionCard) {
      context.cardsToReturnToDeck.push(auctionCard.definitionId);
    }
  }

  // Move to next card
  const updatedContext = incrementCardIndex(context);

  // @rule 1.04.08
  if (updatedContext.currentCardIndex >= updatedContext.cardsForAuction.length) {
    return {
      context: updatedContext,
      result: endBiddingPhase(newState, events),
      currentBidderIndex: 0,
    };
  }

  // Return to main handler to start next auction
  // The main handler will call startNextAuction
  return {
    context: updatedContext,
    result: {
      state: newState,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    },
    currentBidderIndex: 0,
  };
}

