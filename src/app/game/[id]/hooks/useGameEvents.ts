/**
 * Custom hook for processing game events and extracting phase/visualization state
 * Separates event processing logic from component rendering
 */

import { useEffect, useRef, useState } from 'react';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent } from '@/lib/game/stream/types';
import { Phase } from '@/lib/game/types/enums';
import { TerritoryId } from '@/lib/game/types';
import { handleEventToast } from '../utils/toastHandlers';

// =============================================================================
// TYPES
// =============================================================================

export interface GameEventsState {
  currentPhase: Phase | null;
  currentTurn: number;
  stormSectors: Set<number>;
  spiceBlowTerritories: Set<TerritoryId>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Process game events and extract visualization state
 * Handles toast notifications and phase/storm/spice blow tracking
 */
export function useGameEvents(events: StreamEvent[]) {
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const spiceBlowTimeoutsRef = useRef<Map<TerritoryId, NodeJS.Timeout>>(new Map());

  const [state, setState] = useState<GameEventsState>({
    currentPhase: null,
    currentTurn: 1,
    stormSectors: new Set(),
    spiceBlowTerritories: new Set(),
  });

  // Process toast notifications for new events
  useEffect(() => {
    if (events.length === 0) return;

    events.forEach((event) => {
      if (!processedEventIdsRef.current.has(event.id)) {
        processedEventIdsRef.current.add(event.id);
        handleEventToast(event);
      }
    });
  }, [events]);

  // Process events to extract phase, storm, and spice blow info
  useEffect(() => {
    // Use functional setState to read current state and batch updates
    setState((prev) => {
      // Process events in a batch to avoid cascading renders
      let newPhase: Phase | null = prev.currentPhase;
      let newTurn = prev.currentTurn;
      const newStormSectors = new Set(prev.stormSectors);
      const newSpiceBlowTerritories = new Set(prev.spiceBlowTerritories);

      for (const event of events) {
      // Handle PHASE_STARTED events
      if (event.type === 'PHASE_STARTED') {
        const data = event.data as { phase: Phase; turn?: number };
        newPhase = data.phase;
        if (data.turn) {
          newTurn = data.turn;
        }
      }

      // Handle TURN_STARTED events
      if (event.type === 'TURN_STARTED') {
        const data = event.data as { turn: number };
        newTurn = data.turn;
      }

      // Handle PHASE_EVENT wrapper events
      if (event.type === WrapperEvent.PHASE_EVENT) {
        const phaseEventData = event.data as {
          event: {
            type: string;
            data: Record<string, unknown>;
            message: string;
          };
        };

        const phaseEvent = phaseEventData.event;

        // Handle STORM_MOVED events
        if (phaseEvent.type === 'STORM_MOVED') {
          const stormData = phaseEvent.data as {
            from?: number;
            to: number;
            sectorsAffected?: number[];
          };

          newStormSectors.clear();
          newStormSectors.add(stormData.to);
          if (stormData.sectorsAffected) {
            stormData.sectorsAffected.forEach((sector) => newStormSectors.add(sector));
          }
        }

        // Handle SPICE_PLACED events
        if (phaseEvent.type === 'SPICE_PLACED') {
          const spiceData = phaseEvent.data as {
            territoryId: TerritoryId;
            sector?: number;
            amount?: number;
          };

          if (spiceData.territoryId) {
            newSpiceBlowTerritories.add(spiceData.territoryId);

            // Clear existing timeout for this territory
            const existingTimeout = spiceBlowTimeoutsRef.current.get(spiceData.territoryId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            // Remove from blinking after 3 seconds
            const timeout = setTimeout(() => {
              setState((prev) => {
                const newSet = new Set(prev.spiceBlowTerritories);
                newSet.delete(spiceData.territoryId);
                return { ...prev, spiceBlowTerritories: newSet };
              });
              spiceBlowTimeoutsRef.current.delete(spiceData.territoryId);
            }, 3000);

            spiceBlowTimeoutsRef.current.set(spiceData.territoryId, timeout);
          }
        }
      }

      // Handle STORM_POSITION_CHANGED state delta events
      if (event.type === 'STORM_POSITION_CHANGED') {
        const stormData = event.data as { newSector: number };
        newStormSectors.clear();
        newStormSectors.add(stormData.newSector);
      }
    }

    // Only update if there are actual changes to avoid unnecessary renders
      if (
        prev.currentPhase === newPhase &&
        prev.currentTurn === newTurn &&
        prev.stormSectors.size === newStormSectors.size &&
        Array.from(prev.stormSectors).every((s) => newStormSectors.has(s)) &&
        prev.spiceBlowTerritories.size === newSpiceBlowTerritories.size &&
        Array.from(prev.spiceBlowTerritories).every((t) => newSpiceBlowTerritories.has(t))
      ) {
        return prev;
      }
      return {
        currentPhase: newPhase,
        currentTurn: newTurn,
        stormSectors: newStormSectors,
        spiceBlowTerritories: newSpiceBlowTerritories,
      };
    });
  }, [events]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      spiceBlowTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      spiceBlowTimeoutsRef.current.clear();
    };
  }, []);

  return state;
}

