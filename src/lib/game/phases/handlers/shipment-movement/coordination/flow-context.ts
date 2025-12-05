/**
 * Flow Context
 * 
 * Context information for flow coordination decisions.
 */

import { Faction, type GameState } from "../../../../types";
import { type AgentResponse, type PhaseEvent } from "@/lib/game/types";
import { type ShipmentMovementStateMachine } from "../state-machine";
import { type FactionPhase } from "../types";
import { FACTION_PHASES } from "../constants";

/**
 * Context for flow coordination
 */
export interface FlowContext {
  stateMachine: ShipmentMovementStateMachine;
  currentFaction: Faction | null;
  currentPhase: FactionPhase;
  responses: AgentResponse[];
  events: PhaseEvent[];
}

/**
 * Decision about what to do next
 */
export interface FlowDecision {
  type: 
    | "CONTINUE_CURRENT" 
    | "TRANSITION_PHASE" 
    | "ADVANCE_FACTION" 
    | "REQUEST_BG_ABILITY"
    | "REQUEST_GUILD"
    | "FINALIZE_PHASE";
  nextPhase?: FactionPhase;
  bgAbility?: {
    name: string;
    trigger: any;
  };
  guildAction?: "TIMING" | "BEFORE_FACTION" | "FINALIZE";
}

