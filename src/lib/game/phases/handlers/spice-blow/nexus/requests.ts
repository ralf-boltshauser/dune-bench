import { type GameState, Faction } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { SpiceBlowRequests } from "../requests/builders";
import { SpiceBlowEvents } from "../events/factory";
import { SpiceBlowResults } from "../results/factory";

/**
 * Get available factions for alliance (not already allied)
 */
export function getAvailableFactions(state: GameState, faction: Faction): Faction[] {
  return state.stormOrder.filter(
    (f) => f !== faction && !state.factions.get(f)?.allyId
  );
}

/**
 * Create an alliance decision request for a faction
 */
export function createAllianceRequest(
  faction: Faction,
  state: GameState
): ReturnType<typeof SpiceBlowRequests.allianceDecision> {
  return SpiceBlowRequests.allianceDecision(faction, state);
}

/**
 * Check if Nexus is complete (all factions have acted)
 * @rule 1.10.01.07
 */
export function isNexusComplete(context: SpiceBlowContext, state: GameState): boolean {
  // Check if all factions in storm order have acted
  return state.stormOrder.every((faction) =>
    context.factionsActedInNexus.has(faction)
  );
}

/**
 * Request alliance decisions from all factions
 */
export function requestNexusDecisions(
  state: GameState,
  context: SpiceBlowContext,
  events: PhaseEvent[]
): SpiceBlowStepResult {
  const pendingRequests = [];

  // Request from all factions in storm order
  for (const faction of state.stormOrder) {
    if (context.factionsActedInNexus.has(faction)) continue;

    const factionState = state.factions.get(faction);
    if (!factionState) continue;

    pendingRequests.push(createAllianceRequest(faction, state));
  }

  if (pendingRequests.length === 0) {
    // Nexus complete
    const updatedContext: SpiceBlowContext = {
      ...context,
      nexusResolved: true,
    };

    events.push(SpiceBlowEvents.nexusEnded());

    return SpiceBlowResults.incomplete(
      { ...state, nexusOccurring: false },
      updatedContext,
      events
    );
  }

  return SpiceBlowResults.pending(state, context, pendingRequests, events, false);
}

