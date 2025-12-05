/**
 * Main movement validation.
 * Validates moving forces between territories:
 * - How far you can move (base range vs. ornithopters)
 * - Whether a path exists that is not blocked by storm
 * - Storm / sector restrictions and stronghold occupancy limits
 *
 * @rule 1.06.05 FORCE MOVEMENT: Each player may Move, as a group, any number of their Forces from one Territory into one other Territory.
 * @rule 1.06.05.02 Forces are free to Move into, out of, or through any Territory occupied by any number of Forces with certain restrictions and additional movement advantage mentioned below.
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getForceCountInTerritory } from '@/lib/game/state';
import { validateSourceSectorNotInStorm, validateDestinationSectorNotInStorm } from '../../storm-validation';
import { validResult, invalidResult, createError, type ValidationResult, type MovementSuggestion } from '../../types';
import { normalizeAndValidateTerritoryId } from '../shared/territory-normalize';
import { createInsufficientForcesError } from '../shared/error-helpers';
import { validateSector } from '../territory-rules/validation';
import { canEnterStronghold } from '../territory-rules/occupancy';
import { checkOrnithopterAccess, getMovementRangeForFaction } from '../ornithopter';
import { findPath } from '../paths';
import { generateMovementSuggestions } from './suggestions';

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
  const { normalized: normalizedFrom, error: fromError } = normalizeAndValidateTerritoryId(
    fromTerritory,
    'fromTerritory'
  );
  
  if (!normalizedFrom || fromError) {
    return invalidResult(
      fromError ? [fromError] : [],
      {
        fromTerritory: String(fromTerritory),
        toTerritory: String(toTerritory),
        forcesAvailable: 0,
        requestedForces: forceCount,
        hasOrnithopters: false,
        movementRange: 1,
        stormSector: state.stormSector,
      }
    );
  }
  
  const { normalized: normalizedTo, error: toError } = normalizeAndValidateTerritoryId(
    toTerritory,
    'toTerritory'
  );
  
  if (!normalizedTo || toError) {
    return invalidResult(
      toError ? [toError] : [],
      {
        fromTerritory: normalizedFrom,
        toTerritory: String(toTerritory),
        forcesAvailable: 0,
        requestedForces: forceCount,
        hasOrnithopters: false,
        movementRange: 1,
        stormSector: state.stormSector,
      }
    );
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

  // @rule 1.06.08 Repositioning: A player may use their movement action to reposition their Forces to relocate to a different Sector within the same Territory. Storm limitations still apply.
  // Handle same-territory repositioning
  if (fromTerritory === toTerritory) {
    // Repositioning within same territory - no path needed
    // Only validate: different sectors, to-sector not in storm, sufficient forces

    if (fromSector === toSector) {
      errors.push(createError('INVALID_DESTINATION', 'Must specify different sector for repositioning'));
      return invalidResult(errors, context);
    }

    // Check: Sector is valid for territory
    const sectorValidation = validateSector(toSector, normalizedTo, 'toSector');
    if (!sectorValidation.valid && sectorValidation.error) {
      errors.push(sectorValidation.error);
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
        createInsufficientForcesError(forceCount, forcesAvailable, fromDef.name, 'forceCount')
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
      createInsufficientForcesError(forceCount, forcesAvailable, fromDef.name, 'forceCount')
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

  // @rule 1.06.05.09 Occupancy Limit: Like Shipment, Forces can not be moved into or through a Stronghold if Forces of two other players are already there.
  // Check: Occupancy limit for strongholds
  const occupancyCheck = canEnterStronghold(state, normalizedTo, faction);
  if (!occupancyCheck.allowed && occupancyCheck.error) {
    errors.push(occupancyCheck.error);
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

