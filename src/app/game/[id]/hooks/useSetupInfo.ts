'use client';

import { useMemo } from 'react';
import type { StreamEvent } from '@/lib/game/stream/types';
import { WrapperEvent } from '@/lib/game/stream/types';
import type { GameState } from '@/lib/game/types';
import { Faction } from '@/lib/game/types/enums';
import { getLeaderDefinition } from '@/lib/game/data';

// =============================================================================
// TYPES
// =============================================================================

export interface TraitorInfo {
  leaderId: string;
  faction: Faction;
  strength: number;
}

export interface FactionTraitorSelection {
  availableTraitors: TraitorInfo[];
  selectedTraitor: TraitorInfo | null;
}

export interface FremenDistribution {
  sietch_tabr: number;
  false_wall_south: number;
  false_wall_west: number;
}

export interface SetupInfo {
  traitorSelections: Map<Faction, FactionTraitorSelection>;
  fremenDistribution: FremenDistribution | null;
  playerPositions: Map<Faction, number>;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

function isPhaseEvent(event: StreamEvent): event is StreamEvent<{
  event: {
    type: string;
    data: Record<string, unknown>;
    message: string;
  };
}> {
  return event.type === WrapperEvent.PHASE_EVENT;
}

function isTraitorSelectedEvent(
  phaseEvent: { type: string; data: Record<string, unknown> }
): boolean {
  return phaseEvent.type === 'TRAITOR_SELECTED';
}

function isTraitorOptionsAvailableEvent(
  phaseEvent: { type: string; data: Record<string, unknown> }
): phaseEvent is { 
  type: string; 
  data: { 
    faction: Faction; 
    traitorOptions: Array<{
      id: string;
      name: string;
      faction: Faction;
      factionName: string;
      strength: number;
    }>;
    autoKept?: boolean;
  } 
} {
  return phaseEvent.type === 'TRAITOR_OPTIONS_AVAILABLE';
}

function isForcesPlacedEvent(
  phaseEvent: { type: string; data: Record<string, unknown> }
): phaseEvent is { type: string; data: { faction: Faction; distribution: Record<string, number> } } {
  return phaseEvent.type === 'FORCES_PLACED';
}

function isSetupStepEvent(
  phaseEvent: { type: string; data: Record<string, unknown> }
): phaseEvent is { type: string; data: { step: string } } {
  return phaseEvent.type === 'SETUP_STEP';
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract traitor information from a traitor card
 */
function getTraitorInfo(traitorCard: { leaderId: string; leaderFaction: Faction }): TraitorInfo {
  const leaderDef = getLeaderDefinition(traitorCard.leaderId);
  return {
    leaderId: traitorCard.leaderId,
    faction: traitorCard.leaderFaction,
    strength: leaderDef?.strength ?? 0,
  };
}

/**
 * Extract traitor selections from game state and events
 * Processes TRAITOR_SELECTED and TRAITOR_OPTIONS_AVAILABLE events
 * Extracts available traitors from events and selected traitors from state
 */
function extractTraitorSelections(
  gameState: GameState | null,
  events: StreamEvent[]
): Map<Faction, FactionTraitorSelection> {
  const selections = new Map<Faction, FactionTraitorSelection>();

  if (!gameState) {
    return selections;
  }

  // Track which factions have selected traitors (from events)
  const factionsWithSelections = new Set<Faction>();
  // Map of faction to available traitors (from TRAITOR_OPTIONS_AVAILABLE events)
  const availableTraitorsMap = new Map<Faction, TraitorInfo[]>();
  
  for (const event of events) {
    if (isPhaseEvent(event)) {
      const phaseEvent = event.data.event;
      
      // Extract available traitors from TRAITOR_OPTIONS_AVAILABLE events
      if (isTraitorOptionsAvailableEvent(phaseEvent)) {
        const data = phaseEvent.data;
        const traitorInfos: TraitorInfo[] = data.traitorOptions.map(option => ({
          leaderId: option.id,
          faction: option.faction,
          strength: option.strength,
        }));
        availableTraitorsMap.set(data.faction, traitorInfos);
      }
      
      // Track which factions have made selections
      if (isTraitorSelectedEvent(phaseEvent)) {
        const data = phaseEvent.data as { faction: Faction; count: number };
        if (data.faction) {
          factionsWithSelections.add(data.faction);
        }
      }
    }
  }

  // Extract traitor data from game state for each faction
  for (const [faction, factionState] of gameState.factions) {
    // Get selected traitors from state
    const selectedTraitors = factionState.traitors || [];
    
    // Convert selected traitors to TraitorInfo array
    // Harkonnen keeps all 4, others keep 1
    const selectedTraitorInfos: TraitorInfo[] = selectedTraitors.map(traitor => 
      getTraitorInfo(traitor)
    );

    // If this faction has made a selection (from events), show the selected traitor(s)
    const hasSelected = factionsWithSelections.has(faction);
    
    // For display: show the first selected traitor (or all for Harkonnen)
    const selectedTraitor: TraitorInfo | null = 
      selectedTraitorInfos.length > 0 ? selectedTraitorInfos[0] : null;

    // Get available traitors from events (if not yet selected, or for Harkonnen who auto-keeps all)
    const availableTraitors = availableTraitorsMap.get(faction) || [];

    selections.set(faction, {
      availableTraitors,
      selectedTraitor: hasSelected && selectedTraitor ? selectedTraitor : null,
    });
  }

  return selections;
}

/**
 * Extract Fremen force distribution from events and game state
 * Checks FORCES_PLACED events first (most accurate), then SETUP_STEP events,
 * then falls back to game state
 */
function extractFremenDistribution(
  events: StreamEvent[],
  gameState: GameState | null
): FremenDistribution | null {
  // First, try to extract from FORCES_PLACED events (most accurate)
  // Process events in chronological order to get the latest distribution
  let latestDistribution: FremenDistribution | null = null;
  
  for (const event of events) {
    if (isPhaseEvent(event)) {
      const phaseEvent = event.data.event;
      
      // Check FORCES_PLACED events (contains actual distribution data)
      if (isForcesPlacedEvent(phaseEvent)) {
        const data = phaseEvent.data;
        // Check if this is Fremen's force distribution
        if (data.faction === Faction.FREMEN && data.distribution) {
          const dist = data.distribution;
          // Validate it has the expected structure
          if (
            typeof dist.sietch_tabr === 'number' &&
            typeof dist.false_wall_south === 'number' &&
            typeof dist.false_wall_west === 'number'
          ) {
            latestDistribution = {
              sietch_tabr: dist.sietch_tabr,
              false_wall_south: dist.false_wall_south,
              false_wall_west: dist.false_wall_west,
            };
          }
        }
      }
      
      // Check SETUP_STEP events for FREMEN_FORCE_DISTRIBUTION step
      // Note: This event doesn't contain distribution data, but signals the step
      if (isSetupStepEvent(phaseEvent)) {
        const stepData = phaseEvent.data;
        if (stepData.step === 'FREMEN_FORCE_DISTRIBUTION') {
          // Step is happening, but distribution comes from FORCES_PLACED event
          // If we don't have distribution yet, we'll fall back to state
        }
      }
    }
  }

  // If we found distribution from events, return it
  if (latestDistribution) {
    return latestDistribution;
  }

  // Fall back to extracting from game state
  if (!gameState) {
    return null;
  }

  const fremenState = gameState.factions.get(Faction.FREMEN);
  if (!fremenState) {
    return null;
  }

  // Extract forces from the three starting territories
  const distribution: FremenDistribution = {
    sietch_tabr: 0,
    false_wall_south: 0,
    false_wall_west: 0,
  };

  for (const stack of fremenState.forces.onBoard) {
    if (stack.territoryId === 'sietch_tabr') {
      distribution.sietch_tabr += stack.forces.regular + stack.forces.elite;
    } else if (stack.territoryId === 'false_wall_south') {
      distribution.false_wall_south += stack.forces.regular + stack.forces.elite;
    } else if (stack.territoryId === 'false_wall_west') {
      distribution.false_wall_west += stack.forces.regular + stack.forces.elite;
    }
  }

  // Only return if there are forces distributed (setup complete)
  const total = distribution.sietch_tabr + distribution.false_wall_south + distribution.false_wall_west;
  if (total === 0) {
    return null;
  }

  return distribution;
}

/**
 * Extract player positions from game state
 */
function extractPlayerPositions(
  gameState: GameState | null
): Map<Faction, number> {
  if (!gameState || !gameState.playerPositions) {
    return new Map();
  }

  return new Map(gameState.playerPositions);
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for extracting setup phase information from game events and state
 * Extracts traitor selections, Fremen distribution, and player positions
 */
export function useSetupInfo(
  events: StreamEvent[],
  gameState: GameState | null
): SetupInfo {
  const setupInfo = useMemo(() => {
    const traitorSelections = extractTraitorSelections(gameState, events);
    const fremenDistribution = extractFremenDistribution(events, gameState);
    const playerPositions = extractPlayerPositions(gameState);

    return {
      traitorSelections,
      fremenDistribution,
      playerPositions,
    };
  }, [events, gameState]);

  return setupInfo;
}

