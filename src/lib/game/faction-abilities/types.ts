/**
 * Types for faction abilities system
 */

import { Faction, type GameState, type TreacheryCard } from '../types';
import { type AgentRequest } from '../phases/types';

/**
 * Context for creating ability-related agent requests
 */
export interface AbilityContext {
  state: GameState;
  cardId?: string;
  cardDef?: { name?: string; type?: string };
  [key: string]: unknown;
}

/**
 * Result of checking/processing a faction ability
 */
export interface AbilityResult {
  shouldTrigger: boolean;
  request?: AgentRequest;
  events?: Array<{ type: string; data: Record<string, unknown>; message: string }>;
}

