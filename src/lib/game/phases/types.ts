/**
 * Phase system types.
 * Defines the interface for phase handlers and agent interactions.
 */

import {
  Faction,
  Phase,
  BattleSubPhase,
  TerritoryId,
  type GameState,
  type GameAction,
  type BattlePlan,
} from '../types';

// =============================================================================
// AGENT REQUEST/RESPONSE
// =============================================================================

/**
 * A request for an agent to make a decision.
 * The phase handler creates these, the orchestrator sends them to agents.
 */
export interface AgentRequest {
  /** Which faction's agent should respond */
  factionId: Faction;

  /** Type of decision needed */
  requestType: AgentRequestType;

  /** Human-readable prompt for the agent */
  prompt: string;

  /** Phase-specific context for the decision */
  context: Record<string, unknown>;

  /** Available actions (for tool filtering) */
  availableActions: string[];

  /** Timeout in milliseconds (default 30000) */
  timeout?: number;

  /** Whether this is time-sensitive (e.g., bidding timer) */
  urgent?: boolean;
}

export type AgentRequestType =
  // Setup
  | 'SELECT_TRAITOR'
  | 'BG_PREDICTION'
  | 'DISTRIBUTE_FORCES' // Fremen starting force distribution

  // Storm
  | 'DIAL_STORM'
  | 'PLAY_WEATHER_CONTROL'
  | 'PLAY_FAMILY_ATOMICS'

  // Spice Blow / Nexus
  | 'PLACE_SANDWORM' // Fremen ability
  | 'WORM_RIDE' // Fremen ability
  | 'PROTECT_ALLY_FROM_WORM' // Fremen alliance ability
  | 'ALLIANCE_DECISION'

  // Bidding
  | 'BID_OR_PASS'
  | 'PEEK_CARD' // Atreides ability

  // Revival
  | 'REVIVE_FORCES'
  | 'REVIVE_LEADER'
  | 'GRANT_FREMEN_REVIVAL_BOOST'

  // Shipment & Movement
  | 'SHIP_FORCES'
  | 'MOVE_FORCES'
  | 'GUILD_TIMING_DECISION' // Spacing Guild: act now or wait
  | 'SEND_ADVISOR' // BG ability
  | 'FLIP_ADVISORS' // BG ability
  | 'TAKE_UP_ARMS' // BG ability
  | 'BG_INTRUSION' // BG ability: intrusion response

  // Battle
  | 'CHOOSE_BATTLE'
  | 'USE_PRESCIENCE' // Atreides ability
  | 'REVEAL_PRESCIENCE_ELEMENT' // Opponent reveals chosen element to Atreides
  | 'CREATE_BATTLE_PLAN'
  | 'USE_VOICE' // BG ability
  | 'COMPLY_WITH_VOICE'
  | 'CALL_TRAITOR'
  | 'CAPTURE_LEADER' // Harkonnen ability (legacy)
  | 'CAPTURE_LEADER_CHOICE' // Harkonnen ability: choose kill or capture
  | 'CHOOSE_CARDS_TO_DISCARD' // Winner chooses which cards to discard after winning

  // Collection
  | 'COLLECT_SPICE'

  // CHOAM Charity
  | 'CLAIM_CHARITY'

  // Any time
  | 'USE_KARAMA'
  | 'RESPOND_TO_DEAL';

/**
 * Response from an agent to a request.
 */
export interface AgentResponse {
  /** The faction that responded */
  factionId: Faction;

  /** The action taken */
  actionType: string;

  /** Action-specific data */
  data: Record<string, unknown>;

  /** Whether the agent passed/declined */
  passed?: boolean;

  /** Optional reasoning (for logging) */
  reasoning?: string;
}

// =============================================================================
// PHASE RESULT
// =============================================================================

/**
 * Result of processing a phase step.
 * Phases are processed in steps - each step may require agent input.
 */
export interface PhaseStepResult {
  /** Updated game state after this step */
  state: GameState;

  /** Whether the phase is complete */
  phaseComplete: boolean;

  /** Next phase (if phaseComplete is true) */
  nextPhase?: Phase;

  /** Agent requests needed before next step */
  pendingRequests: AgentRequest[];

  /** Whether requests should be processed simultaneously */
  simultaneousRequests?: boolean;

  /** Actions that occurred in this step (for logging) */
  actions: GameAction[];

  /** Events to emit (for UI/logging) */
  events: PhaseEvent[];
}

// =============================================================================
// PHASE EVENTS
// =============================================================================

/**
 * Events emitted during phase processing.
 * Used for logging and UI updates.
 */
export interface PhaseEvent {
  type: PhaseEventType;
  data: Record<string, unknown>;
  message: string;
}

export type PhaseEventType =
  // Phase flow
  | 'PHASE_STARTED'
  | 'PHASE_ENDED'
  | 'PHASE_SKIPPED'
  | 'SUBPHASE_STARTED'
  | 'TURN_STARTED'
  | 'TURN_ENDED'
  | 'GAME_ENDED'

  // Setup
  | 'SETUP_STEP'
  | 'TRAITOR_SELECTED'
  | 'TRAITOR_OPTIONS_AVAILABLE'
  | 'BG_PREDICTION_MADE'
  | 'BG_PREDICTION_REVEALED'
  | 'FORCES_PLACED'

  // Storm
  | 'STORM_DIAL_REVEALED'
  | 'STORM_CARD_REVEALED'
  | 'STORM_CARD_DRAWN'
  | 'STORM_MOVED'
  | 'FORCES_KILLED_BY_STORM'
  | 'SPICE_DESTROYED_BY_STORM'
  | 'WEATHER_CONTROL_PLAYED'
  | 'FAMILY_ATOMICS_PLAYED'
  | 'FORCES_KILLED_BY_FAMILY_ATOMICS'

  // Spice Blow
  | 'SPICE_CARD_REVEALED'
  | 'SPICE_PLACED'
  | 'SHAI_HULUD_APPEARED'
  | 'SPICE_DESTROYED_BY_WORM'
  | 'FORCES_DEVOURED'
  | 'FREMEN_WORM_IMMUNITY'
  | 'FREMEN_PROTECTED_ALLY'
  | 'LEADER_PROTECTED_FROM_WORM'
  | 'NEXUS_STARTED'
  | 'NEXUS_ENDED'

  // Alliances
  | 'ALLIANCE_FORMED'
  | 'ALLIANCE_BROKEN'

  // CHOAM Charity
  | 'CHARITY_CLAIMED'
  | 'CHOAM_ELIGIBLE'

  // Bidding
  | 'HAND_SIZE_DECLARED'
  | 'AUCTION_STARTED'
  | 'BID_PLACED'
  | 'BID_PASSED'
  | 'CARD_PEEKED' // Atreides sees card before bidding (rule 2.01.05)
  | 'CARD_WON'
  | 'CARD_BOUGHT_IN'
  | 'CARD_RETURNED_TO_DECK'
  | 'CARD_DRAWN_FREE'
  | 'KARAMA_BUY_WITHOUT_PAYING'
  | 'KARAMA_FREE_CARD'
  | 'BIDDING_COMPLETE'
  | 'SPICE_REFUNDED' // Spice refunded due to error (e.g., hand size exceeded)

  // Revival
  | 'FORCES_REVIVED'
  | 'LEADER_REVIVED'

  // Shipment/Movement
  | 'FORCES_SHIPPED'
  | 'FORCES_MOVED'
  | 'ADVISOR_SENT'
  | 'ADVISORS_FLIPPED'
  | 'FORCES_CONVERTED' // Forces converted (e.g., BG fighters to advisors)

  // Battle
  | 'BATTLE_STARTED'
  | 'NO_BATTLES'
  | 'BATTLES_COMPLETE'
  | 'BATTLE_PLAN_SUBMITTED'
  | 'NO_LEADER_ANNOUNCED'
  | 'PRESCIENCE_USED'
  | 'VOICE_USED'
  | 'VOICE_COMPLIED'
  | 'VOICE_VIOLATION'
  | 'TRAITOR_REVEALED'
  | 'TRAITOR_BLOCKED'
  | 'TWO_TRAITORS'
  | 'BATTLE_RESOLVED'
  | 'LEADER_KILLED'
  | 'LEADER_CAPTURED'
  | 'LEADER_CAPTURED_AND_KILLED'
  | 'LEADER_RETURNED'
  | 'HARKONNEN_CAPTURE_OPPORTUNITY'
  | 'CARD_DISCARDED'
  | 'PRISON_BREAK'
  | 'LASGUN_SHIELD_EXPLOSION'
  | 'KWISATZ_HADERACH_ACTIVATED'
  | 'KWISATZ_HADERACH_USED'
  | 'KWISATZ_HADERACH_KILLED'
  | 'KWISATZ_HADERACH_REVIVED'
  | 'SPICE_AWARDED'
  | 'STRONGHOLD_OCCUPANCY_VIOLATION' // Multiple factions in stronghold violation

  // Collection
  | 'SPICE_COLLECTED'
  | 'BRIBE_COLLECTED'

  // Victory
  | 'VICTORY_ACHIEVED'
  | 'GAME_ENDED'

  // Errors (for defensive checks and validation failures)
  | 'ERROR';

// =============================================================================
// PHASE HANDLER INTERFACE
// =============================================================================

/**
 * Interface for phase handlers.
 * Each phase implements this to handle its specific logic.
 */
export interface PhaseHandler {
  /** The phase this handler manages */
  readonly phase: Phase;

  /**
   * Initialize the phase (called when entering the phase).
   * Sets up any phase-specific state.
   */
  initialize(state: GameState): PhaseStepResult;

  /**
   * Process the next step of the phase.
   * Called after agent responses are received.
   */
  processStep(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult;

  /**
   * Clean up when leaving the phase.
   */
  cleanup(state: GameState): GameState;
}

// =============================================================================
// PHASE CONTEXT TYPES
// =============================================================================

/** Storm phase tracking */
export interface StormPhaseContext {
  dialingFactions: [Faction, Faction] | null;
  dials: Map<Faction, number>;
  stormMovement: number | null; // Calculated movement (locked in after dials)
  weatherControlUsed: boolean;
  weatherControlBy: Faction | null;
  familyAtomicsUsed: boolean;
  familyAtomicsBy: Faction | null;
  waitingForFamilyAtomics: boolean; // After dials, before movement
  waitingForWeatherControl: boolean; // After Family Atomics (or dials if no Family Atomics), before movement
}

/** Bidding phase tracking */
export interface BiddingPhaseContext {
  cardsForAuction: string[]; // Card definition IDs
  currentCardIndex: number;
  currentBid: number;
  highBidder: Faction | null;
  passedFactions: Set<Faction>;
  startingBidder: Faction;
  /** Set of card indices that Atreides has already peeked at (prevents duplicate peek requests) */
  atreidesPeekedCards: Set<number>;
  cardsToReturnToDeck?: string[]; // Cards that no one bid on (rule 1.04.06)
}

/** Battle phase tracking */
export interface BattlePhaseContext {
  pendingBattles: PendingBattle[];
  currentBattleIndex: number;
  currentBattle: CurrentBattle | null;
  subPhase: BattleSubPhase;
  aggressorOrder: Faction[]; // Storm order for aggressor selection
  currentAggressorIndex: number;
}

export interface PendingBattle {
  territoryId: TerritoryId;
  sector: number;
  factions: Faction[];
}

export interface CurrentBattle {
  territoryId: TerritoryId;
  sector: number;
  aggressor: Faction;
  defender: Faction;
  aggressorPlan: BattlePlan | null;
  defenderPlan: BattlePlan | null;
  prescienceUsed: boolean;
  prescienceTarget: 'leader' | 'weapon' | 'defense' | 'number' | null;
  prescienceOpponent: Faction | null; // Which faction's plan was viewed with prescience
  prescienceResult: { type: string; value: string | number | null } | null; // null value means "not playing"
  prescienceBlocked: boolean; // If weapon/defense asked and opponent said "not playing", cannot ask different element
  voiceUsed: boolean;
  voiceCommand: { type: 'play' | 'not_play'; cardType: string; specificCardName?: string } | null;
  traitorCalled: boolean;
  traitorCalledBy: Faction | null;
  traitorCallsByBothSides: boolean; // Track if BOTH sides called traitor (TWO TRAITORS rule)
  battleResult?: import('../rules/types').BattleResult; // Stored temporarily for winner card discard choice
}

/** Nexus tracking */
export interface NexusContext {
  isActive: boolean;
  allianceChanges: {
    type: 'form' | 'break';
    factions: Faction[];
  }[];
  factionsActed: Set<Faction>;
}
