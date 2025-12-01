/**
 * Phase Event Toast Handlers
 * 
 * Handles toast notifications for phase and turn events
 */

import toast from 'react-hot-toast';
import type { StreamEvent } from '@/lib/game/stream/types';
import type {
  PhaseStartedData,
  PhaseEndedData,
  TurnStartedData,
  PhaseEventData,
} from '@/lib/game/stream/types';
import {
  getFactionName,
  formatPhaseName,
  generateToastId,
  TOAST_DURATIONS,
  IMPORTANT_PHASE_EVENTS,
  getFactionToastStyle,
} from './helpers';
import type { Faction } from '@/lib/game/types';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle phase started event
 */
export function handlePhaseStarted(event: StreamEvent<PhaseStartedData>): void {
  try {
    const { phase, turn } = event.data;
    toast(`Turn ${turn}: ${formatPhaseName(phase)} Phase Started`, {
      id: generateToastId('phase-started', `${phase}-${turn}`, event.id),
      icon: '🎯',
      duration: TOAST_DURATIONS.LONG,
    });
  } catch (error) {
    console.error('[Toast] Error handling phase started:', error);
  }
}

/**
 * Handle phase ended event
 */
export function handlePhaseEnded(event: StreamEvent<PhaseEndedData>): void {
  try {
    const { phase, turn } = event.data;
    toast(`${formatPhaseName(phase)} Phase Ended`, {
      id: generateToastId('phase-ended', `${phase}-${turn}`, event.id),
      icon: '✅',
      duration: TOAST_DURATIONS.MEDIUM,
    });
  } catch (error) {
    console.error('[Toast] Error handling phase ended:', error);
  }
}

/**
 * Handle turn started event
 */
export function handleTurnStarted(event: StreamEvent<TurnStartedData>): void {
  try {
    const { turn, maxTurns, stormOrder } = event.data;
    const orderText = stormOrder.map(getFactionName).join(' → ');
    toast.success(`Turn ${turn}/${maxTurns} Started\nOrder: ${orderText}`, {
      id: generateToastId('turn-started', `${turn}`, event.id),
      duration: TOAST_DURATIONS.EXTRA_LONG,
    });
  } catch (error) {
    console.error('[Toast] Error handling turn started:', error);
  }
}

/**
 * Handle phase event (wrapped phase-specific events)
 * Only shows toasts for important events to avoid noise
 */
export function handlePhaseEvent(event: StreamEvent<PhaseEventData>): void {
  try {
    const { event: phaseEvent } = event.data;
    const { type, message, data } = phaseEvent;
    
    if (IMPORTANT_PHASE_EVENTS.includes(type as typeof IMPORTANT_PHASE_EVENTS[number])) {
      // Try to extract faction from event data if available
      const faction = (data as { faction?: Faction })?.faction;
      
      const toastOptions: Parameters<typeof toast>[1] = {
        id: generateToastId('phase-event', type, event.id),
        icon: '📢',
        duration: TOAST_DURATIONS.LONG,
      };
      
      // Add faction color if faction is present
      if (faction) {
        Object.assign(toastOptions, getFactionToastStyle(faction));
      }
      
      toast(message || type, toastOptions);
    }
  } catch (error) {
    console.error('[Toast] Error handling phase event:', error);
  }
}

