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
  FACTION_NAMES,
} from '../../types';
import {
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import {
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';
import { BasePhaseHandler } from '../base-handler';
import { createAgentRequest } from '../helpers';

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

    console.log('\n' + '='.repeat(80));
    console.log('💰 CHOAM CHARITY PHASE (Turn ' + state.turn + ')');
    console.log('='.repeat(80));

    // Find factions eligible for charity
    // Rule 1.03.01: Players with 0 or 1 spice can claim CHOAM Charity
    // Rule 2.02.09 (Advanced): Bene Gesserit always eligible regardless of spice
    for (const [faction, factionState] of state.factions) {
      const currentSpice = factionState.spice;
      let isEligible = false;
      let reason = '';

      // Check Bene Gesserit advanced ability
      if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
        // Rule 2.02.09: Bene Gesserit always receive at least 2 spice regardless of holdings
        isEligible = true;
        reason = 'Bene Gesserit (Advanced) - always eligible';
      } else if (currentSpice <= GAME_CONSTANTS.CHOAM_CHARITY_THRESHOLD) {
        // Standard eligibility: 0 or 1 spice
        isEligible = true;
        reason = `${currentSpice} spice (eligible: 0-1 spice)`;
      }

      if (isEligible) {
        this.eligibleFactions.push(faction);
        console.log(`  ✅ ${FACTION_NAMES[faction]}: ${reason}`);
      } else {
        console.log(`  ❌ ${FACTION_NAMES[faction]}: ${currentSpice} spice (not eligible)`);
      }
    }

    console.log(`\n  📊 ${this.eligibleFactions.length} faction(s) eligible for CHOAM Charity`);
    console.log('='.repeat(80) + '\n');

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here
    // Just emit eligible factions info
    events.push({
      type: 'CHOAM_ELIGIBLE',
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

    console.log('\n' + '='.repeat(80));
    console.log('💰 PROCESSING CHOAM CHARITY CLAIMS');
    console.log('='.repeat(80));

    // Process charity claims
    // Rule 1.03.02: A Player may only Claim CHOAM Charity once a Turn
    for (const response of responses) {
      // Fraud safeguard: Check if already processed this turn
      if (this.processedFactions.has(response.factionId)) {
        console.log(`  ⚠️  ${FACTION_NAMES[response.factionId]}: Already claimed this turn (fraud safeguard)`);
        continue;
      }

      this.processedFactions.add(response.factionId);

      if (response.actionType === 'CLAIM_CHARITY' || !response.passed) {
        // Faction claims charity
        const factionState = getFactionState(newState, response.factionId);
        const currentSpice = factionState.spice;

        // Rule 1.03.01: Spice is collected to bring their total to 2 spice
        // Standard: 0 spice → 2 spice, 1 spice → 1 spice
        // Bene Gesserit (Advanced): Always receive at least 2 spice
        let charityAmount: number;
        if (response.factionId === Faction.BENE_GESSERIT && newState.config.advancedRules) {
          // Rule 2.02.09: Bene Gesserit always receive at least 2 spice
          charityAmount = 2;
          console.log(`  ✅ ${FACTION_NAMES[response.factionId]}: Claims charity (Advanced - always 2 spice)`);
          console.log(`     Current: ${currentSpice} spice → Receives: ${charityAmount} spice → New total: ${currentSpice + charityAmount} spice`);
        } else {
          // Standard: Bring to 2 spice total
          charityAmount = Math.max(0, 2 - currentSpice);
          console.log(`  ✅ ${FACTION_NAMES[response.factionId]}: Claims charity`);
          console.log(`     Current: ${currentSpice} spice → Receives: ${charityAmount} spice → New total: 2 spice`);
        }

        // TODO: Homeworlds variant - Low Threshold bonus (+1 spice)
        // This would be added here if homeworlds variant is active

        if (charityAmount > 0) {
        newState = addSpice(newState, response.factionId, charityAmount);

        events.push({
          type: 'CHARITY_CLAIMED',
            data: { faction: response.factionId, amount: charityAmount, newTotal: currentSpice + charityAmount },
            message: `${response.factionId} claims ${charityAmount} spice in CHOAM Charity (${currentSpice} → ${currentSpice + charityAmount})`,
        });

        newState = logAction(newState, 'CHOAM_CHARITY_CLAIMED', response.factionId, {
          amount: charityAmount,
            previousSpice: currentSpice,
            newSpice: currentSpice + charityAmount,
        });
        } else {
          console.log(`  ⚠️  ${FACTION_NAMES[response.factionId]}: Already has 2+ spice, no charity needed`);
        }
      } else {
        console.log(`  ❌ ${FACTION_NAMES[response.factionId]}: Declines CHOAM Charity`);
        // Note: No event for declining charity - only claim events are tracked
      }
    }

    console.log('='.repeat(80) + '\n');

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
          'REVIVE_FORCES', // Reusing type for charity
          `You have ${factionState.spice} spice and are eligible for CHOAM Charity (${GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT} spice). Do you want to claim it?`,
          {
          currentSpice: factionState.spice,
          charityAmount: GAME_CONSTANTS.CHOAM_CHARITY_AMOUNT,
        },
          ['CLAIM_CHARITY', 'PASS']
        )
      );
    }

    return this.pending(state, pendingRequests, true, events);
  }
}
