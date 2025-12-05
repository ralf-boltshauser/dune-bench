/**
 * Spice Handling
 *
 * Handles spice dialing payments and spice payouts for killed leaders.
 */

import { addSpice, removeSpice } from "../../../../state";
import type { GameState } from "../../../../types";
import type { CurrentBattle, PhaseEvent } from "../../../types";
import type { BattleResult } from "../../../../rules/types";

/**
 * Apply spice handling (dialing payments and payouts).
 */
export function applySpiceHandling(
  state: GameState,
  battle: CurrentBattle,
  result: BattleResult,
  events: PhaseEvent[]
): GameState {
  let newState = state;

  // @rule 1.13.04.05 - PAYMENT: All spice paid for Spice Dialing is Placed in the Spice Bank.
  // @rule 1.13.05 - LOSING NOTHING: When a traitor card is played, the winner keeps all spice paid to support their Forces.
  if (state.config.advancedRules) {
    const aggressorSpice = battle.aggressorPlan?.spiceDialed ?? 0;
    const defenderSpice = battle.defenderPlan?.spiceDialed ?? 0;
    const winner = result.winner;

    // Winner keeps spice if traitor was revealed
    if (!result.traitorRevealed) {
      // Normal battle - both sides pay spice to bank
      if (aggressorSpice > 0) {
        newState = removeSpice(newState, battle.aggressor, aggressorSpice);
        events.push({
          type: "SPICE_COLLECTED",
          data: {
            faction: battle.aggressor,
            amount: -aggressorSpice,
            reason: "Spice dialing payment to bank",
          },
          message: `${battle.aggressor} pays ${aggressorSpice} spice to bank for spice dialing`,
        });
      }
      if (defenderSpice > 0) {
        newState = removeSpice(newState, battle.defender, defenderSpice);
        events.push({
          type: "SPICE_COLLECTED",
          data: {
            faction: battle.defender,
            amount: -defenderSpice,
            reason: "Spice dialing payment to bank",
          },
          message: `${battle.defender} pays ${defenderSpice} spice to bank for spice dialing`,
        });
      }
    } else {
      // Traitor revealed - winner keeps spice, loser pays
      if (!winner) {
        return newState;
      }
      const winnerSpice =
        winner === battle.aggressor ? aggressorSpice : defenderSpice;
      const loser = result.loser;
      if (loser) {
        const loserSpice =
          winner === battle.aggressor ? defenderSpice : aggressorSpice;

        if (loserSpice > 0) {
          newState = removeSpice(newState, loser, loserSpice);
          events.push({
            type: "SPICE_COLLECTED",
            data: {
              faction: loser,
              amount: -loserSpice,
              reason: "Spice dialing payment (loser pays, winner keeps)",
            },
            message: `${loser} pays ${loserSpice} spice to bank. ${winner} keeps their ${winnerSpice} spice (traitor rule).`,
          });
        }
      }
    }
  }

  // Apply spice payouts for killed leaders
  // Winner receives spice equal to the strength of all killed leaders
  for (const payout of result.spicePayouts) {
    newState = addSpice(newState, payout.faction, payout.amount);
    events.push({
      type: "SPICE_COLLECTED",
      data: {
        faction: payout.faction,
        amount: payout.amount,
        reason: payout.reason,
      },
      message: `${payout.faction} receives ${payout.amount} spice: ${payout.reason}`,
    });
  }

  return newState;
}

