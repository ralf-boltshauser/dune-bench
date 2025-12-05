/**
 * Force Losses Handling
 *
 * Handles force losses for both winner and loser in battle.
 */

import { Faction } from "../../../../types";
import {
  calculateLossDistribution,
  getFactionState,
  sendForcesToTanks,
  updateKwisatzHaderach,
} from "../../../../state";
import type { GameState } from "../../../../types";
import type { CurrentBattle, PhaseEvent } from "../../../types";
import type { BattleResult } from "../../../../rules/types";

/**
 * Apply force losses for both winner and loser.
 *
 * @rule 1.07.06.05 - LOSING: The losing player loses all the Forces they had in the Territory to the Tleilaxu Tanks and must discard every Treachery Card they used in their Battle Plan. Note that the loser does not lose their leader as a result of losing the battle.
 * @rule 1.07.06.06 - WINNING: The winning player loses only the number of Forces they dialed on the Battle Wheel. These Forces are Placed in the Tleilaxu Tanks. The winning player may discard any of the cards they played; that player may keep any cards that do not say "Discard after use".
 */
export function applyForceLosses(
  state: GameState,
  battle: CurrentBattle,
  result: BattleResult,
  events: PhaseEvent[]
): GameState {
  let newState = state;

  // Loser loses all forces (send separately to maintain force type counts)
  const loser = result.loser;
  if (!loser) {
    // TWO TRAITORS case already handled, safety check
    return newState;
  }
  const loserForces = getFactionState(newState, loser).forces.onBoard.find(
    (f) => f.territoryId === battle.territoryId && f.sector === battle.sector
  );
  if (loserForces) {
    const { regular, elite } = loserForces.forces;
    if (regular > 0 || elite > 0) {
      newState = sendForcesToTanks(
        newState,
        loser,
        battle.territoryId,
        battle.sector,
        regular,
        elite
      );

      // Track force losses for Kwisatz Haderach activation (THE SLEEPER HAS AWAKENED)
      if (loser === Faction.ATREIDES) {
        const totalLost = regular + elite;
        const wasActive =
          getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
            ?.isActive ?? false;
        newState = updateKwisatzHaderach(newState, totalLost);
        const nowActive =
          getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
            ?.isActive ?? false;
        if (nowActive && !wasActive) {
          events.push({
            type: "KWISATZ_HADERACH_ACTIVATED",
            data: { faction: Faction.ATREIDES },
            message: "Kwisatz Haderach has awakened!",
          });
        }
      }
    }
  }

  // @rule 1.07.04.02 - Winner loses forces equal to the number they dialed on the Battle Wheel
  // Elite forces worth 2x when taking losses (except Sardaukar vs Fremen)
  const winner = result.winner;
  if (!winner) {
    // TWO TRAITORS case already handled, safety check
    return newState;
  }
  const winnerPlan =
    winner === battle.aggressor ? battle.aggressorPlan : battle.defenderPlan;
  const winnerLosses = winnerPlan?.forcesDialed ?? 0;
  if (winnerLosses > 0) {
    const winnerForces = getFactionState(
      newState,
      winner
    ).forces.onBoard.find(
      (f) =>
        f.territoryId === battle.territoryId && f.sector === battle.sector
    );
    if (winnerForces) {
      // Calculate loss distribution: elite forces absorb 2 losses each (or 1 for Sardaukar vs Fremen)
      const opponent =
        winner === battle.aggressor ? battle.defender : battle.aggressor;
      const distribution = calculateLossDistribution(
        winnerForces.forces,
        winnerLosses,
        winner,
        opponent
      );

      if (distribution.regularLost > 0 || distribution.eliteLost > 0) {
        newState = sendForcesToTanks(
          newState,
          winner,
          battle.territoryId,
          battle.sector,
          distribution.regularLost,
          distribution.eliteLost
        );

        // Track force losses for Kwisatz Haderach activation (THE SLEEPER HAS AWAKENED)
        if (winner === Faction.ATREIDES) {
          const totalLost = distribution.regularLost + distribution.eliteLost;
          const wasActive =
            getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
              ?.isActive ?? false;
          newState = updateKwisatzHaderach(newState, totalLost);
          const nowActive =
            getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
              ?.isActive ?? false;
          if (nowActive && !wasActive) {
            events.push({
              type: "KWISATZ_HADERACH_ACTIVATED",
              data: { faction: Faction.ATREIDES },
              message: "Kwisatz Haderach has awakened!",
            });
          }
        }

        // Log the loss distribution for clarity
        events.push({
          type: "BATTLE_RESOLVED",
          data: {
            faction: winner,
            lossesDialed: winnerLosses,
            regularLost: distribution.regularLost,
            eliteLost: distribution.eliteLost,
          },
          message: `${winner} loses ${distribution.regularLost} regular + ${distribution.eliteLost} elite forces (${winnerLosses} losses)`,
        });
      }
    }
  }

  return newState;
}

