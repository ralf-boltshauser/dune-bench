/**
 * Guild off-planet shipment validation.
 * Validates shipping forces from territory back to reserves.
 */

import { Faction, TerritoryId, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionState, getForceCountInTerritory } from '@/lib/game/state';
import { validResult, invalidResult, type ValidationResult } from '../../types';
import { normalizeAndValidateTerritoryId } from '../shared/territory-normalize';
import { createError, createInsufficientForcesError, createInsufficientSpiceError } from '../shared/error-helpers';
import { validateSector } from '../territory-rules/validation';

/**
 * Validate Guild off-planet shipment (territory to reserves).
 * Rules: Ship from any territory back to reserves at retreat cost (1 spice per 2 forces).
 * @rule 2.06.07 RETREAT CALCULATIONS: The final price of Forces shipped back to reserves is 1 spice for every 2 Forces.
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
  const { normalized: normalizedFrom, error: territoryError } = normalizeAndValidateTerritoryId(
    fromTerritoryId,
    'fromTerritoryId'
  );
  
  if (!normalizedFrom || territoryError) {
    return invalidResult(
      territoryError ? [territoryError] : [],
      {
        fromTerritory: String(fromTerritoryId),
        fromSector,
        requestedForces: forceCount,
        spiceAvailable: factionState.spice,
      }
    );
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

  // Check: Valid sector
  const sectorValidation = validateSector(fromSector, normalizedFrom, 'fromSector');
  if (!sectorValidation.valid && sectorValidation.error) {
    errors.push(sectorValidation.error);
  }

  // Check: Sufficient forces in source territory
  const forcesAvailable = getForceCountInTerritory(state, faction, normalizedFrom);
  if (forceCount > forcesAvailable) {
    errors.push(
      createInsufficientForcesError(forceCount, forcesAvailable, fromTerritory.name, 'forceCount')
    );
  }

  // Check: Sufficient spice
  // Retreat cost: 1 spice per 2 forces (rule 2.06.07 - "RETREAT CALCULATIONS")
  const cost = Math.ceil(forceCount / 2);

  if (factionState.spice < cost) {
    errors.push(createInsufficientSpiceError(cost, factionState.spice, 'forceCount'));
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

