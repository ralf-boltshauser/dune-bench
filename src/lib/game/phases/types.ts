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

  // Spice Blow / Nexus
  | 'PLACE_SANDWORM' // Fremen ability
  | 'WORM_RIDE' // Fremen ability
  | 'ALLIANCE_DECISION'

  // Bidding
  | 'BID_OR_PASS'
  | 'PEEK_CARD' // Atreides ability

  // Revival
  | 'REVIVE_FORCES'
  | 'REVIVE_LEADER'

  // Shipment & Movement
  | 'SHIP_FORCES'
  | 'MOVE_FORCES'
  | 'GUILD_TIMING_DECISION' // Spacing Guild: act now or wait
  | 'SEND_ADVISOR' // BG ability
  | 'FLIP_ADVISORS' // BG ability

  // Battle
  | 'CHOOSE_BATTLE'
  | 'USE_PRESCIENCE' // Atreides ability
  | 'REVEAL_PRESCIENCE_ELEMENT' // Opponent reveals chosen element to Atreides
  | 'CREATE_BATTLE_PLAN'
  | 'USE_VOICE' // BG ability
  | 'COMPLY_WITH_VOICE'
  | 'CALL_TRAITOR'
  | 'CAPTURE_LEADER' // Harkonnen ability

  // Collection
  | 'COLLECT_SPICE'

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
  | 'BG_PREDICTION_MADE'
  | 'BG_PREDICTION_REVEALED'
  | 'FORCES_PLACED'

  // Storm
  | 'STORM_DIAL_REVEALED'
  | 'STORM_MOVED'
  | 'FORCES_KILLED_BY_STORM'
  | 'SPICE_DESTROYED_BY_STORM'

  // Spice Blow
  | 'SPICE_CARD_REVEALED'
  | 'SPICE_PLACED'
  | 'SHAI_HULUD_APPEARED'
  | 'SPICE_DESTROYED_BY_WORM'
  | 'FORCES_DEVOURED'
  | 'FREMEN_WORM_IMMUNITY'
  | 'NEXUS_STARTED'
  | 'NEXUS_ENDED'

  // Alliances
  | 'ALLIANCE_FORMED'
  | 'ALLIANCE_BROKEN'

  // CHOAM
  | 'CHARITY_CLAIMED'
  | 'CHOAM_ELIGIBLE'

  // Bidding
  | 'HAND_SIZE_DECLARED'
  | 'AUCTION_STARTED'
  | 'BID_PLACED'
  | 'BID_PASSED'
  | 'CARD_WON'
  | 'CARD_BOUGHT_IN'
  | 'CARD_RETURNED_TO_DECK'
  | 'CARD_DRAWN_FREE'
  | 'BIDDING_COMPLETE'

  // Revival
  | 'FORCES_REVIVED'
  | 'LEADER_REVIVED'

  // Shipment/Movement
  | 'FORCES_SHIPPED'
  | 'FORCES_MOVED'
  | 'ADVISOR_SENT'
  | 'ADVISORS_FLIPPED'

  // Battle
  | 'BATTLE_STARTED'
  | 'NO_BATTLES'
  | 'BATTLES_COMPLETE'
  | 'BATTLE_PLAN_SUBMITTED'
  | 'PRESCIENCE_USED'
  | 'VOICE_USED'
  | 'TRAITOR_REVEALED'
  | 'TRAITOR_BLOCKED'
  | 'BATTLE_RESOLVED'
  | 'LEADER_KILLED'
  | 'LEADER_CAPTURED'
  | 'LEADER_RETURNED'
  | 'LASGUN_SHIELD_EXPLOSION'
  | 'KWISATZ_HADERACH_ACTIVATED'

  // Collection
  | 'SPICE_COLLECTED'
  | 'BRIBE_COLLECTED'

  // Victory
  | 'VICTORY_ACHIEVED'
  | 'GAME_ENDED';

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
  stormMovement: number | null;
  weatherControlUsed: boolean;
  weatherControlBy: Faction | null;
}

/** Bidding phase tracking */
export interface BiddingPhaseContext {
  cardsForAuction: string[]; // Card definition IDs
  currentCardIndex: number;
  currentBid: number;
  highBidder: Faction | null;
  passedFactions: Set<Faction>;
  startingBidder: Faction;
  atreidesHasPeeked: boolean;
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
  prescienceResult: { type: string; value: string | number } | null;
  voiceUsed: boolean;
  voiceCommand: unknown;
  traitorCalled: boolean;
  traitorCalledBy: Faction | null;
  traitorCallsByBothSides: boolean; // Track if BOTH sides called traitor (TWO TRAITORS rule)
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
