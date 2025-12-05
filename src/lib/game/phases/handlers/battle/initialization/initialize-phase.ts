/**
 * Battle Phase Initialization
 *
 * Handles the initialization of the battle phase:
 * - Context reset
 * - Universal Stewards rule
 * - Stronghold occupancy validation
 * - Battle identification
 */

import { Phase, BattleSubPhase } from "../../../../types";
import { validateStrongholdOccupancy } from "../../../../state/queries";
import { identifyBattles } from "../identification";
import { requestBattleChoice } from "../aggressor-selection";
import { applyUniversalStewards } from "./universal-stewards";
import type { GameState } from "../../../../types";
import type {
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Initialize the battle phase.
 */
export function initializeBattlePhase(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  callbacks: {
    endBattlePhase: (state: GameState, events: PhaseEvent[]) => PhaseStepResult;
    processReveal: (state: GameState, events: PhaseEvent[]) => PhaseStepResult;
    processResolution: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
    transitionToBattleSubPhases: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  // Reset context
  context.pendingBattles = [];
  context.currentBattleIndex = 0;
  context.currentBattle = null;
  context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;
  context.aggressorOrder = [...state.stormOrder];
  context.currentAggressorIndex = 0;

  // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

  // Rule 2.02.22 - UNIVERSAL STEWARDS: Before Battle Phase, advisors alone in a territory
  // automatically flip to fighters (subject to PEACETIME and STORMED IN restrictions)
  const newState = applyUniversalStewards(state, events);

  // VALIDATION: Check for stronghold occupancy violations before identifying battles
  const violations = validateStrongholdOccupancy(newState);
  if (violations.length > 0) {
    for (const violation of violations) {
      events.push({
        type: "STRONGHOLD_OCCUPANCY_VIOLATION",
        data: {
          territoryId: violation.territoryId,
          factions: violation.factions,
          count: violation.count,
        },
        message: `⚠️ ILLEGAL STATE: ${violation.territoryId} has ${
          violation.count
        } factions (max 2 allowed): ${violation.factions.join(", ")}`,
      });
      console.error(
        `⚠️ STRONGHOLD OCCUPANCY VIOLATION at battle phase start: ${
          violation.territoryId
        } has ${violation.count} factions: ${violation.factions.join(", ")}`
      );
    }
  }

  // Identify all territories with multiple factions
  context.pendingBattles = identifyBattles(newState);

  if (context.pendingBattles.length === 0) {
    events.push({
      type: "NO_BATTLES",
      data: { phase: Phase.BATTLE },
      message: "No battles this turn",
    });

    return {
      state,
      phaseComplete: true,
      nextPhase: Phase.SPICE_COLLECTION,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  events.push({
    type: "BATTLE_STARTED",
    data: { totalBattles: context.pendingBattles.length },
    message: `${context.pendingBattles.length} potential battles identified`,
  });

  // Start first battle selection
  return requestBattleChoice(
    context,
    newState,
    events,
    callbacks.endBattlePhase,
    callbacks.processReveal,
    callbacks.processResolution,
    callbacks.transitionToBattleSubPhases
  );
}

