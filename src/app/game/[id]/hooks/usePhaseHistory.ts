'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Phase } from '@/lib/game/types/enums';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent } from '@/lib/game/stream/types';

// =============================================================================
// TYPES
// =============================================================================

export interface PhaseHistoryEntry {
  id: string;
  phase: Phase;
  turn: number;
  timestamp: number;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Track phase history - keeps a record of all phases that have occurred
 * Reconstructs history from events on load, then tracks new phase changes
 */
export function usePhaseHistory(
  currentPhase: Phase | null,
  currentTurn: number,
  events: StreamEvent[] = []
): PhaseHistoryEntry[] {
  const [phaseHistory, setPhaseHistory] = useState<PhaseHistoryEntry[]>([]);
  const previousPhaseRef = useRef<Phase | null>(null);
  const previousTurnRef = useRef<number>(currentTurn);
  const phaseStartTimestampRef = useRef<number>(0);
  const reconstructedRef = useRef<boolean>(false);

  // Reconstruct phase history from events on initial load
  const reconstructedHistory = useMemo(() => {
    // Don't access ref during render - check will be done in useEffect
    const history: PhaseHistoryEntry[] = [];
    let currentTurnFromEvents = 1;
    let lastPhase: Phase | null = null;
    let lastPhaseStartTimestamp = 0;

    // Process events in order to reconstruct phase history
    for (const event of events) {
      if (event.type === WrapperEvent.PHASE_EVENT) {
        const phaseEventData = event.data as {
          event: {
            type: string;
            data: Record<string, unknown>;
            message: string;
          };
        };
        const phaseEvent = phaseEventData.event;

        if (phaseEvent.type === 'TURN_STARTED') {
          const turnData = phaseEvent.data as { turn: number; maxTurns?: number; stormOrder?: unknown[] };
          currentTurnFromEvents = turnData.turn || currentTurnFromEvents;
        } else if (phaseEvent.type === 'PHASE_STARTED') {
          const phaseData = phaseEvent.data as { phase: Phase; turn?: number };
          const phase = phaseData.phase as Phase;
          const turn = phaseData.turn || currentTurnFromEvents;

          // If we had a previous phase, add it to history
          if (lastPhase !== null && lastPhase !== phase) {
            history.unshift({
              id: `phase-${lastPhase}-${currentTurnFromEvents}-${lastPhaseStartTimestamp}`,
              phase: lastPhase,
              turn: currentTurnFromEvents,
              timestamp: lastPhaseStartTimestamp,
            });
          }

          lastPhase = phase;
          lastPhaseStartTimestamp = event.timestamp;
        } else if (phaseEvent.type === 'PHASE_ENDED') {
          const phaseData = phaseEvent.data as { phase: Phase };
          const phase = phaseData.phase as Phase;

          // When a phase ends, it's complete - we'll add it when the next phase starts
          // But if this is the last event, we should add it
          if (lastPhase === phase) {
            // Phase ended, will be added when next phase starts
          }
        }
      }
    }

    // If we have a last phase that hasn't been added (because no new phase started yet)
    // and it's not the current phase, add it
    if (lastPhase !== null && lastPhase !== currentPhase) {
      history.unshift({
        id: `phase-${lastPhase}-${currentTurnFromEvents}-${lastPhaseStartTimestamp}`,
        phase: lastPhase,
        turn: currentTurnFromEvents,
        timestamp: lastPhaseStartTimestamp,
      });
    }

    return history;
  }, [events, currentPhase, currentTurn]);

  // Initialize from reconstructed history (only once)
  useEffect(() => {
    if (reconstructedRef.current) return; // Only reconstruct once
    if (reconstructedHistory && reconstructedHistory.length > 0) {
      reconstructedRef.current = true;
      // Use requestAnimationFrame to defer state update and avoid cascading renders
      requestAnimationFrame(() => {
        setPhaseHistory(reconstructedHistory);
      });
    }
  }, [reconstructedHistory]);

  // Track new phase changes
  useEffect(() => {
    // Initialize timestamp for first phase (set in effect to avoid calling Date.now() during render)
    if (previousPhaseRef.current === null && currentPhase !== null && phaseStartTimestampRef.current === 0) {
      phaseStartTimestampRef.current = Date.now();
    }

    // Check if phase has changed
    if (currentPhase !== previousPhaseRef.current) {
      // If we had a previous phase, save it to history
      if (previousPhaseRef.current !== null) {
        const entryId = `phase-${previousPhaseRef.current}-${previousTurnRef.current}-${phaseStartTimestampRef.current}`;
        
        setPhaseHistory((prev) => {
          // Check if this exact entry already exists (avoid duplicates)
          const exists = prev.some((entry) => entry.id === entryId);
          
          if (!exists) {
            // Add new entry at the beginning (most recent first)
            return [
              {
                id: entryId,
                phase: previousPhaseRef.current!,
                turn: previousTurnRef.current,
                timestamp: phaseStartTimestampRef.current,
              },
              ...prev,
            ];
          }
          return prev;
        });
      }

      // Update to new phase
      previousPhaseRef.current = currentPhase;
      previousTurnRef.current = currentTurn;
      phaseStartTimestampRef.current = Date.now();
    } else if (currentTurn !== previousTurnRef.current && currentPhase !== null) {
      // Same phase but different turn - update the turn reference
      previousTurnRef.current = currentTurn;
    }
  }, [currentPhase, currentTurn]);

  // Filter out the current phase from history to avoid duplicates
  const filteredHistory = useMemo(() => {
    return phaseHistory.filter(entry => 
      entry.phase !== currentPhase || entry.turn !== currentTurn
    );
  }, [phaseHistory, currentPhase, currentTurn]);

  return filteredHistory;
}

