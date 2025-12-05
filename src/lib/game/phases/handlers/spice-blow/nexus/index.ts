import { getFactionsInTerritory, logAction } from "../../../../state";
import { Faction, type GameState } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { checkNexusTriggerAfterTerritoryCard } from "./detection";
import { requestNexusDecisions } from "./requests";
import { SpiceBlowRequests } from "../requests/builders";
import { SpiceBlowEvents } from "../events/factory";
import { SpiceBlowLogger } from "../utils/logger";
import { SpiceBlowResults } from "../results/factory";

/**
 * Trigger Nexus after Territory Card is placed following Shai-Hulud
 * @rule 1.02.06
 * @rule 1.10.00
 */
export function triggerNexus(
  state: GameState,
  context: SpiceBlowContext,
  events: PhaseEvent[]
): SpiceBlowStepResult {
  SpiceBlowLogger.territoryCardFound(context.shaiHuludCount);

  let nexusState = state;

  // Check if Fremen is in game for worm control
  const hasFremen = nexusState.factions.has(Faction.FREMEN);

  if (hasFremen && context.lastSpiceLocation) {
    // Fremen can choose to ride the worm (Rule 2.04.08)
    // "BEAST OF BURDEN: Upon conclusion of the Nexus you may ride the sandworm"
    // Note: This happens AFTER the Territory Card is placed, but BEFORE Nexus
    SpiceBlowLogger.fremenInGame();

    const pendingRequests = [
      SpiceBlowRequests.wormRide(
        context.lastSpiceLocation,
        getFactionsInTerritory(
          nexusState,
          context.lastSpiceLocation.territoryId
        )
      ),
    ];

    return SpiceBlowResults.pending(nexusState, context, pendingRequests, events);
  }

  // Trigger Nexus
  const updatedContext: SpiceBlowContext = {
    ...context,
    nexusTriggered: true,
  };
  nexusState = { ...nexusState, nexusOccurring: true };

  SpiceBlowLogger.nexusTriggered();

  events.push(SpiceBlowEvents.nexusStarted());

  nexusState = logAction(nexusState, "NEXUS_STARTED", null, {});

  // Request alliance decisions from all factions
  const result = requestNexusDecisions(nexusState, updatedContext, events);
  return SpiceBlowResults.withContext(result, updatedContext);
}

