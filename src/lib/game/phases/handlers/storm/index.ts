/**
 * Storm Phase Handler
 *
 * Phase 1.01: Storm Movement
 * - Two players dial storm movement (1-3, or 0-20 on turn 1)
 * - Storm moves counterclockwise
 * - Forces in sand territories under storm are destroyed
 * - Spice in storm path is destroyed
 * - Storm order is determined for the turn
 */

import { Phase, type GameState } from "../../../types";
import {
  type AgentResponse,
  type PhaseHandler,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../../types";
import { resetContext, initializeStormPhase } from "./initialization";
import { processDialResponses } from "./dialing";
import { checkFamilyAtomics, processFamilyAtomics } from "./family-atomics";
import { checkWeatherControl, processWeatherControl } from "./weather-control";
import { applyStormMovement } from "./movement";

// =============================================================================
// STORM PHASE HANDLER
// =============================================================================

export class StormPhaseHandler implements PhaseHandler {
  readonly phase = Phase.STORM;

  private context: StormPhaseContext = resetContext();

  initialize(state: GameState): PhaseStepResult {
    return initializeStormPhase(state, this.context);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    // Step 1: Process dial responses (if not yet dialed)
    if (this.context.stormMovement === null) {
      return processDialResponses(state, responses, this.context);
    }

    // Step 2: After dials are calculated, check for Family Atomics
    if (
      !this.context.familyAtomicsUsed &&
      !this.context.waitingForFamilyAtomics
    ) {
      return checkFamilyAtomics(state, this.context);
    }

    // Step 3: Process Family Atomics response (if waiting)
    if (this.context.waitingForFamilyAtomics) {
      // CRITICAL: If we're waiting for Family Atomics but got empty responses,
      // treat as passes and continue (defensive against agent/provider failures)
      if (responses.length === 0) {
        console.log(
          "[DEBUG] Waiting for Family Atomics but got empty responses - treating as passes"
        );
        this.context.waitingForFamilyAtomics = false;
        this.context.familyAtomicsUsed = true;
        return checkWeatherControl(state, this.context);
      }
      return processFamilyAtomics(state, responses, this.context);
    }

    // Step 4: After Family Atomics (or if not used), check for Weather Control
    // CRITICAL: Only check if we haven't already handled Weather Control
    if (
      !this.context.weatherControlUsed &&
      !this.context.waitingForWeatherControl
    ) {
      return checkWeatherControl(state, this.context);
    }

    // Step 5: Process Weather Control response (if waiting)
    // CRITICAL: Only process if we're actually waiting AND haven't already used it
    if (this.context.waitingForWeatherControl) {
      // Double-check: if already used, skip processing (shouldn't happen but safety check)
      if (this.context.weatherControlUsed) {
        console.log(
          "[DEBUG] Weather Control already used, skipping processWeatherControl"
        );
        this.context.waitingForWeatherControl = false;
        return applyStormMovement(state, this.context);
      }
      // CRITICAL: If we're waiting for Weather Control but got empty responses,
      // treat as passes and continue (defensive against agent/provider failures)
      if (responses.length === 0) {
        console.log(
          "[DEBUG] Waiting for Weather Control but got empty responses - treating as passes"
        );
        this.context.waitingForWeatherControl = false;
        this.context.weatherControlUsed = true;
        return applyStormMovement(state, this.context);
      }
      return processWeatherControl(state, responses, this.context);
    }

    // Step 6: All cards processed - now apply movement
    return applyStormMovement(state, this.context);
  }

  cleanup(state: GameState): GameState {
    // Reset context for next turn
    this.context = resetContext();
    return state;
  }
}

