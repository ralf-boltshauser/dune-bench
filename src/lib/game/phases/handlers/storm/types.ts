/**
 * Storm Phase Types
 * 
 * Shared types and interfaces for storm phase modules.
 */

import { Faction, TerritoryId, type GameState } from "../../../types";
import { type PhaseEvent, type StormPhaseContext } from "../../types";

/**
 * Result of storm deck reveal operation
 */
export interface StormDeckRevealResult {
  movement: number;
  cardValue: string;
  events: PhaseEvent[];
}

/**
 * Result of storm deck draw operation
 */
export interface StormDeckDrawResult {
  state: GameState;
  card: number | null;
  error: string | null;
}

/**
 * Result of storm deck operations after movement
 */
export interface StormDeckAfterMovementResult {
  state: GameState;
  events: PhaseEvent[];
}

/**
 * Force destruction record
 */
export interface ForceDestructionRecord {
  faction: Faction;
  territoryId: TerritoryId;
  sector: number;
  count: number;
}

/**
 * Spice destruction record
 */
export interface SpiceDestructionRecord {
  territoryId: TerritoryId;
  sector: number;
  amount: number;
}


