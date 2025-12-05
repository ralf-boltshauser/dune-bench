/**
 * Bidding Phase Logger
 * 
 * Centralized, configurable logging for bidding phase.
 */

import { FACTION_NAMES, Faction } from "../../../../types";
import { type BiddingContextWithCards } from "../types";
import { type HandSizeDeclaration } from "../types";

/**
 * Log level configuration.
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

let currentLogLevel: LogLevel = LogLevel.INFO;

/**
 * Set the log level.
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get the current log level.
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Log phase start.
 */
export function logPhaseStart(turn: number): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log("\n" + "=".repeat(80));
    console.log("💰 BIDDING PHASE (Turn " + turn + ")");
    console.log("=".repeat(80));
  }
}

/**
 * Log hand size declarations.
 */
export function logHandDeclarations(declarations: HandSizeDeclaration[]): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log("\n📢 HAND SIZE DECLARATIONS (Rule 1.04.01):\n");
    for (const decl of declarations) {
      console.log(
        `  ${decl.faction}: ${decl.handSize} card(s) (${decl.category})`
      );
    }
  }
}

/**
 * Log eligible bidders count.
 */
export function logEligibleBidders(count: number, cardsToDeal: number): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(`\n📊 Eligible Bidders: ${count}`);
    console.log(`📦 Cards to Deal: ${cardsToDeal} (1 per eligible bidder)\n`);
  }
}

/**
 * Log eligibility check for auction.
 */
export function logEligibilityCheck(
  context: BiddingContextWithCards,
  biddingOrder: Faction[],
  eligibilityMap: Map<Faction, { handSize: number; maxHand: number; isEligible: boolean; reason?: "full_hand" | "insufficient_spice" }>
): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `\n📋 Checking eligibility for auction ${context.currentCardIndex + 1}:`
    );
    for (const faction of biddingOrder) {
      const info = eligibilityMap.get(faction);
      if (info) {
        let statusText: string;
        if (info.isEligible) {
          statusText = "✅ Eligible";
        } else {
          if (info.reason === "full_hand") {
            statusText = "❌ Ineligible (full hand)";
          } else if (info.reason === "insufficient_spice") {
            statusText = "❌ Ineligible (insufficient spice)";
          } else {
            statusText = "❌ Ineligible";
          }
        }
        console.log(
          `  ${FACTION_NAMES[faction]}: ${info.handSize}/${info.maxHand} cards ${statusText}`
        );
      }
    }
  }
}

/**
 * Log auction start.
 */
export function logAuctionStart(
  context: BiddingContextWithCards,
  cardName?: string
): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `\n🎴 AUCTION ${context.currentCardIndex + 1}/${context.cardsForAuction.length}`
    );
    console.log(
      `   Starting Bidder: ${FACTION_NAMES[context.startingBidder]}`
    );
    console.log(
      `   Card: ${cardName ?? "Unknown"} (secret - only Atreides can see)\n`
    );
  }
}

/**
 * Log Atreides peek.
 */
export function logAtreidesPeek(cardName?: string): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `  👁️  Atreides sees card: ${cardName ?? "Unknown"} (Prescience ability - before bidding starts)`
    );
  }
}

/**
 * Log bid placed.
 */
export function logBidPlaced(faction: Faction, amount: number): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `  ✅ ${FACTION_NAMES[faction]} bids ${amount} spice (accepted)`
    );
  }
}

/**
 * Log bid passed.
 */
export function logBidPassed(faction: Faction, reason?: string): void {
  if (currentLogLevel >= LogLevel.INFO) {
    const reasonText = reason ? ` (${reason})` : "";
    console.log(`  ⏭️  ${FACTION_NAMES[faction]} passes${reasonText}`);
  }
}

/**
 * Log bid rejected.
 */
export function logBidRejected(faction: Faction, errorMessage: string): void {
  if (currentLogLevel >= LogLevel.WARN) {
    console.log(`  ❌ Bid rejected: ${errorMessage}`);
  }
}

/**
 * Log bid validation attempt.
 */
export function logBidValidation(
  faction: Faction,
  bidAmount: number,
  currentBid: number,
  minimumBid: number,
  isOpeningBid: boolean
): void {
  if (currentLogLevel >= LogLevel.DEBUG) {
    console.log(
      `  🔍 Validating bid: ${FACTION_NAMES[faction]} bids ${bidAmount} (current: ${currentBid}, minimum: ${minimumBid}, opening: ${isOpeningBid})`
    );
  }
}

/**
 * Log auto-skip.
 */
export function logAutoSkip(
  faction: Faction,
  spice: number,
  minimumBid: number
): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `  ⏭️  ${FACTION_NAMES[faction]} auto-skipped (${spice} spice < ${minimumBid} minimum, no karama)`
    );
  }
}

/**
 * Log BOUGHT-IN rule.
 */
export function logBoughtIn(): void {
  if (currentLogLevel >= LogLevel.WARN) {
    console.log(
      `\n⚠️  All eligible bidders passed on this card - BOUGHT-IN rule applies`
    );
    console.log(
      `   All remaining cards will be returned to deck and bidding ends\n`
    );
  }
}

/**
 * Log cards returned to deck.
 */
export function logCardsReturned(count: number, reason: string): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `\n📦 Returning ${count} remaining card(s) to deck (${reason})`
    );
  }
}

/**
 * Log no eligible bidders.
 */
export function logNoEligibleBidders(): void {
  if (currentLogLevel >= LogLevel.WARN) {
    console.log(
      `\n⚠️  No eligible bidders (all hands full) - bidding phase ends`
    );
  }
}

/**
 * Log no active bidders.
 */
export function logNoActiveBidders(): void {
  if (currentLogLevel >= LogLevel.WARN) {
    console.log(`\n⚠️  No active bidders remaining`);
  }
}

/**
 * Log Karama free card.
 */
export function logKaramaFreeCard(faction: Faction): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(
      `\n🃏 Karama free card: ${FACTION_NAMES[faction]} immediately takes current treachery card for free`
    );
  }
}

/**
 * Log error.
 */
export function logError(message: string, context?: Record<string, unknown>): void {
  if (currentLogLevel >= LogLevel.ERROR) {
    console.error(`ERROR: ${message}`, context ? context : "");
  }
}

