/**
 * Guild cross-ship validation.
 * Validates shipping from any territory to any other territory.
 */

import { Faction, TerritoryId, STRONGHOLD_TERRITORIES, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionState, getForceCountInTerritory } from '@/lib/game/state';
import { validateSourceSectorNotInStorm, validateDestinationSectorNotInStorm } from '../../storm-validation';
import { validResult, invalidResult, type ValidationResult, type ShipmentSuggestion } from '../../types';
import { normalizeAndValidateTerritoryId } from '../shared/territory-normalize';
import { createError, createInsufficientForcesError, createInsufficientSpiceError } from '../shared/error-helpers';
import { validateSector } from '../territory-rules/validation';
import { canEnterStronghold } from '../territory-rules/occupancy';
import { calculateShipmentCost } from './cost-calculation';

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
  const { normalized: normalizedFrom, error: fromError } = normalizeAndValidateTerritoryId(
    fromTerritoryId,
    'fromTerritoryId'
  );
  
  if (!normalizedFrom || fromError) {
    return invalidResult(
      fromError ? [fromError] : [],
      {
        fromTerritory: String(fromTerritoryId),
        toTerritory: String(toTerritoryId),
        fromSector,
        toSector,
        requestedForces: forceCount,
        spiceAvailable: factionState.spice,
      }
    );
  }
  
  const { normalized: normalizedTo, error: toError } = normalizeAndValidateTerritoryId(
    toTerritoryId,
    'toTerritoryId'
  );
  
  if (!normalizedTo || toError) {
    return invalidResult(
      toError ? [toError] : [],
      {
        fromTerritory: normalizedFrom,
        toTerritory: String(toTerritoryId),
        fromSector,
        toSector,
        requestedForces: forceCount,
        spiceAvailable: factionState.spice,
      }
    );
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
  // @rule 2.06.10 ALLIANCE: Guild's ally may use the ability CROSS-SHIP
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

  // Check: Valid sectors
  const fromSectorValidation = validateSector(fromSector, normalizedFrom, 'fromSector');
  if (!fromSectorValidation.valid && fromSectorValidation.error) {
    errors.push(fromSectorValidation.error);
  }

  const toSectorValidation = validateSector(toSector, normalizedTo, 'toSector');
  if (!toSectorValidation.valid && toSectorValidation.error) {
    errors.push(toSectorValidation.error);
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
      createInsufficientForcesError(forceCount, forcesAvailable, fromTerritory.name, 'forceCount')
    );
  }

  // Check: Occupancy limit for destination stronghold
  const occupancyCheck = canEnterStronghold(state, normalizedTo, faction);
  if (!occupancyCheck.allowed && occupancyCheck.error) {
    errors.push(occupancyCheck.error);
  }

  // Check: Sufficient spice
  // Cross-ship costs based on destination (same as normal shipment)
  // @rule 2.06.06 HALF PRICE SHIPPING: Guild pays half price
  // @rule 2.06.09 ALLIANCE: Guild's ally also pays half price
  const paysHalfPrice = isGuild || isGuildAlly;
  const cost = paysHalfPrice
    ? calculateShipmentCost(normalizedTo, forceCount, Faction.SPACING_GUILD)
    : calculateShipmentCost(normalizedTo, forceCount, faction);

  if (factionState.spice < cost) {
    errors.push(createInsufficientSpiceError(cost, factionState.spice, 'forceCount'));
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

