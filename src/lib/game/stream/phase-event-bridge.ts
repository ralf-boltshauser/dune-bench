/**
 * Phase Event Bridge - Connects phase events to stream events
 *
 * This module bridges PhaseEvent types to StreamEvent types,
 * providing helper functions for emitting turn/phase lifecycle events.
 */

import { eventStreamer } from './event-streamer';
import { TurnPhaseEvent, WrapperEvent, type StreamEventType } from './types';
import type { PhaseEvent, PhaseEventType } from '../phases/types';
import type { Faction, Phase } from '../types';

// =============================================================================
// PHASE EVENT EMISSION
// =============================================================================

/**
 * Emit a phase event wrapped in a PHASE_EVENT container
 *
 * Phase events from handlers are wrapped for consistent streaming.
 */
export function emitPhaseEvent(gameId: string, phaseEvent: PhaseEvent): void {
  eventStreamer
    .emit(WrapperEvent.PHASE_EVENT, gameId, {
      gameId,
      event: phaseEvent,
    })
    .catch((error) => {
      console.error('[PhaseEventBridge] Failed to emit phase event:', error);
    });
}

/**
 * Emit a raw phase event type directly (without wrapping)
 *
 * Use this when you want to emit the phase event type as a top-level
 * stream event rather than wrapped in PHASE_EVENT.
 */
export function emitRawPhaseEvent(
  gameId: string,
  type: PhaseEventType,
  data: Record<string, unknown>
): void {
  // PhaseEventType is part of StreamEventType union, so this is type-safe
  const eventType = type as StreamEventType;

  eventStreamer.emit(eventType, gameId, data).catch((error) => {
    console.error(`[PhaseEventBridge] Failed to emit ${type}:`, error);
  });
}

// =============================================================================
// TURN LIFECYCLE EVENTS
// =============================================================================

/**
 * Emit turn started event
 */
export function emitTurnStarted(
  gameId: string,
  turn: number,
  maxTurns: number,
  stormOrder: Faction[]
): void {
  eventStreamer
    .emit(TurnPhaseEvent.TURN_STARTED, gameId, {
      turn,
      maxTurns,
      stormOrder,
    })
    .catch((error) => {
      console.error('[PhaseEventBridge] Failed to emit TURN_STARTED:', error);
    });
}

/**
 * Emit turn ended event
 */
export function emitTurnEnded(gameId: string, turn: number): void {
  eventStreamer
    .emit(TurnPhaseEvent.TURN_ENDED, gameId, {
      turn,
    })
    .catch((error) => {
      console.error('[PhaseEventBridge] Failed to emit TURN_ENDED:', error);
    });
}

// =============================================================================
// PHASE LIFECYCLE EVENTS
// =============================================================================

/**
 * Emit phase started event
 */
export function emitPhaseStarted(
  gameId: string,
  phase: Phase,
  turn: number
): void {
  eventStreamer
    .emit(TurnPhaseEvent.PHASE_STARTED, gameId, {
      phase,
      turn,
    })
    .catch((error) => {
      console.error('[PhaseEventBridge] Failed to emit PHASE_STARTED:', error);
    });
}

/**
 * Emit phase ended event
 */
export function emitPhaseEnded(
  gameId: string,
  phase: Phase,
  turn: number
): void {
  eventStreamer
    .emit(TurnPhaseEvent.PHASE_ENDED, gameId, {
      phase,
      turn,
    })
    .catch((error) => {
      console.error('[PhaseEventBridge] Failed to emit PHASE_ENDED:', error);
    });
}
