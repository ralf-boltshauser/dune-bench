/**
 * Battle Resolution Orchestrator
 *
 * Main orchestrator for battle resolution flow.
 */

import { Faction, BattleSubPhase, TerritoryId } from "../../../../types";
import { validateStrongholdOccupancy } from "../../../../state/queries";
import { getAvailableLeadersForCapture } from "../../../../state";
import { type BattleResult } from "../../../../rules";
import { resolveBattle, resolveTwoTraitorsBattle } from "../../../../rules/combat/resolution";
import { createDefaultBattlePlan } from "../plans";
import { updatePendingBattlesAfterBattle } from "../pending-battles";
import { applyBattleResult } from "./apply-results";
import { finishCardDiscarding } from "./card-discarding";
import type { GameState } from "../../../../types";
import type {
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Process battle resolution.
 */
export function processResolution(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  callbacks: {
    requestWinnerCardDiscard: (
      state: GameState,
      events: PhaseEvent[],
      winner: Faction,
      cardsToKeep: string[]
    ) => PhaseStepResult;
    requestCaptureChoice: (
      state: GameState,
      events: PhaseEvent[],
      leaderId: string,
      victim: Faction
    ) => PhaseStepResult;
    endBattlePhase: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
    requestBattleChoice: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const battle = context.currentBattle!;
  let newState = state;

  console.log(`\n${"═".repeat(80)}`);
  console.log(`⚔️  [Battle Resolution] Resolving battle:`);
  console.log(`   ${battle.aggressor.toUpperCase()} vs ${battle.defender.toUpperCase()}`);
  console.log(`   Territory: ${battle.territoryId}, Sector: ${battle.sector}`);
  console.log(`${"═".repeat(80)}`);

  // Ensure we have valid plans
  const aggressorPlan =
    battle.aggressorPlan ??
    createDefaultBattlePlan(
      battle.aggressor,
      state,
      battle.territoryId,
      battle.sector
    );
  const defenderPlan =
    battle.defenderPlan ??
    createDefaultBattlePlan(
      battle.defender,
      state,
      battle.territoryId,
      battle.sector
    );

  console.log(`\n📋 [Battle Resolution] Battle Plans:`);
  console.log(`   Aggressor (${battle.aggressor}):`);
  console.log(`      Leader: ${aggressorPlan.leaderId || "none"}`);
  console.log(`      Forces: ${aggressorPlan.forcesDialed}, Spice: ${aggressorPlan.spiceDialed}`);
  console.log(`      Weapon: ${aggressorPlan.weaponCardId || "none"}, Defense: ${aggressorPlan.defenseCardId || "none"}`);
  console.log(`   Defender (${battle.defender}):`);
  console.log(`      Leader: ${defenderPlan.leaderId || "none"}`);
  console.log(`      Forces: ${defenderPlan.forcesDialed}, Spice: ${defenderPlan.spiceDialed}`);
  console.log(`      Weapon: ${defenderPlan.weaponCardId || "none"}, Defense: ${defenderPlan.defenseCardId || "none"}`);
  
  if (battle.traitorCalled) {
    console.log(`\n🗡️  [Battle Resolution] Traitor called by: ${battle.traitorCalledBy}`);
  }
  if (battle.traitorCallsByBothSides) {
    console.log(`\n🗡️  [Battle Resolution] TWO TRAITORS scenario!`);
  }

  // Check for TWO TRAITORS scenario first
  let result: BattleResult;
  if (battle.traitorCallsByBothSides) {
    console.log(`\n🔍 [Battle Resolution] Using TWO TRAITORS resolution`);
    // Use the TWO TRAITORS resolution
    result = resolveTwoTraitorsBattle(
      state,
      battle.territoryId,
      battle.aggressor,
      battle.defender,
      aggressorPlan,
      defenderPlan
    );
  } else {
    // Normal battle resolution (including single traitor)
    const traitorTarget = battle.traitorCalled
      ? battle.traitorCalledBy === battle.aggressor
        ? defenderPlan.leaderId
        : aggressorPlan.leaderId
      : null;

    if (traitorTarget) {
      console.log(`\n🔍 [Battle Resolution] Normal resolution with traitor target: ${traitorTarget}`);
    } else {
      console.log(`\n🔍 [Battle Resolution] Normal resolution (no traitor)`);
    }

    result = resolveBattle(
      state,
      battle.territoryId,
      battle.sector,
      battle.aggressor,
      battle.defender,
      aggressorPlan,
      defenderPlan,
      battle.traitorCalled ? battle.traitorCalledBy : null,
      traitorTarget
    );
  }

  console.log(`\n🏆 [Battle Resolution] Result:`);
  console.log(`   Winner: ${result.winner?.toUpperCase() || "NONE"}`);
  console.log(`   Aggressor total: ${result.aggressorResult.totalStrength}`);
  console.log(`   Defender total: ${result.defenderResult.totalStrength}`);
  console.log(`   Aggressor losses: ${result.aggressorResult.regularLost} regular, ${result.aggressorResult.eliteLost} elite`);
  console.log(`   Defender losses: ${result.defenderResult.regularLost} regular, ${result.defenderResult.eliteLost} elite`);

  // Store battle result temporarily for winner card discard choice
  battle.battleResult = result;

  // Apply battle results (but don't discard winner's cards yet - they get to choose)
  newState = applyBattleResult(newState, battle, result, events);

  // Check if winner has cards they can choose to discard
  const winner = result.winner;
  if (winner && !result.lasgunjShieldExplosion) {
    const winnerResult =
      winner === battle.aggressor
        ? result.aggressorResult
        : result.defenderResult;

    // If winner has cards in cardsToKeep, they get to choose which to discard
    if (winnerResult.cardsToKeep.length > 0) {
      context.subPhase = BattleSubPhase.WINNER_CARD_DISCARD_CHOICE;
      return callbacks.requestWinnerCardDiscard(
        newState,
        events,
        winner,
        winnerResult.cardsToKeep
      );
    }
  }

  // No choice needed - continue with normal flow
  // Discard winner's cards (if any were automatically marked for discard)
  newState = finishCardDiscarding(newState, battle, result, events);

  // @rule 2.05.10 - CAPTURED LEADERS: Harkonnen can capture leaders after winning battle
  // @rule 2.05.10.01 - Randomly select 1 Active Leader from loser
  if (
    result.winner === Faction.HARKONNEN &&
    result.loser !== null &&
    !result.lasgunjShieldExplosion &&
    state.factions.has(Faction.HARKONNEN)
  ) {
    const availableLeaders = getAvailableLeadersForCapture(
      newState,
      result.loser,
      battle.territoryId
    );

    if (availableLeaders.length > 0) {
      // Randomly select one leader from the available pool
      const captureTarget =
        availableLeaders[Math.floor(Math.random() * availableLeaders.length)];

      events.push({
        type: "HARKONNEN_CAPTURE_OPPORTUNITY",
        data: {
          winner: result.winner,
          loser: result.loser,
          captureTarget: captureTarget.definitionId,
        },
        message: `Harkonnen can capture ${result.loser}'s leader!`,
      });

      // Move to capture sub-phase
      context.subPhase = BattleSubPhase.HARKONNEN_CAPTURE;
      return callbacks.requestCaptureChoice(
        newState,
        events,
        captureTarget.definitionId,
        result.loser!
      );
    }
  }

  // Update pending battles: remove factions that no longer have forces
  // This allows the aggressor to continue fighting in the same territory
  // if other enemies remain (MULTIPLE BATTLES rule)
  context.pendingBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    newState,
    battle.territoryId,
    battle.sector
  );

  // VALIDATION: After battle resolution, ensure stronghold occupancy limits are respected
  // If a stronghold has more than 2 factions, this is a critical error
  const violations = validateStrongholdOccupancy(newState);
  if (violations.length > 0) {
    for (const violation of violations) {
      // Check if this violation is in the territory where the battle just occurred
      if (violation.territoryId === battle.territoryId) {
        events.push({
          type: "STRONGHOLD_OCCUPANCY_VIOLATION",
          data: {
            territoryId: violation.territoryId,
            factions: violation.factions,
            count: violation.count,
          },
          message: `⚠️ CRITICAL ERROR: After battle in ${
            violation.territoryId
          }, ${
            violation.count
          } factions remain (max 2 allowed): ${violation.factions.join(
            ", "
          )}. This should never happen!`,
        });
        console.error(
          `⚠️ CRITICAL: After battle in ${violation.territoryId}, ${
            violation.count
          } factions remain: ${violation.factions.join(", ")}`
        );

        // This is a critical error - the game state is invalid
        // In a production system, we might want to throw an error or auto-fix
        // For now, we log it and continue, but this indicates a bug
      }
    }
  }

  // Check for more battles
  context.currentBattle = null;
  context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

  if (context.pendingBattles.length === 0) {
    return callbacks.endBattlePhase(newState, events);
  }

  return callbacks.requestBattleChoice(newState, events);
}

