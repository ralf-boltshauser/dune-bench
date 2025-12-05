/**
 * Battle Step Router
 *
 * Centralized routing for battle sub-phases.
 * Extracts switch statement logic from handler.
 */

import { Phase, BattleSubPhase } from "../../../../types";
import type { GameState } from "../../../../types";
import type {
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";
import { processChooseBattle, requestBattleChoice } from "../aggressor-selection";
import {
  transitionToBattleSubPhases,
  requestPrescience,
  processPrescience,
  requestPrescienceReveal,
  processPrescienceReveal,
  requestVoice,
  processVoice,
  requestBattlePlans,
  processBattlePlans,
  processReveal,
  requestTraitorCall,
  processTraitor,
} from "../sub-phases";
import { processResolution } from "../resolution";
import {
  requestWinnerCardDiscard,
  processWinnerCardDiscard,
  requestCaptureChoice,
  processHarkonnenCapture,
} from "../post-resolution";

/**
 * Callbacks for step processing.
 * These allow the router to delegate back to handler methods.
 */
export interface BattleStepCallbacks {
  requestBattleChoice: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult;
  transitionToBattleSubPhases: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult;
  requestPrescience: (
    state: GameState,
    events: PhaseEvent[],
    prescienceTarget: any
  ) => PhaseStepResult;
  requestPrescienceReveal: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult;
  requestVoice: (
    state: GameState,
    events: PhaseEvent[],
    voiceTarget: any
  ) => PhaseStepResult;
  requestBattlePlans: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult;
  processReveal: (state: GameState, events: PhaseEvent[]) => PhaseStepResult;
  requestTraitorCall: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult;
  processResolution: (state: GameState, events: PhaseEvent[]) => PhaseStepResult;
  requestWinnerCardDiscard: (
    state: GameState,
    events: PhaseEvent[],
    winner: any,
    cardsToKeep: string[]
  ) => PhaseStepResult;
  requestCaptureChoice: (
    state: GameState,
    events: PhaseEvent[],
    leaderId: string,
    victim: any
  ) => PhaseStepResult;
  endBattlePhase: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult;
}

/**
 * Route handler function type.
 */
type RouteHandler = (
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: BattleStepCallbacks
) => PhaseStepResult;

/**
 * Battle step router.
 */
export class BattleStepRouter {
  private handlers: Map<BattleSubPhase, RouteHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  /**
   * Register all route handlers.
   */
  private registerHandlers(): void {
    this.handlers.set(BattleSubPhase.AGGRESSOR_CHOOSING, (context, state, responses, events, callbacks) => {
      return processChooseBattle(
        context,
        state,
        responses,
        events,
        () => callbacks.requestBattleChoice(state, events),
        callbacks.processReveal,
        callbacks.transitionToBattleSubPhases
      );
    });

    this.handlers.set(BattleSubPhase.PRESCIENCE_OPPORTUNITY, (context, state, responses, events, callbacks) => {
      return processPrescience(context, state, responses, events, {
        requestPrescienceReveal: callbacks.requestPrescienceReveal,
        requestBattlePlans: callbacks.requestBattlePlans,
      });
    });

    this.handlers.set(BattleSubPhase.PRESCIENCE_REVEAL, (context, state, responses, events, callbacks) => {
      return processPrescienceReveal(context, state, responses, events, {
        requestBattlePlans: callbacks.requestBattlePlans,
      });
    });

    this.handlers.set(BattleSubPhase.CREATING_BATTLE_PLANS, (context, state, responses, events, callbacks) => {
      return processBattlePlans(context, state, responses, events, {
        processReveal: callbacks.processReveal,
      });
    });

    this.handlers.set(BattleSubPhase.VOICE_OPPORTUNITY, (context, state, responses, events, callbacks) => {
      return processVoice(context, state, responses, events, {
        requestPrescience: callbacks.requestPrescience,
        requestBattlePlans: callbacks.requestBattlePlans,
      });
    });

    this.handlers.set(BattleSubPhase.REVEALING_PLANS, (context, state, responses, events, callbacks) => {
      return callbacks.processReveal(state, events);
    });

    this.handlers.set(BattleSubPhase.TRAITOR_CALL, (context, state, responses, events, callbacks) => {
      return processTraitor(context, state, responses, events, {
        processResolution: callbacks.processResolution,
      });
    });

    this.handlers.set(BattleSubPhase.BATTLE_RESOLUTION, (context, state, responses, events, callbacks) => {
      return callbacks.processResolution(state, events);
    });

    this.handlers.set(BattleSubPhase.WINNER_CARD_DISCARD_CHOICE, (context, state, responses, events, callbacks) => {
      return processWinnerCardDiscard(context, state, responses, events, {
        requestCaptureChoice: callbacks.requestCaptureChoice,
        endBattlePhase: callbacks.endBattlePhase,
        requestBattleChoice: callbacks.requestBattleChoice,
      });
    });

    this.handlers.set(BattleSubPhase.HARKONNEN_CAPTURE, (context, state, responses, events, callbacks) => {
      return processHarkonnenCapture(context, state, responses, events, {
        endBattlePhase: callbacks.endBattlePhase,
        requestBattleChoice: callbacks.requestBattleChoice,
      });
    });
  }

  /**
   * Route to appropriate handler based on sub-phase.
   */
  route(
    context: BattlePhaseContext,
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[],
    callbacks: BattleStepCallbacks
  ): PhaseStepResult {
    const handler = this.handlers.get(context.subPhase);

    if (handler) {
      return handler(context, state, responses, events, callbacks);
    }

    // Default case - phase complete
    return this.createDefaultResult(state, events);
  }

  /**
   * Create default result when no handler matches.
   */
  private createDefaultResult(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return {
      state,
      phaseComplete: true,
      nextPhase: Phase.SPICE_COLLECTION,
      pendingRequests: [],
      actions: [],
      events,
    };
  }
}

