/**
 * Flow Coordinator
 * 
 * Handles complex flow logic and decision-making for the phase.
 * Simplifies the main handler by extracting coordination logic.
 */

import { Faction, type GameState } from "../../../../types";
import { type AgentResponse, type PhaseEvent, type PhaseStepResult } from "@/lib/game/types";
import { type ShipmentMovementStateMachine } from "../state-machine";
import { type FlowContext, type FlowDecision } from "./flow-context";
import { ResponseParser } from "../utils/response-parser";
import { extractIntrusionTerritory, extractSpiritualAdvisorTerritory } from "../utils/territory-extraction";
import { type BGIntrusionHandler } from "../handlers/bg-abilities/bg-intrusion";
import { type BGSpiritualAdvisorHandler } from "../handlers/bg-abilities/bg-advisors";

/**
 * Coordinates the flow of the shipment-movement phase
 */
export class FlowCoordinator {
  private responseParser: ResponseParser;

  constructor(
    private bgIntrusion: BGIntrusionHandler,
    private bgAdvisors: BGSpiritualAdvisorHandler
  ) {
    this.responseParser = new ResponseParser();
  }

  /**
   * Determine what BG abilities should be triggered after a shipment
   */
  checkShipmentBGTriggers(
    state: GameState,
    response: AgentResponse,
    faction: Faction,
    stateMachine: ShipmentMovementStateMachine
  ): {
    intrusion?: { territoryId: string; sector: number };
    spiritualAdvisor?: { territoryId: string; sector: number };
  } {
    const triggers: {
      intrusion?: { territoryId: string; sector: number };
      spiritualAdvisor?: { territoryId: string; sector: number };
    } = {};

    // Check INTRUSION first (higher priority)
    const intrusionTerritory = extractIntrusionTerritory(
      response,
      response.actionType || ""
    );
    if (
      intrusionTerritory.territoryId &&
      intrusionTerritory.sector !== undefined &&
      this.bgIntrusion.shouldTrigger(
        state,
        faction,
        intrusionTerritory.territoryId,
        intrusionTerritory.sector
      )
    ) {
      triggers.intrusion = {
        territoryId: intrusionTerritory.territoryId,
        sector: intrusionTerritory.sector,
      };
    }

    // Check Spiritual Advisor (only for off-planet shipments)
    if (
      this.bgAdvisors.shouldTrigger(state, faction, response.actionType)
    ) {
      const advisorTerritory = extractSpiritualAdvisorTerritory(response);
      if (advisorTerritory.territoryId && advisorTerritory.sector !== undefined) {
        triggers.spiritualAdvisor = {
          territoryId: advisorTerritory.territoryId,
          sector: advisorTerritory.sector,
        };
      }
    }

    return triggers;
  }

  /**
   * Determine what BG abilities should be triggered after a movement
   */
  checkMovementBGTriggers(
    state: GameState,
    response: AgentResponse,
    faction: Faction
  ): {
    intrusion?: { territoryId: string; sector: number };
  } {
    const triggers: {
      intrusion?: { territoryId: string; sector: number };
    } = {};

    // Check INTRUSION
    const intrusionTerritory = extractIntrusionTerritory(
      response,
      response.actionType || ""
    );
    if (
      intrusionTerritory.territoryId &&
      intrusionTerritory.sector !== undefined &&
      this.bgIntrusion.shouldTrigger(
        state,
        faction,
        intrusionTerritory.territoryId,
        intrusionTerritory.sector
      )
    ) {
      triggers.intrusion = {
        territoryId: intrusionTerritory.territoryId,
        sector: intrusionTerritory.sector,
      };
    }

    return triggers;
  }

  /**
   * Check if response is a shipment action
   */
  isShipmentAction(response: AgentResponse): boolean {
    return this.responseParser.isShipmentAction(response);
  }

  /**
   * Check if response is a movement action
   */
  isMovementAction(response: AgentResponse): boolean {
    return this.responseParser.isMovementAction(response);
  }

  /**
   * Check if agent wants to skip shipment (responded with MOVE during SHIP phase)
   */
  wantsToSkipShipment(response: AgentResponse, currentPhase: string): boolean {
    return (
      currentPhase === "SHIP" &&
      !response.passed &&
      response.actionType === "MOVE_FORCES"
    );
  }
}

