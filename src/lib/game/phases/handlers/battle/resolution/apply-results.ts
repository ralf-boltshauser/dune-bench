/**
 * Apply Battle Results
 *
 * Main orchestrator for applying battle results to game state.
 */

import { logAction } from "../../../../state";
import { applyLasgunExplosion } from "./lasgun-explosion";
import { applyForceLosses } from "./force-losses";
import { applySpiceHandling } from "./spice-handling";
import { applyLeaderHandling } from "./leader-handling";
import type { GameState } from "../../../../types";
import type { CurrentBattle, PhaseEvent } from "../../../types";
import type { BattleResult } from "../../../../rules/types";

/**
 * Apply battle results to game state.
 */
export function applyBattleResult(
  state: GameState,
  battle: CurrentBattle,
  result: BattleResult,
  events: PhaseEvent[]
): GameState {
  let newState = state;

  // Handle lasgun-shield explosion
  if (result.lasgunjShieldExplosion) {
    return applyLasgunExplosion(newState, battle, events);
  }

  // Normal battle resolution
  events.push({
    type: "BATTLE_RESOLVED",
    data: {
      winner: result.winner,
      loser: result.loser,
      winnerTotal: result.winnerTotal,
      loserTotal: result.loserTotal,
      traitorRevealed: result.traitorRevealed,
    },
    message: `${result.winner} wins the battle (${result.winnerTotal} vs ${result.loserTotal})`,
  });

  // Apply force losses
  newState = applyForceLosses(newState, battle, result, events);

  // Apply spice handling
  newState = applySpiceHandling(newState, battle, result, events);

  // Apply leader handling
  newState = applyLeaderHandling(newState, battle, result, events);

  // Don't discard cards here - that happens in finishCardDiscarding
  // This allows the winner to choose which cards to discard first

  newState = logAction(newState, "BATTLE_RESOLVED", null, {
    territory: battle.territoryId,
    sector: battle.sector,
    aggressor: battle.aggressor,
    defender: battle.defender,
    winner: result.winner,
    loser: result.loser,
  });

  return newState;
}

