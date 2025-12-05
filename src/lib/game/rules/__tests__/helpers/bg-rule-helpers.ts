/**
 * Bene Gesserit rule test helpers.
 * Specialized helpers for testing BG-specific movement rules.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { MovementTestStateBuilder } from './test-state-builder';

/**
 * Create state with BG advisors in territory
 */
export function createStateWithBGAdvisors(
  territory: TerritoryId,
  sector: number,
  advisorCount: number
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT])
    .withAdvancedRules(true)
    .withBGAdvisors(territory, sector, advisorCount)
    .build();
}

/**
 * Create state with BG fighters in territory
 */
export function createStateWithBGFighters(
  territory: TerritoryId,
  sector: number,
  fighterCount: number
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT])
    .withAdvancedRules(true)
    .withForce(Faction.BENE_GESSERIT, territory, sector, fighterCount)
    .build();
}

/**
 * Create state with BG mixed advisors and fighters
 */
export function createStateWithBGMixed(
  territory: TerritoryId,
  sector: number,
  advisors: number,
  fighters: number
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT])
    .withAdvancedRules(true)
    .withBGAdvisors(territory, sector, advisors)
    .withForce(Faction.BENE_GESSERIT, territory, sector, fighters)
    .build();
}

/**
 * Create state with BG advisors and ally in destination (for PEACETIME test)
 * Ally must be in destination territory to block ENLISTMENT
 */
export function createStateWithBGAdvisorsAndAllyInDestination(
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  advisorCount: number,
  allyFaction: Faction
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT, allyFaction])
    .withAdvancedRules(true)
    .withBGAdvisors(fromTerritory, fromSector, advisorCount)
    .withForce(allyFaction, toTerritory, toSector, 5) // Ally in destination
    .withAlliance(Faction.BENE_GESSERIT, allyFaction)
    .build();
}

/**
 * Create state with BG advisors in storm (for STORMED_IN test)
 */
export function createStateWithBGAdvisorsInStorm(
  territory: TerritoryId,
  sector: number,
  advisorCount: number
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT])
    .withAdvancedRules(true)
    .withBGAdvisors(territory, sector, advisorCount)
    .withStormSector(sector)
    .build();
}

/**
 * Create state with BG advisors moving to territory with fighters (ADAPTIVE FORCE)
 */
export function createStateWithBGAdvisorsMovingToFighters(
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  advisorCount: number,
  existingFighters: number
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT])
    .withAdvancedRules(true)
    .withBGAdvisors(fromTerritory, fromSector, advisorCount)
    .withForce(Faction.BENE_GESSERIT, toTerritory, toSector, existingFighters)
    .build();
}

/**
 * Create state with BG fighters moving to territory with advisors (ADAPTIVE FORCE)
 */
export function createStateWithBGFightersMovingToAdvisors(
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  fighterCount: number,
  existingAdvisors: number
): GameState {
  return MovementTestStateBuilder.create()
    .withFactions([Faction.BENE_GESSERIT])
    .withAdvancedRules(true)
    .withForce(Faction.BENE_GESSERIT, fromTerritory, fromSector, fighterCount)
    .withBGAdvisors(toTerritory, toSector, existingAdvisors)
    .build();
}

