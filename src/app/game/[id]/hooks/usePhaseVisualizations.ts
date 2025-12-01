'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent, TurnPhaseEvent, StateDeltaEvent } from '@/lib/game/stream/types';
import { TERRITORY_DEFINITIONS, TerritoryId } from '@/lib/game/types';
import { Phase, TerritoryType } from '@/lib/game/types/enums';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPICE_BLOW_BLINK_DURATION_MS = 3000;

// =============================================================================
// TYPES
// =============================================================================

export interface RecentShipment {
  faction: string;
  territoryId: TerritoryId;
  sector: number;
  count: number;
  timestamp: number;
}

export interface PhaseVisualizationState {
  currentPhase: Phase | null;
  currentTurn: number;
  stormSectors: Set<number>;
  spiceBlowTerritories: Set<TerritoryId>;
  stormAffectedTerritories: Set<TerritoryId>;
  recentShipments: RecentShipment[];
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

function isPhaseStartedEvent(event: StreamEvent): event is StreamEvent<{ phase: Phase; turn?: number }> {
  return event.type === TurnPhaseEvent.PHASE_STARTED;
}

function isTurnStartedEvent(event: StreamEvent): event is StreamEvent<{ turn: number }> {
  return event.type === TurnPhaseEvent.TURN_STARTED;
}

function isPhaseEvent(event: StreamEvent): event is StreamEvent<{
  event: {
    type: string;
    data: Record<string, unknown>;
    message: string;
  };
}> {
  return event.type === WrapperEvent.PHASE_EVENT;
}

function isStormMovedEvent(phaseEvent: { type: string; data: Record<string, unknown> }): boolean {
  return phaseEvent.type === 'STORM_MOVED';
}

function isSpicePlacedEvent(phaseEvent: { type: string; data: Record<string, unknown> }): boolean {
  return phaseEvent.type === 'SPICE_PLACED';
}

function isForcesShippedEvent(phaseEvent: { type: string; data: Record<string, unknown> }): boolean {
  return phaseEvent.type === 'FORCES_SHIPPED';
}

function isStormPositionChangedEvent(event: StreamEvent): event is StreamEvent<{ newSector: number }> {
  return event.type === StateDeltaEvent.STORM_POSITION_CHANGED;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate which territories are affected by storm sectors
 */
function calculateStormAffectedTerritories(stormSectors: Set<number>): Set<TerritoryId> {
  const affected = new Set<TerritoryId>();
  
  for (const [territoryId, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
    // Check if any of this territory's sectors are in the storm
    if (territory.sectors.some((sector) => stormSectors.has(sector))) {
      // Only highlight sand territories (rock/stronghold are protected)
      if (territory.type === TerritoryType.SAND) {
        affected.add(territoryId as TerritoryId);
      }
    }
  }
  
  return affected;
}

/**
 * Extract storm sectors from STORM_MOVED event data
 */
function extractStormSectors(data: Record<string, unknown>): Set<number> {
  const stormData = data as {
    from?: number;
    to: number;
    sectorsAffected?: number[];
  };
  
  const sectors = new Set<number>();
  sectors.add(stormData.to);
  
  if (stormData.sectorsAffected) {
    stormData.sectorsAffected.forEach((sector) => sectors.add(sector));
  }
  
  return sectors;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for managing phase visualizations from game events
 * Handles storm highlighting, spice blow blinking, and phase tracking
 */
const SHIPMENT_HIGHLIGHT_DURATION_MS = 2000; // Highlight shipments for 2 seconds

export function usePhaseVisualizations(events: StreamEvent[]): PhaseVisualizationState {
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [stormSectors, setStormSectors] = useState<Set<number>>(new Set());
  const [spiceBlowTerritories, setSpiceBlowTerritories] = useState<Set<TerritoryId>>(new Set());
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  
  // Track timeout IDs for cleanup
  const spiceBlowTimeoutsRef = useRef<Map<TerritoryId, NodeJS.Timeout>>(new Map());
  const shipmentTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Process events to extract phase, storm, and spice blow info
  useEffect(() => {
    // Process events in reverse order to get the latest state
    // This ensures we use the most recent phase/turn values
    const latestEvents = [...events].reverse();
    
    // Collect phase updates to batch them
    let newPhase: Phase | null = null;
    let newTurn: number | null = null;

    for (const event of latestEvents) {
      // Handle top-level PHASE_STARTED events
      if (isPhaseStartedEvent(event)) {
        console.log('[usePhaseVisualizations] PHASE_STARTED (top-level):', event.data);
        newPhase = event.data.phase;
        if (event.data.turn !== undefined) {
          newTurn = event.data.turn;
        }
        // Break after finding the latest phase event
        break;
      }

      // Handle top-level TURN_STARTED events
      if (isTurnStartedEvent(event)) {
        console.log('[usePhaseVisualizations] TURN_STARTED (top-level):', event.data);
        if (newTurn === null) {
          newTurn = event.data.turn;
        }
        // Don't break - continue to find phase
      }

      // Handle PHASE_STARTED nested inside PHASE_EVENT wrapper
      if (isPhaseEvent(event)) {
        const phaseEvent = event.data.event;
        if (phaseEvent.type === 'PHASE_STARTED') {
          const phaseData = phaseEvent.data as { phase: Phase; turn?: number };
          console.log('[usePhaseVisualizations] PHASE_STARTED (nested):', phaseData);
          newPhase = phaseData.phase;
          if (phaseData.turn !== undefined) {
            newTurn = phaseData.turn;
          }
          // Break after finding the latest phase event
          break;
        }

        // Handle TURN_STARTED nested inside PHASE_EVENT wrapper
        if (phaseEvent.type === 'TURN_STARTED') {
          const turnData = phaseEvent.data as { turn: number };
          console.log('[usePhaseVisualizations] TURN_STARTED (nested):', turnData);
          if (newTurn === null) {
            newTurn = turnData.turn;
          }
          // Don't break - continue to find phase
        }
      }
    }
    
    // If no phase found, check all events again in forward order for any phase info
    if (newPhase === null) {
      for (const event of events) {
        // Check top-level events
        if (isPhaseStartedEvent(event)) {
          console.log('[usePhaseVisualizations] Found PHASE_STARTED in forward scan (top-level):', event.data);
          newPhase = event.data.phase;
          if (event.data.turn !== undefined) {
            newTurn = event.data.turn;
          }
          break;
        }

        // Check nested events
        if (isPhaseEvent(event)) {
          const phaseEvent = event.data.event;
          if (phaseEvent.type === 'PHASE_STARTED') {
            const phaseData = phaseEvent.data as { phase: Phase; turn?: number };
            console.log('[usePhaseVisualizations] Found PHASE_STARTED in forward scan (nested):', phaseData);
            newPhase = phaseData.phase;
            if (phaseData.turn !== undefined) {
              newTurn = phaseData.turn;
            }
            break;
          }
        }
      }
    }

    // Batch state updates using setTimeout to avoid synchronous updates in effect
    let timeoutId: NodeJS.Timeout | null = null;
    if (newPhase !== null || newTurn !== null) {
      timeoutId = setTimeout(() => {
        if (newPhase !== null) {
          setCurrentPhase(newPhase);
        }
        if (newTurn !== null) {
          setCurrentTurn(newTurn);
        }
      }, 0);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // Process all events for storm and spice blow (not just latest)
    for (const event of events) {
      // Handle PHASE_EVENT wrapper events (contains STORM_MOVED, SPICE_PLACED, etc.)
      if (isPhaseEvent(event)) {
        const phaseEvent = (event.data as { event: { type: string; data: Record<string, unknown>; message: string } }).event;
        console.log('[usePhaseVisualizations] PHASE_EVENT:', phaseEvent.type);

        // Handle STORM_MOVED events
        if (isStormMovedEvent(phaseEvent)) {
          const newSectors = extractStormSectors(phaseEvent.data);
          setStormSectors(newSectors);
        }

        // Handle SPICE_PLACED events
        if (isSpicePlacedEvent(phaseEvent)) {
          const spiceData = phaseEvent.data as {
            territory: TerritoryId; // Note: event uses 'territory', not 'territoryId'
            sector?: number;
            amount?: number;
          };

          const territoryId = spiceData.territory;
          if (territoryId) {
            console.log('[usePhaseVisualizations] SPICE_PLACED:', territoryId, spiceData.amount);
            
            // Clear any existing timeout for this territory
            const existingTimeout = spiceBlowTimeoutsRef.current.get(territoryId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            // Add territory to blinking set
            setSpiceBlowTerritories((prev) => new Set(prev).add(territoryId));

            // Remove from blinking after duration
            const timeoutId = setTimeout(() => {
              setSpiceBlowTerritories((prev) => {
                const newSet = new Set(prev);
                newSet.delete(territoryId);
                return newSet;
              });
              spiceBlowTimeoutsRef.current.delete(territoryId);
            }, SPICE_BLOW_BLINK_DURATION_MS);
            
            spiceBlowTimeoutsRef.current.set(territoryId, timeoutId);
          }
        }

        // Handle FORCES_SHIPPED events
        if (isForcesShippedEvent(phaseEvent)) {
          const shipmentData = phaseEvent.data as {
            faction: string;
            territory: TerritoryId;
            sector: number;
            count: number;
            cost?: number;
          };

          if (shipmentData.territory && shipmentData.faction && shipmentData.count) {
            const shipmentKey = `${shipmentData.faction}-${shipmentData.territory}-${shipmentData.sector}-${event.timestamp}`;
            
            // Clear any existing timeout for this shipment
            const existingTimeout = shipmentTimeoutsRef.current.get(shipmentKey);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            // Add to recent shipments
            const shipment: RecentShipment = {
              faction: shipmentData.faction,
              territoryId: shipmentData.territory,
              sector: shipmentData.sector ?? 0,
              count: shipmentData.count,
              timestamp: event.timestamp,
            };

            setRecentShipments((prev) => [...prev, shipment]);

            // Remove from recent shipments after duration
            const timeoutId = setTimeout(() => {
              setRecentShipments((prev) => 
                prev.filter((s) => s.timestamp !== shipment.timestamp)
              );
              shipmentTimeoutsRef.current.delete(shipmentKey);
            }, SHIPMENT_HIGHLIGHT_DURATION_MS);
            
            shipmentTimeoutsRef.current.set(shipmentKey, timeoutId);
          }
        }
      }

      // Handle STORM_POSITION_CHANGED state delta events
      if (isStormPositionChangedEvent(event)) {
        const stormData = event.data as { newSector: number };
        setStormSectors(new Set([stormData.newSector]));
      }
    }
  }, [events, currentPhase]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      spiceBlowTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      spiceBlowTimeoutsRef.current.clear();
      shipmentTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      shipmentTimeoutsRef.current.clear();
    };
  }, []);

  // Calculate storm-affected territories
  const stormAffectedTerritories = useMemo(() => {
    return calculateStormAffectedTerritories(stormSectors);
  }, [stormSectors]);

  return {
    currentPhase,
    currentTurn,
    stormSectors,
    spiceBlowTerritories,
    stormAffectedTerritories,
    recentShipments,
  };
}

