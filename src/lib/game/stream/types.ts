/**
 * Stream Types - Consolidated type definitions for the streaming system
 *
 * This file contains all type definitions, interfaces, and enums used
 * throughout the streaming architecture.
 */

import type { Faction, Phase, WinResult } from '../types';
import type { PhaseEventType } from '../phases/types';

// =============================================================================
// EVENT TYPE ENUMS
// =============================================================================

/**
 * Game lifecycle events - major game state transitions
 */
export enum GameLifecycleEvent {
  GAME_CREATED = 'GAME_CREATED',
  GAME_STARTED = 'GAME_STARTED',
  GAME_COMPLETED = 'GAME_COMPLETED',
  GAME_ERROR = 'GAME_ERROR',
  GAME_PAUSED = 'GAME_PAUSED',
  GAME_RESUMED = 'GAME_RESUMED',
}

/**
 * Turn/Phase flow events - game progression
 */
export enum TurnPhaseEvent {
  TURN_STARTED = 'TURN_STARTED',
  TURN_ENDED = 'TURN_ENDED',
  PHASE_STARTED = 'PHASE_STARTED',
  PHASE_ENDED = 'PHASE_ENDED',
}

/**
 * Agent activity events - AI agent actions
 */
export enum AgentActivityEvent {
  AGENT_THINKING = 'AGENT_THINKING',
  AGENT_TOOL_CALL = 'AGENT_TOOL_CALL',
  AGENT_TOOL_RESULT = 'AGENT_TOOL_RESULT',
  AGENT_DECISION = 'AGENT_DECISION',
}

/**
 * State delta events - granular state changes
 */
export enum StateDeltaEvent {
  FACTION_SPICE_CHANGED = 'FACTION_SPICE_CHANGED',
  FACTION_FORCES_CHANGED = 'FACTION_FORCES_CHANGED',
  FACTION_CARD_ADDED = 'FACTION_CARD_ADDED',
  FACTION_CARD_REMOVED = 'FACTION_CARD_REMOVED',
  FACTION_LEADER_STATUS = 'FACTION_LEADER_STATUS',
  STORM_POSITION_CHANGED = 'STORM_POSITION_CHANGED',
  SPICE_BOARD_CHANGED = 'SPICE_BOARD_CHANGED',
  ALLIANCE_CHANGED = 'ALLIANCE_CHANGED',
}

/**
 * Wrapper events - container events for nested data
 */
export enum WrapperEvent {
  PHASE_EVENT = 'PHASE_EVENT',
  GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
}

/**
 * Connection events - SSE connection management
 */
export enum ConnectionEvent {
  CONNECTED = 'CONNECTED',
  HEARTBEAT = 'HEARTBEAT',
}

// =============================================================================
// COMPOSITE TYPES
// =============================================================================

/**
 * All possible stream event types
 */
export type StreamEventType =
  | GameLifecycleEvent
  | TurnPhaseEvent
  | AgentActivityEvent
  | StateDeltaEvent
  | WrapperEvent
  | ConnectionEvent
  | PhaseEventType;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Base stream event structure
 */
export interface StreamEvent<T = unknown> {
  /** Unique event ID (UUID-based) */
  id: string;
  /** Event type from enums */
  type: StreamEventType;
  /** Game this event belongs to */
  gameId: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Event payload data */
  data: T;
  /** Sequential number within game for ordering */
  seq: number;
}

/**
 * Event subscriber callback type
 */
export type EventSubscriber = (event: StreamEvent) => void;

/**
 * Subscription handle for cleanup
 */
export interface Subscription {
  /** Unsubscribe from events */
  unsubscribe: () => void;
}

/**
 * Game metadata for listing/filtering
 */
export interface GameMetadata {
  gameId: string;
  factions: string[];
  status: 'created' | 'running' | 'paused' | 'completed' | 'error';
  createdAt: number;
  updatedAt: number;
  turn: number;
  phase: string;
  winner: {
    condition: string;
    winners: string[];
    turn: number;
    details: string;
  } | null;
}

/**
 * Game session state
 */
export interface GameSessionState {
  gameId: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'error';
  createdAt: number;
  lastActivity: number;
  lastStateSave: number;
}

// =============================================================================
// EVENT DATA INTERFACES
// =============================================================================

export interface GameCreatedData {
  gameId: string;
  factions: Faction[];
  maxTurns: number;
  message: string;
}

export interface GameStartedData {
  gameId: string;
  message: string;
}

export interface GameCompletedData {
  gameId: string;
  result: {
    winner: WinResult | null;
    totalTurns: number;
  };
}

export interface GameErrorData {
  gameId: string;
  error: string;
  stack?: string;
}

export interface TurnStartedData {
  turn: number;
  maxTurns: number;
  stormOrder: Faction[];
}

export interface TurnEndedData {
  turn: number;
}

export interface PhaseStartedData {
  phase: Phase;
  turn: number;
}

export interface PhaseEndedData {
  phase: Phase;
  turn: number;
}

export interface AgentThinkingData {
  faction: Faction;
  requestType: string;
  phase: Phase;
  prompt?: string;
}

export interface AgentToolCallData {
  faction: Faction;
  toolName: string;
  input: Record<string, unknown>;
}

export interface AgentToolResultData {
  faction: Faction;
  toolName: string;
  result: unknown;
}

export interface AgentDecisionData {
  faction: Faction;
  actionType: string;
  reasoning?: string;
  data: Record<string, unknown>;
}

export interface FactionSpiceChangedData {
  faction: Faction;
  oldValue: number;
  newValue: number;
  reason: string;
  details?: Record<string, unknown>;
}

export interface FactionForcesChangedData {
  faction: Faction;
  territory: string;
  sector: number;
  regularDelta: number;
  eliteDelta: number;
  reason: string;
  details?: Record<string, unknown>;
}

export interface FactionCardAddedData {
  faction: Faction;
  cardId: string;
  source: string;
  cardType?: string;
}

export interface FactionCardRemovedData {
  faction: Faction;
  cardId: string;
  destination: string;
  reason?: string;
}

export interface FactionLeaderStatusData {
  faction: Faction;
  leaderId: string;
  newStatus: string;
  details?: Record<string, unknown>;
}

export interface StormPositionChangedData {
  oldSector: number;
  newSector: number;
  movement: number;
}

export interface SpiceBoardChangedData {
  territory: string;
  sector: number;
  amount: number;
  action: 'added' | 'removed' | 'moved';
}

export interface AllianceChangedData {
  type: 'formed' | 'broken';
  factions: Faction[];
  details?: Record<string, unknown>;
}

export interface PhaseEventData {
  gameId: string;
  event: {
    type: PhaseEventType;
    data: Record<string, unknown>;
    message: string;
  };
}

export interface ConnectedData {
  message: string;
  gameId: string;
}

export interface HeartbeatData {
  timestamp: number;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if an object is a valid StreamEvent
 */
export function isStreamEvent(obj: unknown): obj is StreamEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'gameId' in obj &&
    'timestamp' in obj &&
    'seq' in obj
  );
}

/**
 * Check if event type is a game lifecycle event
 */
export function isGameLifecycleEvent(
  type: StreamEventType
): type is GameLifecycleEvent {
  return Object.values(GameLifecycleEvent).includes(type as GameLifecycleEvent);
}

/**
 * Check if event type is an agent activity event
 */
export function isAgentActivityEvent(
  type: StreamEventType
): type is AgentActivityEvent {
  return Object.values(AgentActivityEvent).includes(type as AgentActivityEvent);
}

/**
 * Check if event type is a state delta event
 */
export function isStateDeltaEvent(
  type: StreamEventType
): type is StateDeltaEvent {
  return Object.values(StateDeltaEvent).includes(type as StateDeltaEvent);
}

/**
 * Check if event type is a connection event
 */
export function isConnectionEvent(
  type: StreamEventType
): type is ConnectionEvent {
  return Object.values(ConnectionEvent).includes(type as ConnectionEvent);
}
