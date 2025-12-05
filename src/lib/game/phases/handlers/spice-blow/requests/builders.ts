import { Faction, FACTION_NAMES, type GameState } from "../../../../types";
import { type AgentRequest } from "../../../types";
import { createAgentRequest } from "../../../helpers";
import { type Location } from "../types";

/**
 * Request Builders for Spice Blow Phase
 * 
 * Centralized creation of agent requests.
 * Ensures consistent request structure.
 */

export const SpiceBlowRequests = {
  /**
   * Create a request for Fremen to decide whether to protect their ally from sandworm
   */
  fremenProtection: (
    location: Location,
    ally: Faction,
    allyForces: number
  ): AgentRequest => {
    return createAgentRequest(
      Faction.FREMEN,
      "PROTECT_ALLY_FROM_WORM",
      `Shai-Hulud appears in ${location.territoryId}! Your ally ${FACTION_NAMES[ally]} has ${allyForces} forces there. Do you want to protect them from being devoured?`,
      {
        territory: location.territoryId,
        sector: location.sector,
        ally,
        allyForces,
      },
      ["PROTECT_ALLY", "ALLOW_DEVOURING"]
    );
  },

  /**
   * Create a request for Fremen to decide whether to ride the worm or let it devour
   */
  wormRide: (location: Location, forcesInTerritory: Faction[]): AgentRequest => {
    return createAgentRequest(
      Faction.FREMEN,
      "WORM_RIDE",
      "A sandworm appeared! Do you want to ride the worm or let it devour forces?",
      {
        lastSpiceLocation: location,
        forcesInTerritory,
      },
      ["WORM_RIDE", "WORM_DEVOUR"]
    );
  },

  /**
   * Create an alliance decision request for a faction
   */
  allianceDecision: (
    faction: Faction,
    state: GameState
  ): AgentRequest => {
    const factionState = state.factions.get(faction);
    if (!factionState) {
      throw new Error(`Faction ${faction} not found in game state`);
    }

    const availableFactions = state.stormOrder.filter(
      (f) => f !== faction && !state.factions.get(f)?.allyId
    );

    return createAgentRequest(
      faction,
      "ALLIANCE_DECISION",
      `Nexus! You may form or break an alliance. Current ally: ${
        factionState.allyId || "None"
      }`,
      {
        currentAlly: factionState.allyId,
        availableFactions,
        turn: state.turn,
      },
      ["FORM_ALLIANCE", "BREAK_ALLIANCE", "PASS"]
    );
  },
};

