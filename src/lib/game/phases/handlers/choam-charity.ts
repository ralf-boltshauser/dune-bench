/**
 * CHOAM Charity Phase Handler
 *
 * Phase 1.03: CHOAM Charity
 * - Factions with 0–1 spice may claim CHOAM charity
 * - Charity brings a player up to 2 spice from the bank
 * - Claiming is optional (faction can decline)
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
      console.log("   ℹ️  No factions eligible for CHOAM Charity. Skipping phase.\n");
      return this.complete(state, Phase.BIDDING, events);
    }

    // Request charity decisions from eligible factions (simultaneously)
    console.log(
      `   📤 Requesting decisions from ${this.eligibleFactions.length} eligible faction(s)\n`
    );
    const result = this.requestCharityDecisions(state, events);
    
    // DEFENSIVE CHECK: Verify requests were created
    if (result.pendingRequests.length === 0) {
      console.error(
        `\n❌ BUG: requestCharityDecisions() returned empty pendingRequests!`
      );
      console.error(
        `   Eligible factions: ${this.eligibleFactions.map((f) => FACTION_NAMES[f]).join(", ")}`
      );
      throw new Error(
        `Failed to create charity requests. Eligible factions exist but no requests created.`
      );
    }
    
    // CRITICAL FIX: Ensure phaseComplete is false when we have pending requests
    // This prevents the phase manager from completing the phase prematurely
    if (result.phaseComplete) {
      console.error(
        `\n❌ BUG: requestCharityDecisions() returned phaseComplete: true with pending requests!`
      );
      console.error(
        `   Pending requests: ${result.pendingRequests.length}`
      );
      throw new Error(
        `Phase cannot be complete when there are pending requests. This is a critical bug.`
      );
    }
    
    console.log(
      `   ✅ Returning ${result.pendingRequests.length} pending request(s), phaseComplete: ${result.phaseComplete}\n`
    );
    
    return result;
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    console.log("\n" + "=".repeat(80));
    console.log("💰 PROCESSING CHOAM CHARITY CLAIMS");
    console.log("=".repeat(80));
    console.log(`   Received ${responses.length} response(s)`);

    // CRITICAL FIX: If no responses were received but we have eligible factions,
    // we must request decisions again. This prevents the phase from completing
    // prematurely when the phase manager calls processStep with empty responses.
    const remaining = this.eligibleFactions.filter(
      (f) => !this.processedFactions.has(f)
    );

    // If we have eligible factions but no responses, we need to request decisions
    // This can happen if the phase manager calls processStep before getting agent responses
    if (responses.length === 0 && remaining.length > 0) {
      console.log(
        `   ⚠️  No responses received, but ${remaining.length} eligible faction(s) still need to decide: ${remaining.map((f) => FACTION_NAMES[f]).join(", ")}`
      );
      console.log(
        `   🔄 Requesting decisions again...`
      );
      return this.requestCharityDecisions(newState, events);
    }

    // Process charity claims
    // Rule 1.03.02: A Player may only Claim CHOAM Charity once a Turn
    for (const response of responses) {
      const result = this.processCharityResponse(newState, response);
      newState = result.state;
      events.push(...result.events);
    }

    console.log("=".repeat(80) + "\n");

    // Check if all eligible factions have been processed
    const stillRemaining = this.eligibleFactions.filter(
      (f) => !this.processedFactions.has(f)
    );

    if (stillRemaining.length > 0) {
      console.log(
        `   ⏳ ${stillRemaining.length} faction(s) still need to decide: ${stillRemaining.map((f) => FACTION_NAMES[f]).join(", ")}`
      );
      return this.requestCharityDecisions(newState, events);
    }

    // VALIDATION: Ensure all eligible factions were processed before completing
    if (this.eligibleFactions.length > 0 && this.processedFactions.size === 0) {
      console.error(
        `\n❌ BUG: Phase completing without processing any eligible factions!`
      );
      console.error(
        `   Eligible factions: ${this.eligibleFactions.map((f) => FACTION_NAMES[f]).join(", ")}`
      );
      console.error(
        `   Processed factions: ${Array.from(this.processedFactions).map((f) => FACTION_NAMES[f]).join(", ") || "none"}`
      );
      console.error(
        `   Responses received: ${responses.length}`
      );
      throw new Error(
        `Phase cannot complete without processing eligible factions: ${this.eligibleFactions.join(", ")}`
      );
    }

    console.log(
      `   ✅ All ${this.eligibleFactions.length} eligible faction(s) processed. Phase complete.\n`
    );

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
   * 
   * @rule 1.03.02 FRAUD SAFE GUARDS: A Player may only Claim CHOAM Charity once a Turn.
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
    // Only claim if explicitly CLAIM_CHARITY action type
    // PASS action type or missing response should decline
    if (response.actionType === "CLAIM_CHARITY") {
      return this.processCharityClaim(state, response.factionId, events);
    } else {
      // Faction declined charity (PASS action or no explicit claim)
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

    console.log(
      `\n📋 Requesting charity decisions from ${this.eligibleFactions.length} eligible faction(s)`
    );
    console.log(
      `   Eligible factions: ${this.eligibleFactions.map((f) => FACTION_NAMES[f]).join(", ")}`
    );
    console.log(
      `   Already processed: ${Array.from(this.processedFactions).map((f) => FACTION_NAMES[f]).join(", ") || "none"}`
    );

    for (const faction of this.eligibleFactions) {
      if (this.processedFactions.has(faction)) {
        console.log(
          `   ⏭️  Skipping ${FACTION_NAMES[faction]} (already processed)`
        );
        continue;
      }

      const factionState = getFactionState(state, faction);
      const charityAmount = getCharityAmount(state, faction, factionState.spice);
      const newTotal = factionState.spice + charityAmount;

      console.log(
        `   📨 Creating request for ${FACTION_NAMES[faction]} (${factionState.spice} spice → ${newTotal} spice)`
      );

      pendingRequests.push(
        createAgentRequest(
          faction,
          "CLAIM_CHARITY",
          `You have ${factionState.spice} spice and are eligible for CHOAM Charity. You will receive ${charityAmount} spice from the bank (bringing you to ${newTotal} spice total). This is free spice with no strings attached - you should almost always claim it. Only reject if you have a very specific strategic reason (which is extremely rare).`,
          {
            currentSpice: factionState.spice,
            charityAmount: charityAmount,
          },
          ["CLAIM_CHARITY", "PASS"]
        )
      );
    }

    // DEFENSIVE CHECK: Ensure requests are created when eligible factions exist
    if (pendingRequests.length === 0 && this.eligibleFactions.length > 0) {
      const unprocessed = this.eligibleFactions.filter(
        (f) => !this.processedFactions.has(f)
      );
      if (unprocessed.length > 0) {
        console.error(
          `\n❌ BUG: No requests created for ${unprocessed.length} eligible faction(s)!`
        );
        console.error(
          `   Eligible: ${this.eligibleFactions.map((f) => FACTION_NAMES[f]).join(", ")}`
        );
        console.error(
          `   Processed: ${Array.from(this.processedFactions).map((f) => FACTION_NAMES[f]).join(", ") || "none"}`
        );
        console.error(
          `   Unprocessed: ${unprocessed.map((f) => FACTION_NAMES[f]).join(", ")}`
        );
        throw new Error(
          `Failed to create charity requests for eligible factions: ${unprocessed.join(", ")}`
        );
      }
    }

    console.log(
      `   ✅ Created ${pendingRequests.length} request(s) for charity decisions\n`
    );

    return this.pending(state, pendingRequests, true, events);
  }
}
