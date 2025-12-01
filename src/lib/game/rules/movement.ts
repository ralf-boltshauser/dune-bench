/**
 * Movement and shipment validation rules.
 * Validates shipping from reserves and moving between territories.
 */

import {
  Faction,
  TerritoryId,
  TerritoryType,
  type GameState,
  TERRITORY_DEFINITIONS,
  STRONGHOLD_TERRITORIES,
  ORNITHOPTER_TERRITORIES,
} from '../types';
import {
  getFactionState,
  getReserveForceCount,
  getForceCountInTerritory,
  getFactionsInTerritory,
  getFactionsOccupyingTerritory,
  isSectorInStorm,
  getTotalForcesOnBoard,
  getBGAdvisorsInTerritory,
} from '../state';
import {
  validateSectorNotInStorm,
  validateSourceSectorNotInStorm,
  validateDestinationSectorNotInStorm,
  findSafeSector,
} from './storm-validation';
import { GAME_CONSTANTS, getFactionConfig } from '../data';
import {
  type ValidationResult,
  type ShipmentSuggestion,
  type MovementSuggestion,
  validResult,
  invalidResult,
  createError,
} from './types';
import { normalizeTerritoryId, getTerritoryName, getAllTerritoryIds } from '../utils/territory-normalize';

// =============================================================================
// SHIPMENT VALIDATION
// =============================================================================

/**
 * Validate a shipment from reserves to a territory.
 * Returns detailed errors and alternative suggestions if invalid.
 */
export function validateShipment(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId | string,
  sector: number,
  forceCount: number
): ValidationResult<ShipmentSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  
  // Normalize territory ID (case-insensitive)
  const normalizedTerritoryId = normalizeTerritoryId(territoryId);
  if (!normalizedTerritoryId) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(territoryId).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `Territory "${territoryId}" does not exist.${suggestionText} Valid territory IDs are lowercase with underscores (e.g., "carthag", "arrakeen", "the_great_flat").`,
        {
          field: 'territoryId',
          actual: territoryId,
          suggestion: 'Use lowercase territory ID with underscores (e.g., "carthag" not "Carthag" or "CARTHAG")',
        }
      )
    );
    return invalidResult(errors, { targetTerritory: String(territoryId), targetSector: sector });
  }
  
  const territory = TERRITORY_DEFINITIONS[normalizedTerritoryId];
  const reserves = getReserveForceCount(state, faction);

  // Context for agent decision-making
  const context = {
    reserveForces: reserves,
    spiceAvailable: factionState.spice,
    requestedForces: forceCount,
    targetTerritory: normalizedTerritoryId,
    targetSector: sector,
  };

  // Check: Faction is Fremen (can't ship normally)
  if (faction === Faction.FREMEN) {
    errors.push(
      createError(
        'CANNOT_SHIP_FROM_BOARD',
        'Fremen cannot use normal shipment. Use your special fremen_send_forces ability to send forces to the Great Flat area for free.',
        { suggestion: 'Use fremen_send_forces tool instead of ship_forces' }
      )
    );
  }

  // Check: Sufficient forces in reserves
  if (forceCount > reserves) {
    errors.push(
      createError(
        'INSUFFICIENT_RESERVES',
        `Cannot ship ${forceCount} forces, only ${reserves} available in reserves`,
        {
          field: 'forceCount',
          actual: forceCount,
          expected: `1-${reserves}`,
          suggestion: reserves > 0 ? `Ship ${reserves} forces instead` : 'No forces available to ship',
        }
      )
    );
  }

  // Territory already validated above via normalization

  // Check: Sector is valid for territory
  if (!territory.sectors.includes(sector) && territory.sectors.length > 0) {
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `Sector ${sector} is not part of ${territory.name}`,
        {
          field: 'sector',
          actual: sector,
          expected: territory.sectors,
          suggestion: `Use sector ${territory.sectors[0]} instead`,
        }
      )
    );
  }

  // Check: Sector not in storm (unless territory is protected from storm, like Polar Sink)
  const stormError = validateSectorNotInStorm(state, normalizedTerritoryId, sector);
  if (stormError) {
    // Enhance suggestion with nearest safe territory if available
    const nearestSafe = findNearestSafeTerritory(state, normalizedTerritoryId, faction);
    if (nearestSafe && nearestSafe !== stormError.suggestion) {
      stormError.suggestion = nearestSafe;
    }
    errors.push(stormError);
  }

  // Check: Occupancy limit for strongholds
  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  if (STRONGHOLD_TERRITORIES.includes(normalizedTerritoryId)) {
    const occupants = getFactionsOccupyingTerritory(state, normalizedTerritoryId);
    if (occupants.length >= 2 && !occupants.includes(faction)) {
      errors.push(
        createError(
          'OCCUPANCY_LIMIT_EXCEEDED',
          `${territory.name} already has 2 factions occupying it`,
          {
            field: 'territoryId',
            actual: occupants,
            expected: 'Maximum 2 factions per stronghold',
            suggestion: 'Choose a different territory or wait for an occupant to leave',
          }
        )
      );
    }
  }

  // Check: BG cannot ship fighters to territories with advisors (Rule 2.02.14)
  if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
    const advisorsInTerritory = getBGAdvisorsInTerritory(state, normalizedTerritoryId);
    if (advisorsInTerritory > 0) {
      errors.push(
        createError(
          'CANNOT_SHIP_FIGHTERS_TO_ADVISORS',
          `Cannot ship fighters to ${territory.name} - you already have ${advisorsInTerritory} advisor(s) there (Rule 2.02.14)`,
          {
            field: 'territoryId',
            actual: advisorsInTerritory,
            expected: 0,
            suggestion: 'Choose a different territory or convert advisors to fighters first',
          }
        )
      );
    }
  }

  // Check: Sufficient spice (using normalized territory ID)
  const cost = calculateShipmentCost(normalizedTerritoryId, forceCount, faction);
  if (factionState.spice < cost) {
    const affordable = calculateAffordableForces(normalizedTerritoryId, factionState.spice, faction);
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Shipment costs ${cost} spice but you only have ${factionState.spice}`,
        {
          field: 'forceCount',
          actual: cost,
          expected: `<= ${factionState.spice}`,
          suggestion: affordable > 0 ? `Ship ${affordable} forces for ${calculateShipmentCost(normalizedTerritoryId, affordable, faction)} spice` : 'Not enough spice to ship',
        }
      )
    );
  }

  // If valid, return success with context
  if (errors.length === 0) {
    return validResult({
      ...context,
      cost,
      isStronghold: STRONGHOLD_TERRITORIES.includes(normalizedTerritoryId),
    });
  }

  // Generate suggestions for invalid shipments
  const suggestions = generateShipmentSuggestions(state, faction, forceCount);

  return invalidResult(errors, context, suggestions);
}

/**
 * Calculate shipment cost based on territory type and faction.
 */
export function calculateShipmentCost(
  territoryId: TerritoryId,
  forceCount: number,
  faction: Faction
): number {
  const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);
  const baseRate = isStronghold
    ? GAME_CONSTANTS.COST_SHIP_TO_STRONGHOLD
    : GAME_CONSTANTS.COST_SHIP_TO_TERRITORY;

  // Guild pays half price (rounded up)
  if (faction === Faction.SPACING_GUILD) {
    return Math.ceil((baseRate * forceCount) / 2);
  }

  return baseRate * forceCount;
}

/**
 * Calculate how many forces can be afforded with given spice.
 */
function calculateAffordableForces(
  territoryId: TerritoryId,
  spice: number,
  faction: Faction
): number {
  const isStronghold = STRONGHOLD_TERRITORIES.includes(territoryId);
  const baseRate = isStronghold
    ? GAME_CONSTANTS.COST_SHIP_TO_STRONGHOLD
    : GAME_CONSTANTS.COST_SHIP_TO_TERRITORY;

  if (faction === Faction.SPACING_GUILD) {
    // Guild pays half, so can afford twice as many
    return Math.floor((spice * 2) / baseRate);
  }

  return Math.floor(spice / baseRate);
}

/**
 * Find a nearby territory not in storm.
 */
function findNearestSafeTerritory(
  state: GameState,
  fromTerritory: TerritoryId,
  faction: Faction
): string {
  const territory = TERRITORY_DEFINITIONS[fromTerritory];
  if (!territory) return 'Try a different territory';

  for (const adjId of territory.adjacentTerritories) {
    const adj = TERRITORY_DEFINITIONS[adjId];
    if (adj) {
      const safeSector = findSafeSector(state, adjId);
      if (safeSector !== undefined) {
        return `Try ${adj.name} sector ${safeSector} instead`;
      }
    }
  }

  return 'Wait for storm to pass';
}

/**
 * Generate valid shipment alternatives for the agent.
 */
function generateShipmentSuggestions(
  state: GameState,
  faction: Faction,
  preferredCount: number
): ShipmentSuggestion[] {
  const suggestions: ShipmentSuggestion[] = [];
  const factionState = getFactionState(state, faction);
  const reserves = getReserveForceCount(state, faction);
  const maxForces = Math.min(reserves, preferredCount);

  if (maxForces <= 0) return [];

  // Check each stronghold first (cheaper)
  for (const territoryId of STRONGHOLD_TERRITORIES) {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
    const occupants = getFactionsOccupyingTerritory(state, territoryId);

    // Skip if full (and we're not there)
    if (occupants.length >= 2 && !occupants.includes(faction)) continue;

    // Find a safe sector
    const safeSector = findSafeSector(state, territoryId);
    if (safeSector === undefined) continue;

    const cost = calculateShipmentCost(territoryId, maxForces, faction);
    if (cost <= factionState.spice) {
      suggestions.push({
        territoryId,
        sector: safeSector,
        forceCount: maxForces,
        cost,
        isStronghold: true,
      });
    }
  }

  // Limit suggestions
  return suggestions.slice(0, 5);
}

// =============================================================================
// MOVEMENT VALIDATION
// =============================================================================

/**
 * Validate moving forces between territories.
 *
 * @param hasOrnithoptersOverride - Optional override for ornithopter access (used when checking from phase start)
 */
export function validateMovement(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId | string,
  fromSector: number,
  toTerritory: TerritoryId | string,
  toSector: number,
  forceCount: number,
  hasOrnithoptersOverride?: boolean
): ValidationResult<MovementSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  
  // Normalize territory IDs (case-insensitive)
  const normalizedFrom = normalizeTerritoryId(fromTerritory);
  const normalizedTo = normalizeTerritoryId(toTerritory);
  
  if (!normalizedFrom) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(fromTerritory).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `From territory "${fromTerritory}" does not exist.${suggestionText} Valid territory IDs are lowercase with underscores (e.g., "carthag", "arrakeen").`,
        {
          field: 'fromTerritory',
          actual: fromTerritory,
          suggestion: 'Use lowercase territory ID with underscores (e.g., "carthag" not "Carthag" or "CARTHAG")',
        }
      )
    );
    return invalidResult(errors, {
      fromTerritory: String(fromTerritory),
      toTerritory: String(toTerritory),
      forcesAvailable: 0,
      requestedForces: forceCount,
      hasOrnithopters: false,
      movementRange: 1,
      stormSector: state.stormSector,
    });
  }
  
  if (!normalizedTo) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(toTerritory).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `To territory "${toTerritory}" does not exist.${suggestionText} Valid territory IDs are lowercase with underscores (e.g., "carthag", "arrakeen").`,
        {
          field: 'toTerritory',
          actual: toTerritory,
          suggestion: 'Use lowercase territory ID with underscores (e.g., "carthag" not "Carthag" or "CARTHAG")',
        }
      )
    );
    return invalidResult(errors, {
      fromTerritory: normalizedFrom,
      toTerritory: String(toTerritory),
      forcesAvailable: 0,
      requestedForces: forceCount,
      hasOrnithopters: false,
      movementRange: 1,
      stormSector: state.stormSector,
    });
  }
  
  const fromDef = TERRITORY_DEFINITIONS[normalizedFrom];
  const toDef = TERRITORY_DEFINITIONS[normalizedTo];

  const forcesAvailable = getForceCountInTerritory(state, faction, normalizedFrom);
  // Use override if provided (for phase-start ornithopter access), otherwise check current state
  const hasOrnithopters = hasOrnithoptersOverride !== undefined
    ? hasOrnithoptersOverride
    : checkOrnithopterAccess(state, faction);
  const movementRange = getMovementRangeForFaction(faction, hasOrnithopters);

  const context = {
    fromTerritory: normalizedFrom,
    toTerritory: normalizedTo,
    forcesAvailable,
    requestedForces: forceCount,
    hasOrnithopters,
    movementRange,
    stormSector: state.stormSector,
  };

  // Territories already validated above via normalization

  // Handle same-territory repositioning (Rule 1.06.03.09)
  if (fromTerritory === toTerritory) {
    // Repositioning within same territory - no path needed
    // Only validate: different sectors, to-sector not in storm, sufficient forces

    if (fromSector === toSector) {
      errors.push(createError('INVALID_DESTINATION', 'Must specify different sector for repositioning'));
      return invalidResult(errors, context);
    }

    // Check: Sector is valid for territory
    if (!toDef.sectors.includes(toSector)) {
      errors.push(
        createError(
          'INVALID_TERRITORY',
          `Sector ${toSector} is not part of ${toDef.name}`,
          {
            field: 'toSector',
            actual: toSector,
            expected: toDef.sectors,
            suggestion: `Use one of these sectors: ${toDef.sectors.join(', ')}`,
          }
        )
      );
    }

    // Check storm for source sector (unless protected or Fremen)
    // Rule 1.06.03.05: Cannot move OUT OF storm sector (Fremen exception: Rule 2.04.17)
    const sourceStormError = validateSourceSectorNotInStorm(
      state,
      faction,
      normalizedFrom,
      fromSector
    );
    if (sourceStormError) {
      errors.push(sourceStormError);
    }

    // Check storm for destination sector (unless protected)
    const destStormError = validateDestinationSectorNotInStorm(
      state,
      normalizedTo,
      toSector,
      'toSector',
      'reposition to'
    );
    if (destStormError) {
      errors.push(destStormError);
    }

    // Check: Forces available
    if (forceCount > forcesAvailable) {
      errors.push(
        createError(
          'NO_FORCES_TO_MOVE',
          `Cannot reposition ${forceCount} forces, only ${forcesAvailable} available in ${fromDef.name}`,
          {
            field: 'forceCount',
            actual: forceCount,
            expected: `1-${forcesAvailable}`,
            suggestion: `Reposition ${forcesAvailable} forces instead`,
          }
        )
      );
    }

    // Skip pathfinding - allow the move
    if (errors.length === 0) {
      return validResult({
        ...context,
        pathLength: 0,
        pathTerritories: [fromTerritory],
        isRepositioning: true,
      });
    }

    return invalidResult(errors, context);
  }

  // Check: Forces available
  if (forcesAvailable === 0) {
    errors.push(
      createError(
        'NO_FORCES_TO_MOVE',
        `You have no forces in ${fromDef.name}`,
        {
          field: 'fromTerritory',
          suggestion: 'Choose a territory where you have forces',
        }
      )
    );
  } else if (forceCount > forcesAvailable) {
    errors.push(
      createError(
        'NO_FORCES_TO_MOVE',
        `Cannot move ${forceCount} forces, only ${forcesAvailable} available in ${fromDef.name}`,
        {
          field: 'forceCount',
          actual: forceCount,
          expected: `1-${forcesAvailable}`,
          suggestion: `Move ${forcesAvailable} forces instead`,
        }
      )
    );
  }

  // Check: Source sector not in storm (unless protected or Fremen)
  // Rule 1.06.03.05: Cannot move OUT OF storm sector (Fremen exception: Rule 2.04.17)
  const sourceStormError = validateSourceSectorNotInStorm(
    state,
    faction,
    normalizedFrom,
    fromSector
  );
  if (sourceStormError) {
    errors.push(sourceStormError);
  }

  // Check: Path exists and is within range
  const path = findPath(normalizedFrom, normalizedTo, state, faction);
  if (!path) {
    errors.push(
      createError(
        'NO_PATH_AVAILABLE',
        `No path available from ${fromDef.name} to ${toDef.name} (storm may be blocking)`,
        { suggestion: 'Wait for storm to move or choose a different destination' }
      )
    );
  } else if (path.length > movementRange) {
    errors.push(
      createError(
        'EXCEEDS_MOVEMENT_RANGE',
        `${toDef.name} is ${path.length} territories away, but you can only move ${movementRange}`,
        {
          actual: path.length,
          expected: `<= ${movementRange}`,
          suggestion: hasOrnithopters
            ? `Move to ${TERRITORY_DEFINITIONS[path[movementRange - 1]]?.name} instead`
            : 'Capture Arrakeen or Carthag for ornithopter access (3 territory range)',
        }
      )
    );
  }

  // Check: Destination sector not in storm (unless territory is protected from storm, like Polar Sink)
  const destStormError = validateDestinationSectorNotInStorm(
    state,
    normalizedTo,
    toSector,
    'toSector',
    'move to'
  );
  if (destStormError) {
    errors.push(destStormError);
  }

  // Check: Occupancy limit for strongholds
  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  if (STRONGHOLD_TERRITORIES.includes(normalizedTo)) {
    const occupants = getFactionsOccupyingTerritory(state, normalizedTo);
    if (occupants.length >= 2 && !occupants.includes(faction)) {
      errors.push(
        createError(
          'OCCUPANCY_LIMIT_EXCEEDED',
          `${toDef.name} already has 2 factions`,
          { suggestion: 'Choose a different stronghold or wait for battle resolution' }
        )
      );
    }
  }

  if (errors.length === 0) {
    return validResult({
      ...context,
      pathLength: path?.length ?? 0,
      pathTerritories: path,
    });
  }

  // Generate suggestions
  const suggestions = generateMovementSuggestions(state, faction, normalizedFrom, fromSector, movementRange);

  return invalidResult(errors, context, suggestions);
}

/**
 * Check if faction has access to ornithopters (force in Arrakeen or Carthag).
 * Rule 2.02.12 (COEXISTENCE): Advisors cannot grant ornithopters - only fighters count.
 */
export function checkOrnithopterAccess(state: GameState, faction: Faction): boolean {
  const factionState = getFactionState(state, faction);
  
  return ORNITHOPTER_TERRITORIES.some((territoryId) => {
    // Check if faction has any fighters (not advisors) in this territory
    const stack = factionState.forces.onBoard.find(
      (s) => s.territoryId === territoryId
    );
    if (!stack) return false;
    
    const totalForces = stack.forces.regular + stack.forces.elite;
    const advisors = stack.advisors ?? 0;
    return (totalForces - advisors) > 0; // Only fighters count
  });
}

/**
 * Get the movement range for a faction based on ornithopter access.
 *
 * @param hasOrnithoptersOverride - Optional override for ornithopter access (used when checking from phase start)
 */
export function getMovementRange(state: GameState, faction: Faction, hasOrnithoptersOverride?: boolean): number {
  // Use override if provided (for phase-start ornithopter access), otherwise check current state
  const hasOrnithopters = hasOrnithoptersOverride !== undefined
    ? hasOrnithoptersOverride
    : checkOrnithopterAccess(state, faction);

  return getMovementRangeForFaction(faction, hasOrnithopters);
}

/**
 * Calculate movement range for a faction based on ornithopter access.
 * Fremen get 2 territories base, all others get 1. Ornithopters grant 3 territories total.
 */
export function getMovementRangeForFaction(faction: Faction, hasOrnithopters: boolean): number {
  // Ornithopters grant 3 territories to ANY faction (including Fremen)
  if (hasOrnithopters) return 3;

  // Fremen base movement is 2 territories (without ornithopters)
  if (faction === Faction.FREMEN) return 2;

  // All other factions: 1 territory without ornithopters
  return 1;
}

/**
 * Find a path between territories avoiding storm and respecting occupancy limits.
 * Uses BFS to find shortest path.
 */
export function findPath(
  from: TerritoryId,
  to: TerritoryId,
  state: GameState,
  movingFaction: Faction
): TerritoryId[] | null {
  // Same territory repositioning - valid path is just the territory itself
  if (from === to) return [from];

  const visited = new Set<TerritoryId>();
  const queue: { territory: TerritoryId; path: TerritoryId[] }[] = [
    { territory: from, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDef = TERRITORY_DEFINITIONS[current.territory];

    if (!currentDef) continue;

    for (const adjId of currentDef.adjacentTerritories) {
      if (visited.has(adjId)) continue;

      const adjDef = TERRITORY_DEFINITIONS[adjId];
      if (!adjDef) continue;

      // Check if path is blocked by storm
      // Can pass through if at least one sector is not in storm
      const canPass = adjDef.protectedFromStorm ||
        adjDef.sectors.length === 0 ||
        adjDef.sectors.some((s) => s !== state.stormSector);

      if (!canPass) continue;

      // Check occupancy limit for strongholds (can't move THROUGH if 2+ other factions)
      // This prevents finding paths that go through full strongholds
      // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
      if (adjDef.type === TerritoryType.STRONGHOLD && adjId !== to) {
        const factionsInTerritory = getFactionsOccupyingTerritory(state, adjId);
        const otherFactions = factionsInTerritory.filter(f => f !== movingFaction);
        if (otherFactions.length >= 2) {
          // Can't pass through - stronghold is full with 2 other factions
          continue;
        }
      }

      const newPath = [...current.path, adjId];

      if (adjId === to) {
        return newPath;
      }

      visited.add(adjId);
      queue.push({ territory: adjId, path: newPath });
    }
  }

  return null; // No path found
}

/**
 * Get all territories reachable within movement range.
 */
export function getReachableTerritories(
  state: GameState,
  from: TerritoryId,
  range: number,
  movingFaction: Faction
): Map<TerritoryId, number> {
  const reachable = new Map<TerritoryId, number>();
  const visited = new Set<TerritoryId>();
  const queue: { territory: TerritoryId; distance: number }[] = [
    { territory: from, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance > range) continue;
    if (visited.has(current.territory)) continue;

    visited.add(current.territory);
    if (current.territory !== from) {
      reachable.set(current.territory, current.distance);
    }

    const currentDef = TERRITORY_DEFINITIONS[current.territory];
    if (!currentDef) continue;

    for (const adjId of currentDef.adjacentTerritories) {
      const adjDef = TERRITORY_DEFINITIONS[adjId];
      if (!adjDef) continue;

      // Check storm blocking
      const canPass = adjDef.protectedFromStorm ||
        adjDef.sectors.length === 0 ||
        adjDef.sectors.some((s) => !isSectorInStorm(state, s));

      if (!canPass) continue;

      // Check occupancy limit for strongholds (can't move THROUGH if 2+ other factions)
      // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
      if (adjDef.type === TerritoryType.STRONGHOLD) {
        const factionsInTerritory = getFactionsOccupyingTerritory(state, adjId);
        const otherFactions = factionsInTerritory.filter(f => f !== movingFaction);
        if (otherFactions.length >= 2) {
          // Can't pass through - stronghold is full with 2 other factions
          // BUT we can still add it as reachable at this distance if we're adjacent to it
          // (we just can't use it as a transit point to reach further territories)
          if (current.territory === from && current.distance === 0) {
            // We're directly adjacent to this full stronghold, mark it as unreachable
            continue;
          } else {
            // We might have reached it via a different path, but can't go further through it
            continue;
          }
        }
      }

      if (!visited.has(adjId)) {
        queue.push({ territory: adjId, distance: current.distance + 1 });
      }
    }
  }

  return reachable;
}

/**
 * Generate valid movement alternatives.
 */
function generateMovementSuggestions(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  range: number
): MovementSuggestion[] {
  const suggestions: MovementSuggestion[] = [];
  const forcesAvailable = getForceCountInTerritory(state, faction, fromTerritory);

  if (forcesAvailable === 0) return [];

  const reachable = getReachableTerritories(state, fromTerritory, range, faction);

  for (const [territoryId, distance] of reachable) {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    if (!territory) continue;

    // Find a safe sector (fallback to first sector if all are in storm - pathfinding handles this)
    const safeSector = findSafeSector(state, territoryId) ?? territory.sectors[0];
    if (safeSector === undefined) continue;

    // Check occupancy for strongholds
    // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
    if (STRONGHOLD_TERRITORIES.includes(territoryId)) {
      const occupants = getFactionsOccupyingTerritory(state, territoryId);
      if (occupants.length >= 2 && !occupants.includes(faction)) continue;
    }

    suggestions.push({
      fromTerritory,
      fromSector,
      toTerritory: territoryId,
      toSector: safeSector,
      forceCount: forcesAvailable,
      pathLength: distance,
    });
  }

  // Sort by strategic value (strongholds first, then by distance)
  suggestions.sort((a, b) => {
    const aIsStronghold = STRONGHOLD_TERRITORIES.includes(a.toTerritory) ? 0 : 1;
    const bIsStronghold = STRONGHOLD_TERRITORIES.includes(b.toTerritory) ? 0 : 1;
    if (aIsStronghold !== bIsStronghold) return aIsStronghold - bIsStronghold;
    return a.pathLength - b.pathLength;
  });

  return suggestions.slice(0, 5);
}


/**
 * Get all territories within N distance of a starting territory (ignoring storm).
 * Used for Fremen special shipment validation.
 */
export function getTerritoriesWithinDistance(
  from: TerritoryId,
  distance: number
): Set<TerritoryId> {
  const reachable = new Set<TerritoryId>();
  const visited = new Set<TerritoryId>();
  const queue: { territory: TerritoryId; distance: number }[] = [
    { territory: from, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance > distance) continue;
    if (visited.has(current.territory)) continue;

    visited.add(current.territory);
    if (current.territory !== from) {
      reachable.add(current.territory);
    }

    const currentDef = TERRITORY_DEFINITIONS[current.territory];
    if (!currentDef) continue;

    for (const adjId of currentDef.adjacentTerritories) {
      if (!visited.has(adjId)) {
        queue.push({ territory: adjId, distance: current.distance + 1 });
      }
    }
  }

  return reachable;
}

// =============================================================================
// GUILD SPECIAL SHIPMENT VALIDATION
// =============================================================================

/**
 * Validate Guild cross-ship (territory to territory).
 * Rules: Ship from any territory to any other territory, half price based on destination.
 */
export function validateCrossShip(
  state: GameState,
  faction: Faction,
  fromTerritoryId: TerritoryId | string,
  fromSector: number,
  toTerritoryId: TerritoryId | string,
  toSector: number,
  forceCount: number
): ValidationResult<ShipmentSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  
  // Normalize territory IDs (case-insensitive)
  const normalizedFrom = normalizeTerritoryId(fromTerritoryId);
  const normalizedTo = normalizeTerritoryId(toTerritoryId);
  
  if (!normalizedFrom) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(fromTerritoryId).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `From territory "${fromTerritoryId}" does not exist.${suggestionText}`,
        { field: 'fromTerritoryId', actual: fromTerritoryId }
      )
    );
    return invalidResult(errors, {
      fromTerritory: String(fromTerritoryId),
      toTerritory: String(toTerritoryId),
      fromSector,
      toSector,
      requestedForces: forceCount,
      spiceAvailable: factionState.spice,
    });
  }
  
  if (!normalizedTo) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(toTerritoryId).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `To territory "${toTerritoryId}" does not exist.${suggestionText}`,
        { field: 'toTerritoryId', actual: toTerritoryId }
      )
    );
    return invalidResult(errors, {
      fromTerritory: normalizedFrom,
      toTerritory: String(toTerritoryId),
      fromSector,
      toSector,
      requestedForces: forceCount,
      spiceAvailable: factionState.spice,
    });
  }
  
  const fromTerritory = TERRITORY_DEFINITIONS[normalizedFrom];
  const toTerritory = TERRITORY_DEFINITIONS[normalizedTo];

  // Context for agent decision-making
  const context = {
    fromTerritory: normalizedFrom,
    toTerritory: normalizedTo,
    fromSector,
    toSector,
    requestedForces: forceCount,
    spiceAvailable: factionState.spice,
  };

  // Check: Only Guild or Guild's ally can cross-ship
  const ally = factionState.allyId;
  const isGuild = faction === Faction.SPACING_GUILD;
  const isGuildAlly = ally === Faction.SPACING_GUILD;

  if (!isGuild && !isGuildAlly) {
    errors.push(
      createError(
        'INVALID_FACTION',
        'Only Spacing Guild and their ally can use cross-ship',
        { suggestion: 'Use normal shipment instead' }
      )
    );
  }

  // Territories already validated above via normalization

  // Check: Valid sectors
  if (!fromTerritory.sectors.includes(fromSector) && fromTerritory.sectors.length > 0) {
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `Sector ${fromSector} is not part of ${fromTerritory.name}`,
        { field: 'fromSector', expected: fromTerritory.sectors }
      )
    );
  }

  if (!toTerritory.sectors.includes(toSector) && toTerritory.sectors.length > 0) {
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `Sector ${toSector} is not part of ${toTerritory.name}`,
        { field: 'toSector', expected: toTerritory.sectors }
      )
    );
  }

  // Check: Source sector not in storm (unless protected or Fremen)
  // Rule 1.06.03.05: Cannot move OUT OF storm sector (Fremen exception: Rule 2.04.17)
  const sourceStormError = validateSourceSectorNotInStorm(
    state,
    faction,
    normalizedFrom,
    fromSector
  );
  if (sourceStormError) {
    errors.push(sourceStormError);
  }

  // Check: Destination sector not in storm
  const destStormError = validateDestinationSectorNotInStorm(
    state,
    normalizedTo,
    toSector,
    'toSector',
    'cross-ship to'
  );
  if (destStormError) {
    errors.push(destStormError);
  }

  // Check: Sufficient forces in source territory
  const forcesAvailable = getForceCountInTerritory(state, faction, normalizedFrom);
  if (forceCount > forcesAvailable) {
    errors.push(
      createError(
        'INSUFFICIENT_FORCES',
        `Cannot cross-ship ${forceCount} forces, only ${forcesAvailable} available in ${fromTerritory.name}`,
        {
          field: 'forceCount',
          actual: forceCount,
          expected: `1-${forcesAvailable}`,
        }
      )
    );
  }

  // Check: Occupancy limit for destination stronghold
  // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
  if (STRONGHOLD_TERRITORIES.includes(normalizedTo)) {
    const occupants = getFactionsOccupyingTerritory(state, normalizedTo);
    if (occupants.length >= 2 && !occupants.includes(faction)) {
      errors.push(
        createError(
          'OCCUPANCY_LIMIT_EXCEEDED',
          `${toTerritory.name} already has 2 factions occupying it`,
          {
            field: 'toTerritoryId',
            actual: occupants,
            expected: 'Maximum 2 factions per stronghold',
          }
        )
      );
    }
  }

  // Check: Sufficient spice
  // Cross-ship costs based on destination (same as normal shipment)
  // Guild pays half price, Guild's ally also pays half price (ability 2.06.09)
  const paysHalfPrice = isGuild || isGuildAlly;
  const cost = paysHalfPrice
    ? calculateShipmentCost(normalizedTo, forceCount, Faction.SPACING_GUILD)
    : calculateShipmentCost(normalizedTo, forceCount, faction);

  if (factionState.spice < cost) {
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Cross-ship costs ${cost} spice but you only have ${factionState.spice}`,
        {
          field: 'forceCount',
          actual: cost,
          expected: `<= ${factionState.spice}`,
        }
      )
    );
  }

  // If valid, return success with context
  if (errors.length === 0) {
    return validResult({
      ...context,
      cost,
      isStronghold: STRONGHOLD_TERRITORIES.includes(normalizedTo),
    });
  }

  return invalidResult(errors, context);
}

/**
 * Validate Guild off-planet shipment (territory to reserves).
 * Rules: Ship from any territory back to reserves at retreat cost (1 spice per 2 forces).
 */
export function validateOffPlanetShipment(
  state: GameState,
  faction: Faction,
  fromTerritoryId: TerritoryId | string,
  fromSector: number,
  forceCount: number
): ValidationResult<{ cost: number; forcesAvailable: number }> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  
  // Normalize territory ID (case-insensitive)
  const normalizedFrom = normalizeTerritoryId(fromTerritoryId);
  if (!normalizedFrom) {
    const suggestions = getAllTerritoryIds()
      .filter(id => id.toLowerCase().includes(String(fromTerritoryId).toLowerCase()))
      .slice(0, 3)
      .map(id => `"${id}"`)
      .join(', ');
    const suggestionText = suggestions ? ` Did you mean: ${suggestions}?` : '';
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `From territory "${fromTerritoryId}" does not exist.${suggestionText}`,
        { field: 'fromTerritoryId', actual: fromTerritoryId }
      )
    );
    return invalidResult(errors, {
      fromTerritory: String(fromTerritoryId),
      fromSector,
      requestedForces: forceCount,
      spiceAvailable: factionState.spice,
    });
  }
  
  const fromTerritory = TERRITORY_DEFINITIONS[normalizedFrom];

  // Context for agent decision-making
  const context = {
    fromTerritory: normalizedFrom,
    fromSector,
    requestedForces: forceCount,
    spiceAvailable: factionState.spice,
  };

  // Check: Only Guild or Guild's ally can ship off-planet
  const ally = factionState.allyId;
  const isGuild = faction === Faction.SPACING_GUILD;
  const isGuildAlly = ally === Faction.SPACING_GUILD;

  if (!isGuild && !isGuildAlly) {
    errors.push(
      createError(
        'INVALID_FACTION',
        'Only Spacing Guild and their ally can ship forces off-planet',
        { suggestion: 'This ability is not available to your faction' }
      )
    );
  }

  // Territory already validated above via normalization

  // Check: Valid sector
  if (!fromTerritory.sectors.includes(fromSector) && fromTerritory.sectors.length > 0) {
    errors.push(
      createError(
        'INVALID_TERRITORY',
        `Sector ${fromSector} is not part of ${fromTerritory.name}`,
        { field: 'fromSector', expected: fromTerritory.sectors }
      )
    );
  }

  // Check: Sufficient forces in source territory
  const forcesAvailable = getForceCountInTerritory(state, faction, normalizedFrom);
  if (forceCount > forcesAvailable) {
    errors.push(
      createError(
        'INSUFFICIENT_FORCES',
        `Cannot ship ${forceCount} forces off-planet, only ${forcesAvailable} available in ${fromTerritory.name}`,
        {
          field: 'forceCount',
          actual: forceCount,
          expected: `1-${forcesAvailable}`,
        }
      )
    );
  }

  // Check: Sufficient spice
  // Retreat cost: 1 spice per 2 forces (rule 2.06.06.01 - "RETREAT CALCULATIONS")
  const cost = Math.ceil(forceCount / 2);

  if (factionState.spice < cost) {
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Off-planet shipment costs ${cost} spice but you only have ${factionState.spice}`,
        {
          field: 'forceCount',
          actual: cost,
          expected: `<= ${factionState.spice}`,
        }
      )
    );
  }

  // If valid, return success with context
  if (errors.length === 0) {
    return validResult({
      cost,
      forcesAvailable,
    });
  }

  return invalidResult(errors, context);
}
