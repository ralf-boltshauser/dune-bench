/**
 * Spice Blow Phase Handler
 *
 * Phase 1.02: Spice Blow
 * - Draw spice card(s) from TWO SEPARATE DECKS (A and B)
 * - Place spice on territories (unless in storm)
 * - Handle Shai-Hulud (sandworm) appearances
 * - Worms devour in territory of PREVIOUS CARD ON THAT PILE
 * - Trigger Nexus when worm appears
 * - First turn reveals 2 cards (A and B), subsequent turns reveal 1 (A)
 *
 * TWO-PILE SYSTEM:
 * - Card A drawn from spiceDeckA → discarded to spiceDiscardA
 * - Card B drawn from spiceDeckB → discarded to spiceDiscardB
 * - Worm on pile A devours at location from topmost Territory Card in spiceDiscardA
 * - Worm on pile B devours at location from topmost Territory Card in spiceDiscardB
 */

import { Phase } from "../../../types";
import { type GameState } from "../../../types";
import {
  type AgentResponse,
  type PhaseHandler,
} from "../../types";
import { createInitialContext, resetContext } from "./context";
import { initializePhase, shouldRevealCardB } from "./initialization";
import { revealSpiceCard as revealSpiceCardFn } from "./reveal";
import { validateNoSpiceInStorm } from "./validation";
import { reshuffleTurnOneWorms } from "./deck";
import { processFremenProtectionDecision, processFremenWormChoice } from "./shai-hulud/fremen-decisions";
import { processNexusResponses } from "./nexus/processing";
import { requestNexusDecisions } from "./nexus/requests";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "./types";

export class SpiceBlowPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SPICE_BLOW;

  private context: SpiceBlowContext = createInitialContext();

  initialize(state: GameState): SpiceBlowStepResult {
    // @rule 1.02.00 This is the second Phase of the Turn. The top card of the Spice Deck is Revealed and discarded.
    // (Spice cards are revealed and processed via initializePhase + revealSpiceCard.)
    // Reset context
    this.context = resetContext();

    // Initialize phase and reveal first card
    const result = initializePhase(state, (state, deckType) =>
      this.revealSpiceCard(state, deckType)
    );

    // Update context from result
    this.context = result.context;

    return result;
  }

  processStep(state: GameState, responses: AgentResponse[]): SpiceBlowStepResult {
    // Handle Fremen protection decision
    if (
      this.context.pendingDevourLocation &&
      this.context.fremenProtectionDecision === null
    ) {
      const result = processFremenProtectionDecision(
        state,
        responses,
        this.context,
        (state, deckType) => this.revealSpiceCard(state, deckType)
      );

      // Update context
      this.context = result.context;

      return result;
    }

    // Handle Nexus responses
    if (this.context.nexusTriggered && !this.context.nexusResolved) {
      const result = processNexusResponses(
        state,
        responses,
        this.context,
        []
      );

      // Update context
      this.context = result.context;

      return result;
    }

    // Handle Fremen worm choice
    if (
      this.context.shaiHuludCount > 0 &&
      this.context.fremenWormChoice === null
    ) {
      const result = processFremenWormChoice(
        state,
        responses,
        this.context,
        (state, events) => requestNexusDecisions(state, this.context, events)
      );

      // Update context
      this.context = result.context;

      return result;
    }

    // Continue with card reveals
    if (!this.context.cardARevealed) {
      const result = this.revealSpiceCard(state, "A");
      this.context = result.context;
      return result;
    }

    // @rule 1.13.02 - Double Spice Blow: In Advanced Rules, reveal a second card
    if (shouldRevealCardB(state, this.context)) {
      const result = this.revealSpiceCard(state, "B");
      this.context = result.context;
      return result;
    }

    // Runtime validation: Ensure no spice was placed in storm sectors
    validateNoSpiceInStorm(state);

    // Phase complete
    return {
      state,
      phaseComplete: true,
      nextPhase: Phase.CHOAM_CHARITY,
      pendingRequests: [],
      actions: [],
      events: [],
      context: this.context,
    };
  }

  cleanup(state: GameState): GameState {
    let newState = state;

    // Turn 1: Reshuffle set-aside Shai-Hulud cards back into BOTH decks (Rule 1.02.02)
    if (this.context.turnOneWormsSetAside.length > 0) {
      newState = reshuffleTurnOneWorms(newState, this.context);
    }

    // Reset nexus flag
    return { ...newState, nexusOccurring: false };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Reveal a spice card (internal method that manages context)
   */
  private revealSpiceCard(
    state: GameState,
    deckType: "A" | "B"
  ): SpiceBlowStepResult {
    const result = revealSpiceCardFn(
      state,
      deckType,
      this.context,
      (state, deckType) => this.revealSpiceCard(state, deckType)
    );

    // Update context from result
    this.context = result.context;

    return result;
  }
}

