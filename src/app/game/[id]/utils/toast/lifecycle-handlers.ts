/**
 * Game Lifecycle Toast Handlers
 * 
 * Handles toast notifications for game lifecycle events
 */

import toast from 'react-hot-toast';
import type { StreamEvent } from '@/lib/game/stream/types';
import { getFactionName, TOAST_DURATIONS } from './helpers';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle game started event
 */
export function handleGameStarted(_event: StreamEvent): void {
  try {
    toast.success('Game Started!', {
      id: 'game-started',
      duration: TOAST_DURATIONS.EXTRA_LONG,
    });
  } catch (error) {
    console.error('[Toast] Error handling game started:', error);
  }
}

/**
 * Handle game completed event
 */
export function handleGameCompleted(event: StreamEvent): void {
  try {
    const data = event.data as {
      result?: { winner?: { winners?: string[] } };
    };
    const winners = data?.result?.winner?.winners || [];
    const winnerText =
      winners.length > 0
        ? `Winner: ${winners.map(getFactionName).join(', ')}`
        : 'Game Completed';
    
    toast.success(winnerText, {
      id: 'game-completed',
      duration: TOAST_DURATIONS.VERY_LONG,
    });
  } catch (error) {
    console.error('[Toast] Error handling game completed:', error);
  }
}

