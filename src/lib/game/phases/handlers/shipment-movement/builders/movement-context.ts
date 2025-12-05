/**
 * Movement Context Builder
 * 
 * Builds detailed context information for agents making movement decisions.
 * Provides information about:
 * - Current territories where faction has forces
 * - All forces and spice in those territories
 * - Reachable territories with full details
 * - Storm status, occupancy limits, and strategic information
 * 
 * This helps agents make informed movement decisions without needing multiple tool calls.
 */

import {
  Faction,
  TerritoryId,
  TerritoryType,
  type GameState,
  TERRITORY_DEFINITIONS,
  STRONGHOLD_TERRITORIES,
  FACTION_NAMES,
} from '../../../../types';
import {
  getFactionState,
  getFactionsOccupyingTerritory,
  getSpiceInTerritory,
  isSectorInStorm,
} from '../../../../state';
import { getReachableTerritories, getMovementRangeForFaction } from '../../../../rules/movement';
import { findSafeSector } from '../../../../rules/storm-validation';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Information about forces in a territory (from any faction).
 */
export interface TerritoryForcesInfo {
  faction: Faction;
  regular: number;
  elite: number;
  total: number;
  sector: number;
  advisors?: number; // For Bene Gesserit
}

/**
 * Detailed information about a territory for movement context.
 */
export interface TerritoryMovementInfo {
  territoryId: TerritoryId;
  name: string;
  territoryType: TerritoryType;
  sectors: number[];
  safeSectors: number[]; // Sectors not in storm
  inStormSectors: number[]; // Sectors currently in storm
  hasAnySectorInStorm: boolean; // True if any sector is in storm
  spice: number; // Total spice in this territory (all sectors)
  spiceBySector: Array<{ sector: number; amount: number }>; // Spice per sector
  allForces: TerritoryForcesInfo[]; // All forces from all factions
  occupancyCount: number; // Number of factions (excluding BG advisors-only)
  isStronghold: boolean;
  canMoveHere: boolean; // True if movement is allowed (not blocked by occupancy limit)
  reasonCannotMove: string | null; // Explanation if canMoveHere is false
}

/**
 * Information about a force stack the faction can move.
 */
export interface ForceStackMovementInfo {
  fromTerritory: TerritoryMovementInfo;
  myForces: {
    regular: number;
    elite: number;
    total: number;
    sector: number;
    advisors?: number; // For Bene Gesserit
  };
  reachableTerritories: Array<{
    territory: TerritoryMovementInfo;
    distance: number; // Movement distance (1, 2, or 3)
  }>;
}

/**
 * Complete movement context for an agent decision.
 */
export interface MovementContext {
  movementRange: number;
  hasOrnithopters: boolean;
  stormSector: number;
  forceStacks: ForceStackMovementInfo[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build detailed territory information for movement context.
 */
function buildTerritoryInfo(
  state: GameState,
  territoryId: TerritoryId,
  movingFaction: Faction
): TerritoryMovementInfo {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory) {
    throw new Error(`Territory ${territoryId} not found`);
  }

  // Get all sectors and their storm status
  const sectors = territory.sectors;
  const safeSectors: number[] = [];
  const inStormSectors: number[] = [];
  
  for (const sector of sectors) {
    if (isSectorInStorm(state, sector)) {
      inStormSectors.push(sector);
    } else {
      safeSectors.push(sector);
    }
  }

  // Get spice information
  const totalSpice = getSpiceInTerritory(state, territoryId);
  const spiceBySector = state.spiceOnBoard
    .filter((s) => s.territoryId === territoryId)
    .map((s) => ({ sector: s.sector, amount: s.amount }));

  // Get all forces from all factions
  const allForces: TerritoryForcesInfo[] = [];
  for (const [faction, factionState] of state.factions) {
    for (const stack of factionState.forces.onBoard) {
      if (stack.territoryId === territoryId) {
        const total = stack.forces.regular + stack.forces.elite;
        if (total > 0 || (stack.advisors ?? 0) > 0) {
          allForces.push({
            faction,
            regular: stack.forces.regular,
            elite: stack.forces.elite,
            total,
            sector: stack.sector,
            advisors: stack.advisors,
          });
        }
      }
    }
  }

  // Get occupancy count (excluding BG advisors-only)
  const occupants = getFactionsOccupyingTerritory(state, territoryId);
  const occupancyCount = occupants.length;

  // Check if movement is allowed (for stronghold occupancy limits)
  const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);
  let canMoveHere = true;
  let reasonCannotMove: string | null = null;

  if (isStronghold) {
    const otherFactions = occupants.filter((f) => f !== movingFaction);
    if (otherFactions.length >= 2) {
      canMoveHere = false;
      reasonCannotMove = `Stronghold occupancy limit: ${otherFactions.length} other factions present (max 2 allowed)`;
    } else if (occupants.includes(movingFaction)) {
      // Can always move to a stronghold where you already are (repositioning)
      canMoveHere = true;
    }
  }

  return {
    territoryId,
    name: territory.name,
    territoryType: territory.type,
    sectors,
    safeSectors,
    inStormSectors,
    hasAnySectorInStorm: inStormSectors.length > 0,
    spice: totalSpice,
    spiceBySector,
    allForces,
    occupancyCount,
    isStronghold,
    canMoveHere,
    reasonCannotMove,
  };
}

/**
 * Check if a territory can be moved to from a specific source.
 * This validates storm blocking and path requirements.
 */
function canMoveToTerritory(
  state: GameState,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId,
  fromSector: number,
  movingFaction: Faction,
  movementRange: number
): { canMove: boolean; reason: string | null } {
  // Get reachable territories to check if destination is reachable
  const reachable = getReachableTerritories(
    state,
    fromTerritoryId,
    movementRange,
    movingFaction
  );

  if (!reachable.has(toTerritoryId)) {
    return {
      canMove: false,
      reason: 'Territory not reachable within movement range (blocked by storm or full strongholds)',
    };
  }

  // Additional validation: check if destination sector is valid
  const toTerritory = TERRITORY_DEFINITIONS[toTerritoryId];
  if (!toTerritory) {
    return { canMove: false, reason: 'Invalid territory' };
  }

  // Check if destination sector is valid for that territory
  if (!toTerritory.sectors.includes(fromSector) && toTerritory.sectors.length > 0) {
    // Note: The agent will choose the sector when moving, so we don't need to validate specific sector here
    // This is just a sanity check that the territory is reachable
  }

  return { canMove: true, reason: null };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Build comprehensive movement context for an agent decision.
 * 
 * This function gathers all information an agent needs to make an informed movement decision:
 * - Current territories with forces and their status
 * - Reachable destinations with full details
 * - Strategic information (spice, enemy forces, strongholds)
 * 
 * @param state Current game state
 * @param faction Faction making the movement decision
 * @param movementRange Movement range (1, 2, or 3 territories)
 * @param hasOrnithopters Whether faction has ornithopter access
 * @returns Complete movement context with all force stacks and reachable territories
 */
export function buildMovementContext(
  state: GameState,
  faction: Faction,
  movementRange: number,
  hasOrnithopters: boolean
): MovementContext {
  const factionState = getFactionState(state, faction);

  // Build context for each force stack
  const forceStacks: ForceStackMovementInfo[] = [];

  for (const stack of factionState.forces.onBoard) {
    const myForcesTotal = stack.forces.regular + stack.forces.elite;
    
    // Skip empty stacks (though they shouldn't exist)
    if (myForcesTotal === 0 && (stack.advisors ?? 0) === 0) {
      continue;
    }

    // Build current territory info
    const fromTerritory = buildTerritoryInfo(state, stack.territoryId, faction);

    // Get reachable territories
    const reachable = getReachableTerritories(
      state,
      stack.territoryId,
      movementRange,
      faction
    );

    // Build info for each reachable territory
    const reachableTerritories = Array.from(reachable.entries()).map(([territoryId, distance]) => {
      const territory = buildTerritoryInfo(state, territoryId, faction);
      
      // Additional validation for this specific movement
      const moveValidation = canMoveToTerritory(
        state,
        stack.territoryId,
        territoryId,
        stack.sector,
        faction,
        movementRange
      );

      // Update canMoveHere based on reachability validation
      if (!moveValidation.canMove) {
        territory.canMoveHere = false;
        territory.reasonCannotMove = moveValidation.reason;
      }

      return {
        territory,
        distance,
      };
    });

    // Sort by distance, then by strategic value (strongholds first, then by spice)
    reachableTerritories.sort((a, b) => {
      // First by distance
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      // Then by stronghold status
      if (a.territory.isStronghold !== b.territory.isStronghold) {
        return a.territory.isStronghold ? -1 : 1;
      }
      // Then by spice amount
      return b.territory.spice - a.territory.spice;
    });

    forceStacks.push({
      fromTerritory,
      myForces: {
        regular: stack.forces.regular,
        elite: stack.forces.elite,
        total: myForcesTotal,
        sector: stack.sector,
        advisors: stack.advisors,
      },
      reachableTerritories,
    });
  }

  return {
    movementRange,
    hasOrnithopters,
    stormSector: state.stormSector,
    forceStacks,
  };
}

