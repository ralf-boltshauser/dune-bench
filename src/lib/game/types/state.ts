/**
 * Game state types - The complete state of a game at any point.
 * This is the central data structure that the game engine manages.
 */

import {
  Alliance,
  BattlePlan,
  BeneGesseritPrediction,
  Deal,
  FactionForces,
  KwisatzHaderach,
  Leader,
  SpiceCard,
  SpiceLocation,
  TraitorCard,
  TreacheryCard,
} from "./entities";
import {
  AllianceStatus,
  BattleSubPhase,
  Faction,
  Phase,
  WinCondition,
} from "./enums";
import { TerritoryId } from "./territories";

// =============================================================================
// GAME CONFIGURATION
// =============================================================================

export interface GameConfig {
  maxTurns: number;
  factions: Faction[];
  advancedRules: boolean;
  variants: GameVariants;
}

export interface GameVariants {
  shieldWallStronghold: boolean;
  leaderSkillCards: boolean;
  homeworlds: boolean;
}

// =============================================================================
// FACTION STATE
// =============================================================================

export interface FactionState {
  factionId: Faction;
  spice: number;
  spiceBribes: number; // Spice in front of shield (not yet collected)
  forces: FactionForces;
  leaders: Leader[];
  hand: TreacheryCard[]; // Cards in hand
  traitors: TraitorCard[]; // Traitor cards held
  allianceStatus: AllianceStatus;
  allyId: Faction | null;
  // Faction-specific state
  beneGesseritPrediction?: BeneGesseritPrediction;
  kwisatzHaderach?: KwisatzHaderach;
  fremenStormCard?: string | null; // Storm card for next turn
  emperorAllyRevivalsUsed?: number; // Track Emperor's ally revival bonus used this turn (0-3)
  fremenRevivalBoostGranted?: boolean; // Track if Fremen granted 3 free revivals to ally this turn
  eliteForcesRevivedThisTurn?: number; // Track elite forces (Sardaukar/Fedaykin) revived this turn (max 1 for Emperor/Fremen)
}

// =============================================================================
// PHASE-SPECIFIC STATE
// =============================================================================

export interface StormPhaseState {
  currentStormSector: number;
  stormDialValues: Map<Faction, number>; // Who dialed what
  stormMovement: number | null; // Calculated movement
}

export interface BiddingPhaseState {
  cardsForAuction: TreacheryCard[];
  currentCardIndex: number;
  currentBid: number;
  highBidder: Faction | null;
  passedFactions: Set<Faction>;
  startingBidder: Faction;
}

export interface BattlePhaseState {
  pendingBattles: PendingBattle[];
  currentBattle: Battle | null;
  subPhase: BattleSubPhase;
  aggressorIndex: number; // Index in storm order
}

export interface PendingBattle {
  territoryId: TerritoryId;
  sector: number;
  factions: Faction[]; // 2 or more factions present
}

export interface Battle {
  territoryId: TerritoryId;
  sector: number;
  aggressor: Faction;
  defender: Faction;
  aggressorPlan: BattlePlan | null;
  defenderPlan: BattlePlan | null;
  // Atreides prescience
  prescienceUsed: boolean;
  prescienceTarget: "leader" | "weapon" | "defense" | "number" | null;
  prescienceResult: string | null;
  // Bene Gesserit voice
  voiceUsed: boolean;
  voiceCommand: VoiceCommand | null;
  // Resolution
  winner: Faction | null;
  loser: Faction | null;
  traitorCalled: boolean;
  traitorCallerId: Faction | null;
}

export interface VoiceCommand {
  type: "play" | "not_play";
  cardType:
    | "poison_weapon"
    | "projectile_weapon"
    | "poison_defense"
    | "projectile_defense"
    | "worthless"
    | "cheap_hero"
    | "specific_weapon"
    | "specific_defense";
  specificCardName?: string; // For named special cards (e.g., 'lasgun', 'shield')
}

// =============================================================================
// KARAMA INTERRUPT STATE
// =============================================================================

/**
 * Tracking for Karama card interrupts.
 *
 * Karama allows players to:
 * 1. Cancel abilities with ✷ after them (after use)
 * 2. Prevent abilities with ✷ before and after them (before use)
 * 3. Purchase shipment at Guild rates
 * 4. Bid without having enough spice
 */
export interface KaramaInterruptState {
  // The current interrupt opportunity window
  interruptType: "cancel" | "prevent";

  // What ability is being targeted
  targetFaction: Faction;
  abilityName: string;
  abilityContext: Record<string, unknown>; // Context for the ability being interrupted

  // Who can respond with Karama
  eligibleFactions: Faction[]; // All factions except target

  // Responses collected
  responses: Map<Faction, KaramaResponse>;

  // Whether an interrupt occurred
  interrupted: boolean;
  interruptor: Faction | null;

  // Turn and phase when interrupt was triggered
  turn: number;
  phase: Phase;
}

export interface KaramaResponse {
  faction: Faction;
  useKarama: boolean;
  karamaCardId?: string; // The card used (or worthless card if Bene Gesserit)
}

// =============================================================================
// MAIN GAME STATE
// =============================================================================

export interface GameState {
  // Identity
  gameId: string;
  config: GameConfig;

  // Turn tracking
  turn: number;
  phase: Phase;
  setupComplete?: boolean; // True after setup phase (traitor selection) is done

  // Faction states
  factions: Map<Faction, FactionState>;
  stormOrder: Faction[]; // Order for current turn, determined by storm
  playerPositions: Map<Faction, number>; // Player token positions (sector 0-17) around board edge
  /**
   * Factions that are currently "active" for UI/agent decisions.
   * - Bidding: the faction whose turn it is to bid.
   * - Shipment/Movement: the faction currently shipping/moving.
   * - Battle: all factions involved in the current battle.
   * Empty when no one is actively acting.
   */
  activeFactions: Faction[];

  // Board state
  stormSector: number;
  /**
   * Legacy alias for storm sector used in older tests/utilities.
   * Prefer using stormSector in new code.
   */
  stormMarker?: number;
  shieldWallDestroyed: boolean;
  spiceOnBoard: SpiceLocation[];

  // Decks
  treacheryDeck: TreacheryCard[];
  treacheryDiscard: TreacheryCard[];
  spiceDeck: SpiceCard[]; // DEPRECATED: Use spiceDeckA and spiceDeckB instead
  spiceDeckA: SpiceCard[]; // Pile A deck (always used)
  spiceDeckB: SpiceCard[]; // Pile B deck (only used in advanced rules)
  spiceDiscardA: SpiceCard[];
  spiceDiscardB: SpiceCard[]; // Only used in advanced rules
  stormDeck: number[]; // Storm deck cards (values 1-6, one of each)

  // Alliances
  alliances: Alliance[];

  // Deals
  pendingDeals: Deal[];
  dealHistory: Deal[];

  // Phase-specific state
  stormPhase: StormPhaseState | null;
  biddingPhase: BiddingPhaseState | null;
  battlePhase: BattlePhaseState | null;

  // Victory tracking
  winner: WinResult | null;
  winAttempts: Map<Faction, number>; // For tiebreakers

  // Nexus tracking
  wormCount: number; // Total worms revealed (for Shield Wall variant)
  nexusOccurring: boolean;

  // Karama interrupt tracking
  karamaState: KaramaInterruptState | null;

  // BG Spiritual Advisor tracking (Rule 2.02.11)
  bgSpiritualAdvisorTrigger: { territory: TerritoryId; sector: number } | null;

  // Game log
  actionLog: GameAction[];
}

// =============================================================================
// WIN RESULT
// =============================================================================

export interface WinResult {
  condition: WinCondition;
  winners: Faction[];
  turn: number;
  details: string;
}

// =============================================================================
// GAME ACTIONS (for logging and replay)
// =============================================================================

export interface GameAction {
  id: string;
  turn: number;
  phase: Phase;
  factionId: Faction | null; // null for game events
  type: GameActionType;
  data: Record<string, unknown>;
  timestamp: number;
}

export type GameActionType =
  // Storm
  | "DIAL_STORM"
  | "STORM_MOVED"
  | "FORCES_DESTROYED_BY_STORM"
  | "SPICE_DESTROYED_BY_STORM"
  // Spice Blow
  | "SPICE_BLOW"
  | "SHAI_HULUD"
  | "NEXUS_STARTED"
  | "NEXUS_ENDED"
  // CHOAM
  | "CHOAM_CHARITY_CLAIMED"
  // Bidding
  | "HAND_SIZE_DECLARED"
  | "BID_PLACED"
  | "BID_PASSED"
  | "CARD_PURCHASED"
  | "CARD_DRAWN_FREE" // Harkonnen ability
  | "CARDS_RETURNED_TO_DECK" // Rule 1.04.06 - cards no one bid on
  | "BIDDING_ENDED"
  // Revival
  | "FORCES_REVIVED"
  | "LEADER_REVIVED"
  | "KWISATZ_HADERACH_REVIVED"
  // Shipment & Movement
  | "FORCES_SHIPPED"
  | "FORCES_MOVED"
  | "ADVISOR_SENT" // Bene Gesserit
  | "ADVISORS_FLIPPED"
  | "WORM_RIDE" // Fremen
  // Battle
  | "BATTLE_STARTED"
  | "PRESCIENCE_USED"
  | "BATTLE_PLAN_SUBMITTED"
  | "VOICE_USED"
  | "VOICE_COMPLIED"
  | "VOICE_VIOLATION"
  | "TRAITOR_CALLED"
  | "BATTLE_RESOLVED"
  | "LEADER_CAPTURED" // Harkonnen
  // Collection
  | "SPICE_COLLECTED"
  // Mentat Pause
  | "BRIBE_COLLECTED"
  | "VICTORY_CHECK"
  // Alliances
  | "ALLIANCE_FORMED"
  | "ALLIANCE_BROKEN"
  // Deals
  | "DEAL_PROPOSED"
  | "DEAL_ACCEPTED"
  | "DEAL_REJECTED"
  // Special
  | "KARAMA_USED"
  | "FAMILY_ATOMICS_USED"
  | "KWISATZ_HADERACH_ACTIVATED";

// =============================================================================
// CONTEXT FOR AGENTS
// =============================================================================

// What a faction's agent can "see" when making decisions
export interface FactionContext {
  // Own state (full visibility)
  ownFaction: FactionState;

  // Game state (public info)
  turn: number;
  phase: Phase;
  stormSector: number;
  spiceOnBoard: SpiceLocation[];
  shieldWallDestroyed: boolean;

  // Other factions (limited visibility)
  otherFactions: PublicFactionState[];

  // Storm order
  stormOrder: Faction[];
  firstPlayer: Faction;

  // Alliances
  alliances: Alliance[];

  // Phase-specific context
  phaseContext: PhaseContext;

  // Pending deals for this faction
  pendingDealsReceived: Deal[];
  pendingDealsSent: Deal[];
}

// What other factions can see about you
export interface PublicFactionState {
  factionId: Faction;
  spice: number; // Can be hidden with house rules, but usually visible
  handSize: number; // Number of cards, not contents
  forcesOnBoard: { territoryId: TerritoryId; sector: number; count: number }[];
  forcesInReserves: number;
  forcesInTanks: number;
  leadersAvailable: number;
  leadersInTanks: number;
  allianceStatus: AllianceStatus;
  allyId: Faction | null;
}

// Phase-specific context union
export type PhaseContext =
  | StormPhaseContext
  | SpiceBlowContext
  | ChoamCharityContext
  | BiddingContext
  | RevivalContext
  | ShipmentMovementContext
  | BattleContext
  | SpiceCollectionContext
  | MentatPauseContext;

export interface StormPhaseContext {
  phase: Phase.STORM;
  needsToDialStorm: boolean;
}

export interface SpiceBlowContext {
  phase: Phase.SPICE_BLOW;
  spiceBlowResult: {
    territoryId: TerritoryId;
    sector: number;
    amount: number;
  } | null;
  shaiHuludAppeared: boolean;
  nexusOccurring: boolean;
}

export interface ChoamCharityContext {
  phase: Phase.CHOAM_CHARITY;
  eligibleForCharity: boolean;
}

export interface BiddingContext {
  phase: Phase.BIDDING;
  cardUpForBid: { isRevealed: boolean; card?: TreacheryCard } | null; // Atreides can see
  currentBid: number;
  highBidder: Faction | null;
  canBid: boolean;
  isYourTurnToBid: boolean;
}

export interface RevivalContext {
  phase: Phase.REVIVAL;
  freeRevivalLimit: number;
  paidRevivalLimit: number;
  canReviveLeader: boolean;
  revivableLeaders: Leader[];
}

export interface ShipmentMovementContext {
  phase: Phase.SHIPMENT_MOVEMENT;
  isYourTurn: boolean;
  hasShipped: boolean;
  hasMoved: boolean;
  canShip: boolean;
  canMove: boolean;
}

export interface BattleContext {
  phase: Phase.BATTLE;
  currentBattle: Battle | null;
  isInCurrentBattle: boolean;
  isAggressor: boolean;
  subPhase: BattleSubPhase;
  mustSubmitPlan: boolean;
  canUsePrescience: boolean;
  canUseVoice: boolean;
  canCallTraitor: boolean;
}

export interface SpiceCollectionContext {
  phase: Phase.SPICE_COLLECTION;
  collectableSpice: {
    territoryId: TerritoryId;
    sector: number;
    amount: number;
    forcesPresent: number;
    maxCollectable: number;
  }[];
}

export interface MentatPauseContext {
  phase: Phase.MENTAT_PAUSE;
  strongholdsControlled: TerritoryId[];
  alliedStrongholdsControlled: TerritoryId[];
  totalStrongholdsForVictory: number;
  victoryThreshold: number;
}
