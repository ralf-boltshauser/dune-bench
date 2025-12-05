/**
 * Battle Phase Handler
 *
 * Phase 1.07: Battle
 * - Identify territories with multiple factions
 * - Battles occur in storm order
 * - Sub-phases: Choose battle, battle plans, prescience, voice, reveal, traitor, resolution
 *
 * This is the main coordinator that delegates to specialized modules.
 */

import { Phase, BattleSubPhase, Faction, TerritoryId } from "../../../types";
import { requestBattleChoice } from "./aggressor-selection";
import { updatePendingBattlesAfterBattle } from "./pending-battles";
import { initializeBattlePhase } from "./initialization";
import {
  transitionToBattleSubPhases,
  requestPrescience,
  requestPrescienceReveal,
  requestVoice,
  requestBattlePlans,
  processReveal,
  requestTraitorCall,
} from "./sub-phases";
import { processResolution } from "./resolution";
import {
  requestWinnerCardDiscard,
  requestCaptureChoice,
} from "./post-resolution";
import { cleanupBattlePhase } from "./cleanup";
import { endBattlePhase } from "./helpers";
import { BattleStepRouter, type BattleStepCallbacks } from "./routing";
import { BattleContextManager } from "./context";
import { BattleDebugLogger } from "./debug/battle-debug-logger";
import type { GameState } from "../../../types";
import type {
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseHandler,
  PhaseStepResult,
} from "../../types";

export class BattlePhaseHandler implements PhaseHandler {
  readonly phase = Phase.BATTLE;

  private context: BattlePhaseContext = {
    pendingBattles: [],
    currentBattleIndex: 0,
    currentBattle: null,
    subPhase: BattleSubPhase.AGGRESSOR_CHOOSING,
    aggressorOrder: [],
    currentAggressorIndex: 0,
  };

  private contextManager: BattleContextManager;
  private router: BattleStepRouter;
  private debugLogger: BattleDebugLogger | null = null;

  constructor() {
    this.contextManager = new BattleContextManager(this.context);
    this.router = new BattleStepRouter();
  }

  initialize(state: GameState): PhaseStepResult {
    // Initialize debug logger
    this.debugLogger = new BattleDebugLogger(state.gameId, state.turn);
    console.log(`\n🔍 [Battle Debug] Initialized debug logger for game ${state.gameId}, turn ${state.turn}`);
    
    const result = initializeBattlePhase(
      this.context,
      state,
      [],
      {
        endBattlePhase: (s, e) => this.endBattlePhase(s, e),
        processReveal: (s, e) => this.processReveal(s, e),
        processResolution: (s, e) => this.processResolution(s, e),
        transitionToBattleSubPhases: (s, e) =>
          this.transitionToBattleSubPhases(s, e),
      }
    );
    
    // Log initialization
    if (this.debugLogger) {
      this.debugLogger.logStep(
        "INITIALIZE",
        null,
        result.pendingRequests,
        undefined,
        result.events,
        result.state
      );
    }
    
    return result;
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];

    const callbacks: BattleStepCallbacks = {
      requestBattleChoice: (s, e) => this.requestBattleChoice(s, e),
      transitionToBattleSubPhases: (s, e) =>
        this.transitionToBattleSubPhases(s, e),
      requestPrescience: (s, e, target) => this.requestPrescience(s, e, target),
      requestPrescienceReveal: (s, e) =>
        this.requestPrescienceReveal(s, e),
      requestVoice: (s, e, target) => this.requestVoice(s, e, target),
      requestBattlePlans: (s, e) => this.requestBattlePlans(s, e),
      processReveal: (s, e) => this.processReveal(s, e),
      requestTraitorCall: (s, e) => this.requestTraitorCall(s, e),
      processResolution: (s, e) => this.processResolution(s, e),
      requestWinnerCardDiscard: (s, e, winner, cards) =>
        this.requestWinnerCardDiscard(s, e, winner, cards),
      requestCaptureChoice: (s, e, leaderId, victim) =>
        this.requestCaptureChoice(s, e, leaderId, victim),
      endBattlePhase: (s, e) => this.endBattlePhase(s, e),
    };

    const result = this.router.route(
      this.context,
      state,
      responses,
      events,
      callbacks
    );
    
    // Debug logging
    if (this.debugLogger) {
      if (this.context.currentBattleIndex !== undefined) {
        this.debugLogger.setBattleIndex(this.context.currentBattleIndex);
      }
      
      this.debugLogger.logStep(
        this.context.subPhase || "UNKNOWN",
        this.context.currentBattle || undefined,
        result.pendingRequests,
        responses.length > 0 ? responses : undefined,
        result.events,
        result.state
      );
      
      // Save logs when phase completes
      if (result.phaseComplete && this.debugLogger) {
        this.debugLogger.save();
      }
    }
    
    return result;
  }

  cleanup(state: GameState): GameState {
    // Save debug logs on cleanup (in case phase complete wasn't called)
    if (this.debugLogger) {
      this.debugLogger.save();
      this.debugLogger = null; // Reset for next battle phase
    }
    return cleanupBattlePhase(state);
  }

  // ===========================================================================
  // WRAPPER METHODS - These delegate to module functions with proper context
  // ===========================================================================

  private requestBattleChoice(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return requestBattleChoice(
      this.context,
      state,
      events,
      (s, e) => this.endBattlePhase(s, e),
      (s, e) => this.processReveal(s, e),
      (s, e) => this.processResolution(s, e),
      (s, e) => this.transitionToBattleSubPhases(s, e)
    );
  }

  private transitionToBattleSubPhases(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return transitionToBattleSubPhases(
      this.context,
      state,
      events,
      {
        requestVoice: (s, e, target) => this.requestVoice(s, e, target),
        requestPrescience: (s, e, target) =>
          this.requestPrescience(s, e, target),
        requestBattlePlans: (s, e) => this.requestBattlePlans(s, e),
      }
    );
  }

  private requestPrescience(
    state: GameState,
    events: PhaseEvent[],
    prescienceTarget: Faction
  ): PhaseStepResult {
    return requestPrescience(this.context, state, events, prescienceTarget);
  }

  private requestPrescienceReveal(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return requestPrescienceReveal(this.context, state, events);
  }

  private requestVoice(
    state: GameState,
    events: PhaseEvent[],
    voiceTarget: Faction
  ): PhaseStepResult {
    return requestVoice(this.context, state, events, voiceTarget);
  }

  private requestBattlePlans(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return requestBattlePlans(this.context, state, events);
  }

  private processReveal(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return processReveal(this.context, state, events, {
      requestTraitorCall: (s, e) => this.requestTraitorCall(s, e),
    });
  }

  private requestTraitorCall(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return requestTraitorCall(this.context, state, events, {
      processResolution: (s, e) => this.processResolution(s, e),
    });
  }

  private processResolution(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return processResolution(this.context, state, events, {
      requestWinnerCardDiscard: (s, e, winner, cards) =>
        this.requestWinnerCardDiscard(s, e, winner, cards),
      requestCaptureChoice: (s, e, leaderId, victim) =>
        this.requestCaptureChoice(s, e, leaderId, victim),
      endBattlePhase: (s, e) => this.endBattlePhase(s, e),
      requestBattleChoice: (s, e) => this.requestBattleChoice(s, e),
    });
  }

  private requestWinnerCardDiscard(
    state: GameState,
    events: PhaseEvent[],
    winner: Faction,
    cardsToKeep: string[]
  ): PhaseStepResult {
    return requestWinnerCardDiscard(
      this.context,
      state,
      events,
      winner,
      cardsToKeep
    );
  }

  private requestCaptureChoice(
    state: GameState,
    events: PhaseEvent[],
    leaderId: string,
    victim: Faction
  ): PhaseStepResult {
    return requestCaptureChoice(
      this.context,
      state,
      events,
      leaderId,
      victim
    );
  }

  private endBattlePhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return endBattlePhase(state, events);
  }

  private updatePendingBattlesAfterBattle(
    state: GameState,
    territoryId: TerritoryId,
    sector: number
  ): void {
    this.context.pendingBattles = updatePendingBattlesAfterBattle(
      this.context.pendingBattles,
      state,
      territoryId,
      sector
    );
  }
}

