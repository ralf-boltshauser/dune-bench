import { getFactionsInTerritory } from "../../../../state";
import { Faction, type GameState } from "../../../../types";
import { type AgentResponse, type PhaseEvent } from "../../../types";
import { type DeckType, type Location, type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { devourForcesInTerritory, executeDevour } from "./devouring";
import { SpiceBlowEvents } from "../events/factory";
import { SpiceBlowLogger } from "../utils/logger";
import { SpiceBlowRequests } from "../requests/builders";
import { SpiceBlowResults } from "../results/factory";

// Re-export for backward compatibility
export const createProtectionRequest = SpiceBlowRequests.fremenProtection;
export const createWormRideRequest = SpiceBlowRequests.wormRide;

/**
 * Process Fremen's decision on whether to protect their ally from sandworm devouring.
 */
export function processFremenProtectionDecision(
  state: GameState,
  responses: AgentResponse[],
  context: SpiceBlowContext,
  revealSpiceCard: (state: GameState, deckType: DeckType) => SpiceBlowStepResult
): SpiceBlowStepResult {
  const fremenResponse = responses.find(
    (r) => r.factionId === Faction.FREMEN
  );

  const updatedContext: SpiceBlowContext = {
    ...context,
    fremenProtectionDecision:
      fremenResponse?.actionType === "PROTECT_ALLY" ? "protect" : "allow",
  };

  SpiceBlowLogger.fremenProtectionDecision(
    fremenResponse?.actionType === "PROTECT_ALLY"
  );

  // Now execute the devour with the protection decision
  const devourLocation = context.pendingDevourLocation;
  if (!devourLocation) {
    throw new Error(
      "No pending devour location for Fremen protection decision"
    );
  }

  const events: PhaseEvent[] = [];
  const devourResult = executeDevour(state, devourLocation, events, updatedContext);
  const newState = devourResult.state;
  const newEvents = devourResult.events;

  // Get the deck type before resetting context
  const deckType = context.pendingDevourDeck || "A";

  // Reset protection context
  const finalContext: SpiceBlowContext = {
    ...updatedContext,
    fremenProtectionDecision: null,
    pendingDevourLocation: null,
    pendingDevourDeck: null,
  };

  // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded"
  // Keep drawing cards until we get a Territory Card
  SpiceBlowLogger.continueDrawing();

  // Note: We need to update context in the caller, so we return the context
  // The caller will handle the revealSpiceCard call
  return SpiceBlowResults.incomplete(newState, finalContext, newEvents);
}

/**
 * Process Fremen's worm choice (ride or devour)
 */
export function processFremenWormChoice(
  state: GameState,
  responses: AgentResponse[],
  context: SpiceBlowContext,
  requestNexusDecisions: (state: GameState, events: PhaseEvent[]) => SpiceBlowStepResult
): SpiceBlowStepResult {
  const events: PhaseEvent[] = [];
  let newState = state;

  const fremenResponse = responses.find(
    (r) => r.factionId === Faction.FREMEN
  );

  const updatedContext: SpiceBlowContext = {
    ...context,
    fremenWormChoice:
      fremenResponse?.actionType === "WORM_RIDE" ? "ride" : "devour",
  };

  if (fremenResponse?.actionType === "WORM_RIDE") {
    // Fremen rides the worm - can move to any sand territory
    // @rule 2.04.08 BEAST OF BURDEN: Upon conclusion of the Nexus you may ride the sandworm
    // Note: The actual movement happens after Nexus, but we mark the choice now
    events.push(SpiceBlowEvents.fremenRodeWorm());
  } else {
    // Normal devour - use the topmost Territory Card location
    const devourLocation = context.lastSpiceLocation;
    if (devourLocation) {
      const devourResult = devourForcesInTerritory(
        newState,
        devourLocation,
        events,
        updatedContext
      );

      // Check if we need to wait for Fremen protection decision
      if ("pendingRequests" in devourResult) {
        return SpiceBlowResults.withContext(devourResult, updatedContext);
      }

      newState = devourResult.state;
      events.push(...devourResult.events);
    }
  }

  // Trigger Nexus
  const finalContext: SpiceBlowContext = {
    ...updatedContext,
    nexusTriggered: true,
  };
  newState = { ...newState, nexusOccurring: true };

  events.push(SpiceBlowEvents.nexusStarted());

  const result = requestNexusDecisions(newState, events);
  return SpiceBlowResults.withContext(result, finalContext);
}

