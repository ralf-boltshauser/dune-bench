/**
 * CHOAM Charity Phase Handler
 *
 * Phase 1.03: CHOAM Charity
 * - Factions with 0-1 spice may claim CHOAM charity
 * - Charity is 2 spice from the bank
 * - This is optional (faction can decline)
 */

import {
  Faction,
  Phase,
  type GameState,
} from '../../types';
import {
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';

// =============================================================================
// CHOAM CHARITY PHASE HANDLER
// =============================================================================

export class ChoamCharityPhaseHandler implements PhaseHandler {
  readonly phase = Phase.CHOAM_CHARITY;

  private eligibleFactions: Faction[] = [];
  private processedFactions: Set<Faction> = new Set();

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.eligibleFactions = [];
    this.processedFactions = new Set();

    const events: PhaseEvent[] = [];

    // Find factions eligible for charity (0-1 spice)
    for (const [faction, factionState] of state.factions) {
      // BG doesn't get charity on spice behind shield
      const effectiveSpice = factionState.spice;
      if (effectiveSpice <= GAME_CONSTANTS.CHOAM_CHARITY_THRESHOLD) {
        this.eligibleFactions.push(faction);
      }
    }

    events.push({
      type: 'PHASE_STARTED',
      data: {
        phase: Phase.CHOAM_CHARITY,
        eligibleFactions: this.eligibleFactions,
      },
      message: `CHOAM Charity: ${this.eligibleFactions.length} factions eligible`,
    });

    if (this.eligibleFactions.length === 0) {
      // No one eligible, skip phase
      return {
        state,
        phaseComplete: true,
        nextPhase: Phase.BIDDING,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    // Request charity decisions from eligible factions (simultaneously)
    return this.requestCharityDecisions(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Process charity claims
    for (const response of responses) {
      this.processedFactions.add(response.factionId);

      if (response.actionType === 'CLAIM_CHARITY' || !response.passed) {
        // Faction claims charity
        const charityAmount = GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT;
        newState = addSpice(newState, response.factionId, charityAmount);

        events.push({
          type: 'CHARITY_CLAIMED',
          data: { faction: response.factionId, amount: charityAmount },
          message: `${response.factionId} claims ${charityAmount} spice in CHOAM Charity`,
        });

        newState = logAction(newState, 'CHOAM_CHARITY_CLAIMED', response.factionId, {
          amount: charityAmount,
        });
      } else {
        events.push({
          type: 'CHARITY_CLAIMED',
          data: { faction: response.factionId, declined: true },
          message: `${response.factionId} declines CHOAM Charity`,
        });
      }
    }

    // Check if all eligible factions have been processed
    const remaining = this.eligibleFactions.filter(
      (f) => !this.processedFactions.has(f)
    );

    if (remaining.length > 0) {
      return this.requestCharityDecisions(newState, events);
    }

    // Phase complete
    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.BIDDING,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private requestCharityDecisions(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    for (const faction of this.eligibleFactions) {
      if (this.processedFactions.has(faction)) continue;

      const factionState = getFactionState(state, faction);

      pendingRequests.push({
        factionId: faction,
        requestType: 'REVIVE_FORCES', // Reusing type for charity
        prompt: `You have ${factionState.spice} spice and are eligible for CHOAM Charity (${GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT} spice). Do you want to claim it?`,
        context: {
          currentSpice: factionState.spice,
          charityAmount: GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT,
        },
        availableActions: ['CLAIM_CHARITY', 'PASS'],
      });
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true, // All claim at once
      actions: [],
      events,
    };
  }
}
