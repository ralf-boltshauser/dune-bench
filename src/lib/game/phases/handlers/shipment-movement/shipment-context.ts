/**
 * Shipment Context Builder
 *
 * Builds shipment-specific context for agents:
 * - Where this faction currently has forces on the board
 * - The state of all strongholds (occupants, storm status, ship-ability)
 *
 * This is intentionally simpler than movement context and focused on:
 * - Your own board presence
 * - Stronghold status (since shipment often targets strongholds)
 */

import {
  Faction,
  TerritoryId,
  TerritoryType,
  type GameState,
  TERRITORY_DEFINITIONS,
  STRONGHOLD_TERRITORIES,
} from "../../../types";
import {
  getFactionState,
  getFactionsOccupyingTerritory,
  getSpiceInTerritory,
  isTerritoryInStorm,
  isSectorInStorm,
  canShipToTerritory,
} from "../../../state";
import { getTerritoriesWithinDistance } from "../../../rules/movement";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Where this faction currently has forces on the board.
 */
export interface OwnForceLocation {
  territoryId: TerritoryId;
  name: string;
  territoryType: TerritoryType;
  isStronghold: boolean;
  spice: number;
  totalForces: number;
  regular: number;
  elite: number;
  stacks: Array<{
    sector: number;
    regular: number;
    elite: number;
    total: number;
  }>;
}

/**
 * Status information for a stronghold.
 */
export interface StrongholdStatus {
  territoryId: TerritoryId;
  name: string;
  inStorm: boolean;
  occupants: Faction[];
  isStronghold: true;
  myForces: number;
  canShipHere: boolean;
  reasonCannotShip: string | null;
}

/**
 * Territory information for Fremen shipment destinations.
 */
export interface FremenShipmentTerritory {
  territoryId: TerritoryId;
  name: string;
  territoryType: TerritoryType;
  isStronghold: boolean;
  sectors: number[];
  safeSectors: number[]; // Sectors not in storm
  inStormSectors: number[]; // Sectors currently in storm
  hasAnySectorInStorm: boolean; // True if any sector is in storm
  spice: number; // Total spice in this territory
  occupants: Faction[]; // Factions occupying this territory
  occupancyCount: number; // Number of factions (excluding BG advisors-only)
  myForces: number; // This faction's forces in this territory
  canShipHere: boolean; // True if shipment is allowed (not blocked by occupancy limit or storm)
  reasonCannotShip: string | null; // Explanation if canShipHere is false
  distance: number; // Distance from Great Flat (0 = Great Flat itself, 1-2 = within range)
}

/**
 * Shipment context passed to shipment agent calls.
 */
export interface ShipmentContext {
  ownForces: OwnForceLocation[];
  strongholds: StrongholdStatus[];
  fremenAvailableTerritories?: FremenShipmentTerritory[]; // Only populated for Fremen
}

// =============================================================================
// HELPERS
// =============================================================================

function buildOwnForceLocations(state: GameState, faction: Faction): OwnForceLocation[] {
  const factionState = getFactionState(state, faction);
  const byTerritory = new Map<
    TerritoryId,
    {
      regular: number;
      elite: number;
      stacks: Array<{ sector: number; regular: number; elite: number; total: number }>;
    }
  >();

  for (const stack of factionState.forces.onBoard) {
    const total = stack.forces.regular + stack.forces.elite;
    if (total === 0) continue;

    const existing = byTerritory.get(stack.territoryId) ?? {
      regular: 0,
      elite: 0,
      stacks: [],
    };

    existing.regular += stack.forces.regular;
    existing.elite += stack.forces.elite;
    existing.stacks.push({
      sector: stack.sector,
      regular: stack.forces.regular,
      elite: stack.forces.elite,
      total,
    });

    byTerritory.set(stack.territoryId, existing);
  }

  const locations: OwnForceLocation[] = [];

  for (const [territoryId, info] of byTerritory.entries()) {
    const def = TERRITORY_DEFINITIONS[territoryId];
    if (!def) continue;

    const spice = getSpiceInTerritory(state, territoryId);
    const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);

    locations.push({
      territoryId,
      name: def.name,
      territoryType: def.type,
      isStronghold,
      spice,
      totalForces: info.regular + info.elite,
      regular: info.regular,
      elite: info.elite,
      stacks: info.stacks,
    });
  }

  return locations;
}

function buildStrongholdStatuses(state: GameState, faction: Faction): StrongholdStatus[] {
  const strongholds: StrongholdStatus[] = [];

  for (const territoryId of STRONGHOLD_TERRITORIES) {
    const def = TERRITORY_DEFINITIONS[territoryId];
    if (!def) continue;

    const inStorm = isTerritoryInStorm(state, territoryId);
    const occupants = getFactionsOccupyingTerritory(state, territoryId);

    // Count this faction's forces in the stronghold
    const factionState = getFactionState(state, faction);
    let myForces = 0;
    for (const stack of factionState.forces.onBoard) {
      if (stack.territoryId === territoryId) {
        myForces += stack.forces.regular + stack.forces.elite;
      }
    }

    const canShipHere = canShipToTerritory(state, faction, territoryId);
    let reasonCannotShip: string | null = null;

    if (!canShipHere) {
      if (inStorm) {
        reasonCannotShip = "Cannot ship into storm sector (Rule 2.04.17).";
      } else {
        const otherFactions = occupants.filter((f) => f !== faction);
        if (otherFactions.length >= 2) {
          reasonCannotShip = `Stronghold occupancy limit: already occupied by ${otherFactions.length} other factions (max 2).`;
        } else {
          reasonCannotShip = "Shipment to this stronghold is currently not allowed (occupancy or storm restriction).";
        }
      }
    }

    strongholds.push({
      territoryId,
      name: def.name,
      inStorm,
      occupants,
      isStronghold: true,
      myForces,
      canShipHere,
      reasonCannotShip,
    });
  }

  return strongholds;
}

/**
 * Build available territories for Fremen shipment.
 * Fremen can ship to Great Flat or territories within 2 territories of Great Flat.
 */
function buildFremenAvailableTerritories(
  state: GameState,
  faction: Faction
): FremenShipmentTerritory[] {
  const greatFlat = TerritoryId.THE_GREAT_FLAT;
  const validDestinations = getTerritoriesWithinDistance(greatFlat, 2);
  validDestinations.add(greatFlat); // Include Great Flat itself

  const territories: FremenShipmentTerritory[] = [];

  for (const territoryId of validDestinations) {
    const def = TERRITORY_DEFINITIONS[territoryId];
    if (!def) continue;

    // Get all sectors and their storm status
    const sectors = def.sectors;
    const safeSectors: number[] = [];
    const inStormSectors: number[] = [];
    
    for (const sector of sectors) {
      if (isSectorInStorm(state, sector)) {
        inStormSectors.push(sector);
      } else {
        safeSectors.push(sector);
      }
    }

    const hasAnySectorInStorm = inStormSectors.length > 0;
    const spice = getSpiceInTerritory(state, territoryId);
    const occupants = getFactionsOccupyingTerritory(state, territoryId);
    const occupancyCount = occupants.length;
    const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);

    // Count this faction's forces in the territory
    const factionState = getFactionState(state, faction);
    let myForces = 0;
    for (const stack of factionState.forces.onBoard) {
      if (stack.territoryId === territoryId) {
        myForces += stack.forces.regular + stack.forces.elite;
      }
    }

    // Check if shipment is allowed
    // For Fremen: can ship if not blocked by occupancy limit (strongholds only) or all sectors in storm
    let canShipHere = true;
    let reasonCannotShip: string | null = null;

    // Check occupancy limit for strongholds
    if (isStronghold) {
      const otherFactions = occupants.filter((f) => f !== faction);
      if (otherFactions.length >= 2) {
        canShipHere = false;
        reasonCannotShip = `Stronghold occupancy limit: already occupied by ${otherFactions.length} other factions (max 2).`;
      }
    }

    // Check storm: can't ship if ALL sectors are in storm (unless using storm migration, but that's handled in the tool)
    // For context purposes, we show if there are any safe sectors
    if (safeSectors.length === 0 && sectors.length > 0) {
      // All sectors in storm - can still ship with storm migration, but note it
      if (!canShipHere) {
        // Already blocked by occupancy, just add storm note
        reasonCannotShip += " Also, all sectors are in storm (can use storm migration for half loss).";
      } else {
        reasonCannotShip = "All sectors are in storm (can use storm migration for half loss).";
      }
    }

    // Calculate distance from Great Flat
    let distance = 0;
    if (territoryId === greatFlat) {
      distance = 0;
    } else {
      // Check if it's adjacent (distance 1) or within 2 (distance 2)
      const greatFlatDef = TERRITORY_DEFINITIONS[greatFlat];
      if (greatFlatDef?.adjacentTerritories.includes(territoryId)) {
        distance = 1;
      } else {
        distance = 2;
      }
    }

    territories.push({
      territoryId,
      name: def.name,
      territoryType: def.type,
      isStronghold,
      sectors,
      safeSectors,
      inStormSectors,
      hasAnySectorInStorm,
      spice,
      occupants,
      occupancyCount,
      myForces,
      canShipHere,
      reasonCannotShip,
      distance,
    });
  }

  // Sort by distance (Great Flat first), then by strategic value (strongholds first, then by spice)
  territories.sort((a, b) => {
    // First by distance
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    // Then by stronghold status
    if (a.isStronghold !== b.isStronghold) {
      return a.isStronghold ? -1 : 1;
    }
    // Then by spice amount
    return b.spice - a.spice;
  });

  return territories;
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Build shipment context for a faction.
 *
 * Focuses on:
 * - Where this faction's forces are currently on the board
 * - The state of all strongholds (occupancy, storm, whether shipment is allowed)
 * - For Fremen: Available territories they can ship to (Great Flat + within 2 territories)
 */
export function buildShipmentContext(state: GameState, faction: Faction): ShipmentContext {
  const ownForces = buildOwnForceLocations(state, faction);
  const strongholds = buildStrongholdStatuses(state, faction);

  const context: ShipmentContext = {
    ownForces,
    strongholds,
  };

  // Add Fremen-specific available territories
  if (faction === Faction.FREMEN) {
    context.fremenAvailableTerritories = buildFremenAvailableTerritories(state, faction);
  }

  return context;
}


