/**
 * BG Ability Registry
 * 
 * Centralized registry for all Bene Gesserit abilities.
 * Makes it easy to add new abilities and ensures consistent handling.
 */

import { type GameState } from "@/lib/game/types";
import { type AgentResponse, type PhaseEvent, type PhaseStepResult } from "../../../../../types";
import { type ProcessingResult } from "../../types";

/**
 * Context for checking if an ability should trigger
 */
export interface BGAbilityContext {
  state: GameState;
  faction: any; // Faction that triggered the ability
  actionType?: string;
  territoryId?: string;
  sector?: number;
}

/**
 * Trigger data for an ability
 */
export interface BGAbilityTrigger {
  territory: string;
  sector: number;
  [key: string]: any;
}

/**
 * Interface for BG abilities
 */
export interface BGAbility {
  /**
   * Unique name for the ability
   */
  name: string;

  /**
   * Priority (lower = higher priority)
   * INTRUSION should be checked before Spiritual Advisor
   */
  priority: number;

  /**
   * Check if this ability should trigger
   */
  shouldTrigger(context: BGAbilityContext): boolean;

  /**
   * Request decision from BG
   */
  requestDecision(
    state: GameState,
    events: PhaseEvent[],
    trigger: BGAbilityTrigger
  ): PhaseStepResult;

  /**
   * Process BG's decision
   */
  processDecision(
    state: GameState,
    responses: AgentResponse[],
    trigger: BGAbilityTrigger | null
  ): ProcessingResult;
}

/**
 * Registry for BG abilities
 */
export class BGAbilityRegistry {
  private abilities: BGAbility[] = [];

  /**
   * Register a BG ability
   */
  register(ability: BGAbility): void {
    this.abilities.push(ability);
    // Sort by priority (lower priority = checked first)
    this.abilities.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all abilities that should trigger, ordered by priority
   */
  getTriggeredAbilities(context: BGAbilityContext): BGAbility[] {
    return this.abilities.filter((ability) => ability.shouldTrigger(context));
  }

  /**
   * Get ability by name
   */
  getAbility(name: string): BGAbility | undefined {
    return this.abilities.find((a) => a.name === name);
  }

  /**
   * Get all registered abilities
   */
  getAllAbilities(): readonly BGAbility[] {
    return [...this.abilities];
  }
}

