/**
 * Game entity types - Leaders, Cards, Forces, and related structures.
 * These represent the physical game components each player uses.
 */

import { Faction, TreacheryCardType, SpiceCardType, ForceType } from './enums';
import { TerritoryId } from './territories';

// =============================================================================
// LEADERS
// =============================================================================

export interface LeaderDefinition {
  id: string;
  name: string;
  faction: Faction;
  strength: number;
}

// Runtime leader state (includes whether dead, used this turn, etc.)
export interface Leader {
  definitionId: string;
  faction: Faction;
  strength: number;
  location: LeaderLocation;
  hasBeenKilled: boolean; // Has this leader ever been killed?
  usedThisTurn: boolean; // Has fought in a territory this turn?
  usedInTerritoryId: TerritoryId | null; // Where they fought this turn
}

export enum LeaderLocation {
  LEADER_POOL = 'leader_pool', // Available to play
  TANKS_FACE_UP = 'tanks_face_up', // Dead, can be revived
  TANKS_FACE_DOWN = 'tanks_face_down', // Dead again, must wait
  IN_BATTLE = 'in_battle', // Currently in a battle
  ON_BOARD = 'on_board', // Survived battle, still in territory
  CAPTURED = 'captured', // Captured by Harkonnen
}

// =============================================================================
// TREACHERY CARDS
// =============================================================================

export interface TreacheryCardDefinition {
  id: string;
  name: string;
  type: TreacheryCardType;
  description: string;
  isProjectile?: boolean;
  isPoison?: boolean;
  isSpecial?: boolean;
  discardAfterUse?: boolean;
}

// Runtime card instance (for tracking deck/hand/discard state)
export interface TreacheryCard {
  definitionId: string;
  type: TreacheryCardType;
  location: CardLocation;
  ownerId: Faction | null; // null if in deck/discard
}

export enum CardLocation {
  DECK = 'deck',
  HAND = 'hand',
  DISCARD = 'discard',
  IN_PLAY = 'in_play', // Currently being used in battle
  SET_ASIDE = 'set_aside', // Family Atomics after use
}

// =============================================================================
// SPICE CARDS
// =============================================================================

export interface SpiceCardDefinition {
  id: string;
  name: string;
  type: SpiceCardType;
  territoryId?: TerritoryId; // For territory cards
  spiceAmount?: number; // Amount of spice blown
  sector?: number; // Which sector the spice appears in
}

export interface SpiceCard {
  definitionId: string;
  type: SpiceCardType;
  location: SpiceCardLocation;
}

export enum SpiceCardLocation {
  DECK = 'deck',
  DISCARD_A = 'discard_a', // First discard pile (advanced rules)
  DISCARD_B = 'discard_b', // Second discard pile (advanced rules)
  SET_ASIDE = 'set_aside', // Turn 1 Shai-Hulud
}

// =============================================================================
// TRAITOR CARDS
// =============================================================================

export interface TraitorCard {
  leaderId: string;
  leaderName: string;
  leaderFaction: Faction;
  heldBy: Faction | null; // null if not dealt
}

// =============================================================================
// FORCES
// =============================================================================

// A group of forces in a specific location
export interface ForceStack {
  factionId: Faction;
  territoryId: TerritoryId;
  sector: number;
  forces: ForceCount;
}

// Count of different force types
export interface ForceCount {
  regular: number;
  elite: number; // Sardaukar or Fedaykin
}

// Force location tracking for a single faction
export interface FactionForces {
  factionId: Faction;
  reserves: ForceCount; // Off-planet or local reserves (Fremen)
  onBoard: ForceStack[]; // Forces on the board
  tanks: ForceCount; // In Tleilaxu Tanks
}

// Bene Gesserit specific - tracks advisor vs fighter status
export interface BeneGesseritForces extends FactionForces {
  advisorLocations: Map<TerritoryId, number>; // Advisors by territory
  fighterLocations: Map<TerritoryId, number>; // Fighters by territory
}

// =============================================================================
// SPICE ON BOARD
// =============================================================================

export interface SpiceLocation {
  territoryId: TerritoryId;
  sector: number;
  amount: number;
}

// =============================================================================
// BATTLE PLAN
// =============================================================================

export interface BattlePlan {
  factionId: Faction;
  forcesDialed: number;
  leaderId: string | null;
  cheapHeroUsed: boolean;
  weaponCardId: string | null;
  defenseCardId: string | null;
  // Atreides specific
  kwisatzHaderachUsed: boolean;
  // Advanced rules
  spiceDialed: number;
  // Computed values (filled in during resolution)
  totalStrength?: number;
  leaderKilled?: boolean;
}

// =============================================================================
// DEALS AND BRIBES
// =============================================================================

export interface Deal {
  id: string;
  proposerId: Faction;
  targetId: Faction;
  terms: string; // Description of the deal
  spiceAmount: number; // 0 for non-bribe deals
  status: DealStatus;
  createdAt: number; // Turn number
  expiresAt: number | null; // Turn number or null for immediate
}

export enum DealStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// =============================================================================
// ALLIANCE
// =============================================================================

export interface Alliance {
  factions: [Faction, Faction];
  formedOnTurn: number;
}

// =============================================================================
// BENE GESSERIT PREDICTION
// =============================================================================

export interface BeneGesseritPrediction {
  faction: Faction;
  turn: number;
}

// =============================================================================
// KWISATZ HADERACH (Atreides)
// =============================================================================

export interface KwisatzHaderach {
  isActive: boolean;
  forcesLostCount: number; // Activates at 7+
  isDead: boolean;
  usedInTerritoryThisTurn: TerritoryId | null; // Track territory where KH was used this turn
}
