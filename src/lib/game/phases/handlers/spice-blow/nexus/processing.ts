import { logAction } from "../../../../state";
import { type GameState, Faction } from "../../../../types";
import { type AgentResponse, type PhaseEvent } from "../../../types";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { requestNexusDecisions } from "./requests";
import { formAlliance, breakAlliance, validateAllianceTarget } from "./alliances";
import { SpiceBlowEvents } from "../events/factory";

/**
 * Process Nexus responses from factions
 */
export function processNexusResponses(
  state: GameState,
  responses: AgentResponse[],
  context: SpiceBlowContext,
  events: PhaseEvent[]
): SpiceBlowStepResult {
  const newEvents: PhaseEvent[] = [];
  let newState = state;
  const updatedContext: SpiceBlowContext = {
    ...context,
    factionsActedInNexus: new Set(context.factionsActedInNexus),
  };

  for (const response of responses) {
    updatedContext.factionsActedInNexus.add(response.factionId);

    if (
      response.actionType === "FORM_ALLIANCE" &&
      response.data.targetFaction
    ) {
      const targetFaction = response.data.targetFaction as Faction;
      
      // Check if target is available
      if (validateAllianceTarget(newState, targetFaction)) {
        // Form alliance
        newState = formAlliance(newState, response.factionId, targetFaction);

        newEvents.push(
          SpiceBlowEvents.allianceFormed(response.factionId, targetFaction)
        );

        newState = logAction(newState, "ALLIANCE_FORMED", response.factionId, {
          ally: targetFaction,
        });
      }
    } else if (response.actionType === "BREAK_ALLIANCE") {
      const factionState = newState.factions.get(response.factionId);
      if (factionState?.allyId) {
        const formerAlly = factionState.allyId;
        newState = breakAlliance(newState, response.factionId);

        newEvents.push(
          SpiceBlowEvents.allianceBroken(response.factionId, formerAlly)
        );

        newState = logAction(
          newState,
          "ALLIANCE_BROKEN",
          response.factionId,
          {
            formerAlly,
          }
        );
      }
    }
  }

  // Continue requesting from remaining factions
  return requestNexusDecisions(newState, updatedContext, [...events, ...newEvents]);
}

