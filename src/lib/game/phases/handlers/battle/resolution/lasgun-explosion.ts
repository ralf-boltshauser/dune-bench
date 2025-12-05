/**
 * Lasgun-Shield Explosion Handling
 *
 * Handles the lasgun-shield explosion scenario where all forces and leaders are killed.
 */

import { Faction } from "../../../../types";
import {
  getFactionState,
  getTargetFactionForLeaderKill,
  killKwisatzHaderach,
  killLeader,
  sendForcesToTanks,
} from "../../../../state";
import { checkPrisonBreak } from "../helpers/prison-break";
import type { GameState } from "../../../../types";
import type { CurrentBattle, PhaseEvent } from "../../../types";

/**
 * Apply lasgun-shield explosion effects.
 * @rule 3.01.14
 */
export function applyLasgunExplosion(
  state: GameState,
  battle: CurrentBattle,
  events: PhaseEvent[]
): GameState {
  let newState = state;

  events.push({
    type: "LASGUN_SHIELD_EXPLOSION",
    data: { territory: battle.territoryId, sector: battle.sector },
    message: "Lasgun-Shield explosion! All forces in territory destroyed!",
  });

  // Kill all forces in territory (explosion kills everything, no elite bonus)
  for (const faction of [battle.aggressor, battle.defender]) {
    const factionState = getFactionState(newState, faction);
    const forces = factionState.forces.onBoard.find(
      (f) =>
        f.territoryId === battle.territoryId && f.sector === battle.sector
    );
    if (forces) {
      // Explosion destroys all forces - send them separately to maintain counts
      const { regular, elite } = forces.forces;
      if (regular > 0 || elite > 0) {
        newState = sendForcesToTanks(
          newState,
          faction,
          battle.territoryId,
          battle.sector,
          regular,
          elite
        );
      }
    }
  }

  // Kill both leaders
  // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
  if (battle.aggressorPlan?.leaderId) {
    const targetFaction = getTargetFactionForLeaderKill(
      newState,
      battle.aggressor,
      battle.aggressorPlan.leaderId
    );
    newState = killLeader(
      newState,
      targetFaction,
      battle.aggressorPlan.leaderId
    );
    // Check for Prison Break after leader death
    newState = checkPrisonBreak(newState, battle.aggressor, events);
  }
  if (battle.defenderPlan?.leaderId) {
    const targetFaction = getTargetFactionForLeaderKill(
      newState,
      battle.defender,
      battle.defenderPlan.leaderId
    );
    newState = killLeader(
      newState,
      targetFaction,
      battle.defenderPlan.leaderId
    );
    // Check for Prison Break after leader death
    newState = checkPrisonBreak(newState, battle.defender, events);
  }

  // @rule 2.01.13 PROPHECY BLINDED: Kill Kwisatz Haderach if Atreides used it
  // Rule: "The Kwisatz Haderach token can only be killed if blown up by a lasgun/shield explosion."
  if (
    battle.aggressor === Faction.ATREIDES &&
    battle.aggressorPlan?.kwisatzHaderachUsed
  ) {
    const wasDead =
      getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
      false;
    newState = killKwisatzHaderach(newState);
    const nowDead =
      getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
      false;
    if (nowDead && !wasDead) {
      events.push({
        type: "KWISATZ_HADERACH_KILLED",
        data: {
          faction: Faction.ATREIDES,
          reason: "lasgun_shield_explosion",
        },
        message: "Kwisatz Haderach killed by lasgun-shield explosion",
      });
    }
  }
  if (
    battle.defender === Faction.ATREIDES &&
    battle.defenderPlan?.kwisatzHaderachUsed
  ) {
    const wasDead =
      getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
      false;
    newState = killKwisatzHaderach(newState);
    const nowDead =
      getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
      false;
    if (nowDead && !wasDead) {
      events.push({
        type: "KWISATZ_HADERACH_KILLED",
        data: {
          faction: Faction.ATREIDES,
          reason: "lasgun_shield_explosion",
        },
        message: "Kwisatz Haderach killed by lasgun-shield explosion",
      });
    }
  }

  return newState;
}

