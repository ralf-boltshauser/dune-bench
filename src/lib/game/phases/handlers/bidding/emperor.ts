/**
 * Emperor Special Ability
 * 
 * Handles Emperor spice collection from bidding payments.
 * 
 * Rule 2.03.04: "When any faction buys a Treachery Card, the spice paid
 * goes to the Emperor (if in game), otherwise to the bank."
 */

import { addSpice, removeSpice } from "../../../state";
import { Faction, type GameState } from "../../../types";
import { type PhaseEvent } from "../../types";

/**
 * @rule 2.03.04
 * Process payment to Emperor (or bank if Emperor not in game).
 * 
 * @param state - Current game state
 * @param winner - Faction that won the auction
 * @param amount - Amount to pay
 * @returns Updated game state after payment
 */
export function payEmperor(
  state: GameState,
  winner: Faction,
  amount: number
): GameState {
  // Pay Emperor if in game, otherwise to bank (Rule 2.03.04)
  if (state.factions.has(Faction.EMPEROR) && winner !== Faction.EMPEROR) {
    return addSpice(state, Faction.EMPEROR, amount);
  }
  // If no Emperor or winner is Emperor, payment goes to bank (implicitly removed from winner)
  return state;
}

/**
 * Refund payment from Emperor if payment was made.
 * Used when card purchase fails (e.g., hand size exceeded).
 */
export function refundFromEmperor(
  state: GameState,
  winner: Faction,
  amount: number
): GameState {
  if (
    state.factions.has(Faction.EMPEROR) &&
    winner !== Faction.EMPEROR &&
    amount > 0
  ) {
    return removeSpice(state, Faction.EMPEROR, amount);
  }
  return state;
}

