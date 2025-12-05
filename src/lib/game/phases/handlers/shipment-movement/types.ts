/**
 * Shared Types and Interfaces for Shipment & Movement Phase
 *
 * Single source of truth for all types used across modules.
 */

import { Faction, TerritoryId, type GameState } from "@/lib/game/types";
import { type AgentResponse, type PhaseEvent } from "../../types";

/**
 * Current faction's phase within their turn
 */
export type FactionPhase = "SHIP" | "MOVE" | "DONE";

/**
 * BG Spiritual Advisor trigger data
 */
export interface BGSpiritualAdvisorTrigger {
  territory: TerritoryId;
  sector: number;
}

/**
 * BG INTRUSION trigger data
 */
export interface BGIntrusionTrigger {
  territory: TerritoryId;
  sector: number;
  enteringFaction: Faction;
}

/**
 * BG WARTIME territory data
 */
export interface BGWartimeTerritory {
  territoryId: TerritoryId;
  sector: number;
  advisorCount: number;
}

/**
 * BG TAKE UP ARMS trigger data
 */
export interface BGTakeUpArmsTrigger {
  territory: TerritoryId;
  sector: number;
  advisorCount: number;
}

/**
 * Guild state information
 */
export interface GuildState {
  inGame: boolean;
  completed: boolean;
  wantsToDelayToEnd: boolean;
  askBeforeNextFaction: boolean;
}

/**
 * Complete state machine state
 */
export interface ShipmentMovementState {
  currentFactionIndex: number;
  nonGuildStormOrder: Faction[];
  currentFactionPhase: FactionPhase;
  currentFaction: Faction | null;
  guildState: GuildState;
  bgSpiritualAdvisor: {
    waiting: boolean;
    trigger: BGSpiritualAdvisorTrigger | null;
  };
  bgIntrusion: {
    waiting: boolean;
    trigger: BGIntrusionTrigger | null;
  };
  bgWartime: {
    waiting: boolean;
    territories: BGWartimeTerritory[];
  };
  bgTakeUpArms: {
    waiting: boolean;
    trigger: BGTakeUpArmsTrigger | null;
  };
  ornithopterAccessAtPhaseStart: Set<Faction>;
}

/**
 * Processing result for shipment/movement operations
 */
export interface ProcessingResult {
  state: GameState;
  events: PhaseEvent[];
}

/**
 * BG ability type identifiers
 */
export type BGAbilityType =
  | "SPIRITUAL_ADVISOR"
  | "INTRUSION"
  | "WARTIME"
  | "TAKE_UP_ARMS";

