/**
 * Main shipment validation.
 * Validates shipping forces from reserves to a territory.
 */

import { Faction, TerritoryId, STRONGHOLD_TERRITORIES, TERRITORY_DEFINITIONS } from '@/lib/game/types';
import type { GameState } from '@/lib/game/types';
import { getFactionState, getReserveForceCount, getBGAdvisorsInTerritory } from '@/lib/game/state';
import { validateSectorNotInStorm } from '../../storm-validation';
import { validResult, invalidResult, type ValidationResult, type ShipmentSuggestion } from '../../types';
import { normalizeAndValidateTerritoryId } from '../shared/territory-normalize';
import { createError, createInsufficientReservesError, createInsufficientSpiceError } from '../shared/error-helpers';
import { validateSector } from '../territory-rules/validation';
import { canEnterStronghold } from '../territory-rules/occupancy';
import { calculateShipmentCost, calculateAffordableForces } from './cost-calculation';
import { generateShipmentSuggestions } from './suggestions';
import { findNearestSafeTerritory } from '../shared/suggestions';

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
  const { normalized: normalizedTerritoryId, error: territoryError } = normalizeAndValidateTerritoryId(
    territoryId,
    'territoryId'
  );
  
  if (!normalizedTerritoryId || territoryError) {
    return invalidResult(
      territoryError ? [territoryError] : [],
      { targetTerritory: String(territoryId), targetSector: sector }
    );
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

  // @rule 2.04.03 NATIVES: Fremen reserves are local (on Dune), not off-planet, and cannot use normal shipment
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
    errors.push(createInsufficientReservesError(forceCount, reserves));
  }

  // Check: Sector is valid for territory
  const sectorValidation = validateSector(sector, normalizedTerritoryId, 'sector');
  if (!sectorValidation.valid && sectorValidation.error) {
    errors.push(sectorValidation.error);
  }

  // @rule 1.06.03.04 RESTRICTION: No player may Ship into or out of a Sector in Storm.
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
  const occupancyCheck = canEnterStronghold(state, normalizedTerritoryId, faction);
  if (!occupancyCheck.allowed && occupancyCheck.error) {
    errors.push(occupancyCheck.error);
  }

  // @rule 2.02.13 FIGHTERS: When you use your normal shipment action Forces must be shipped as fighters. Fighters may not be shipped to Territories already occupied by Advisors.
  // Check: BG cannot ship fighters to territories with advisors (Rule 2.02.13)
  if (faction === Faction.BENE_GESSERIT && state.config.advancedRules) {
    const advisorsInTerritory = getBGAdvisorsInTerritory(state, normalizedTerritoryId);
    if (advisorsInTerritory > 0) {
      errors.push(
        createError(
          'CANNOT_SHIP_FIGHTERS_TO_ADVISORS',
          `Cannot ship fighters to ${territory.name} - you already have ${advisorsInTerritory} advisor(s) there (Rule 2.02.13)`,
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
    const suggestion = affordable > 0
      ? `Ship ${affordable} forces for ${calculateShipmentCost(normalizedTerritoryId, affordable, faction)} spice`
      : 'Not enough spice to ship';
    errors.push(createInsufficientSpiceError(cost, factionState.spice, 'forceCount', suggestion));
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

