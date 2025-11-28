/**
 * CHOAM Charity Phase Handler
 *
 * Phase 1.03: CHOAM Charity
 * - Factions with 0-1 spice may claim CHOAM charity
 * - Charity is 2 spice from the bank
 * - This is optional (faction can decline)
 */

import { GAME_CONSTANTS } from "../../data";
import {
  getCharityAmount,
  getEligibleFactions,
  isEligibleForCharity,
} from "../../rules";
import { addSpice, getFactionState, logAction } from "../../state";
import { Faction, FACTION_NAMES, Phase, type GameState } from "../../types";
import { BasePhaseHandler } from "../base-handler";
import { createAgentRequest } from "../helpers";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseStepResult,
} from "../types";

// =============================================================================
// CHOAM CHARITY PHASE HANDLER
// =============================================================================

export class ChoamCharityPhaseHandler extends BasePhaseHandler {
  readonly phase = Phase.CHOAM_CHARITY;

  private eligibleFactions: Faction[] = [];
  private processedFactions: Set<Faction> = new Set();

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.eligibleFactions = [];
    this.processedFactions = new Set();

    const events: PhaseEvent[] = [];

    console.log("\n" + "=".repeat(80));
    console.log("💰 CHOAM CHARITY PHASE (Turn " + state.turn + ")");
    console.log("=".repeat(80));

    // Find factions eligible for charity
    this.eligibleFactions = getEligibleFactions(state);

    // Log eligibility for all factions
    for (const [faction] of state.factions) {
      const eligibility = isEligibleForCharity(state, faction);
      if (eligibility.isEligible) {
        console.log(`  ✅ ${FACTION_NAMES[faction]}: ${eligibility.reason}`);
      } else {
        console.log(`  ❌ ${FACTION_NAMES[faction]}: ${eligibility.reason}`);
      }
    }

    console.log(
      `\n  📊 ${this.eligibleFactions.length} faction(s) eligible for CHOAM Charity`
    );
    console.log("=".repeat(80) + "\n");

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here
    // Just emit eligible factions info
    events.push({
      type: "CHOAM_ELIGIBLE",
      data: {
        eligibleFactions: this.eligibleFactions,
      },
      message: `CHOAM Charity: ${this.eligibleFactions.length} factions eligible`,
    });

    if (this.eligibleFactions.length === 0) {
      // No one eligible, skip phase
      return this.complete(state, Phase.BIDDING, events);
    }

    // Request charity decisions from eligible factions (simultaneously)
    return this.requestCharityDecisions(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    console.log("\n" + "=".repeat(80));
    console.log("💰 PROCESSING CHOAM CHARITY CLAIMS");
    console.log("=".repeat(80));

    // Process charity claims
    // Rule 1.03.02: A Player may only Claim CHOAM Charity once a Turn
    for (const response of responses) {
      const result = this.processCharityResponse(newState, response);
      newState = result.state;
      events.push(...result.events);
    }

    console.log("=".repeat(80) + "\n");

    // Check if all eligible factions have been processed
    const remaining = this.eligibleFactions.filter(
      (f) => !this.processedFactions.has(f)
    );

    if (remaining.length > 0) {
      return this.requestCharityDecisions(newState, events);
    }

    // Phase complete
    return this.complete(newState, Phase.BIDDING, events);
  }

  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Process a single charity response.
   * Handles fraud safeguards, amount calculation, and state updates.
   */
  private processCharityResponse(
    state: GameState,
    response: AgentResponse
  ): { state: GameState; events: PhaseEvent[] } {
    const events: PhaseEvent[] = [];

    // Fraud safeguard: Check if already processed this turn
    // Rule 1.03.02: A Player may only Claim CHOAM Charity once a Turn
    if (this.processedFactions.has(response.factionId)) {
      console.log(
        `  ⚠️  ${
          FACTION_NAMES[response.factionId]
        }: Already claimed this turn (fraud safeguard)`
      );
      return { state, events };
    }

    this.processedFactions.add(response.factionId);

    // Check if faction is claiming charity
    if (response.actionType === "CLAIM_CHARITY" || !response.passed) {
      return this.processCharityClaim(state, response.factionId, events);
    } else {
      // Faction declined charity
      console.log(
        `  ❌ ${FACTION_NAMES[response.factionId]}: Declines CHOAM Charity`
      );
      // Note: No event for declining charity - only claim events are tracked
      return { state, events };
    }
  }

  /**
   * Process a charity claim for a faction.
   * Calculates amount, updates state, and creates events.
   */
  private processCharityClaim(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const factionState = getFactionState(state, faction);
    const currentSpice = factionState.spice;

    // Calculate charity amount using rules helper
    const charityAmount = getCharityAmount(state, faction, currentSpice);

    // Log claim with appropriate message
    const isBGAdvanced =
      faction === Faction.BENE_GESSERIT && state.config.advancedRules;
    if (isBGAdvanced) {
      console.log(
        `  ✅ ${FACTION_NAMES[faction]}: Claims charity (Advanced - always 2 spice)`
      );
      console.log(
        `     Current: ${currentSpice} spice → Receives: ${charityAmount} spice → New total: ${
          currentSpice + charityAmount
        } spice`
      );
    } else {
      console.log(`  ✅ ${FACTION_NAMES[faction]}: Claims charity`);
      console.log(
        `     Current: ${currentSpice} spice → Receives: ${charityAmount} spice → New total: 2 spice`
      );
    }

    if (charityAmount > 0) {
      let newState = addSpice(state, faction, charityAmount);

      events.push({
        type: "CHARITY_CLAIMED",
        data: {
          faction,
          amount: charityAmount,
          newTotal: currentSpice + charityAmount,
        },
        message: `${faction} claims ${charityAmount} spice in CHOAM Charity (${currentSpice} → ${
          currentSpice + charityAmount
        })`,
      });

      newState = logAction(newState, "CHOAM_CHARITY_CLAIMED", faction, {
        amount: charityAmount,
        previousSpice: currentSpice,
        newSpice: currentSpice + charityAmount,
      });

      return { state: newState, events };
    } else {
      console.log(
        `  ⚠️  ${FACTION_NAMES[faction]}: Already has 2+ spice, no charity needed`
      );
      return { state, events };
    }
  }

  private requestCharityDecisions(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    for (const faction of this.eligibleFactions) {
      if (this.processedFactions.has(faction)) continue;

      const factionState = getFactionState(state, faction);

      pendingRequests.push(
        createAgentRequest(
          faction,
          "CLAIM_CHARITY",
          `You have ${factionState.spice} spice and are eligible for CHOAM Charity (${GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT} spice). Do you want to claim it?`,
          {
            currentSpice: factionState.spice,
            charityAmount: GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT,
          },
          ["CLAIM_CHARITY", "PASS"]
        )
      );
    }

    return this.pending(state, pendingRequests, true, events);
  }
}
