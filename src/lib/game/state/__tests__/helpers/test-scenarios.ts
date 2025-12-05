/**
 * Test Scenario Builders
 * 
 * Reusable builders for complex test scenarios.
 * Reduces duplication and makes tests more readable.
 */

import type { GameState, TerritoryId } from '../../../types';
import { Faction, STRONGHOLD_TERRITORIES } from '../../../types';
import { buildTestState } from './test-state-builder';
import { getFactionsInTerritory } from '../../queries';

/**
 * Build state for testing stronghold occupancy violations.
 */
export function buildStrongholdOccupancyTest(
  territoryId: TerritoryId,
  existingFactions: Faction[],
  newFaction: Faction
): GameState {
  if (!STRONGHOLD_TERRITORIES.includes(territoryId)) {
    throw new Error(`${territoryId} is not a stronghold`);
  }

  if (existingFactions.length > 2) {
    throw new Error('Stronghold can only have max 2 factions');
  }

  let builder = buildTestState([...existingFactions, newFaction]);

  // Place forces for existing factions
  existingFactions.forEach((faction, index) => {
    builder = builder.withForces({
      faction,
      territory: territoryId,
      sector: index + 1,
      regular: 1,
    });
  });

  return builder.build();
}

/**
 * Build state for testing Bene Gesserit ENLISTMENT rule.
 */
export function buildENLISTMENTTest(
  fromTerritory: TerritoryId,
  toTerritory: TerritoryId,
  advisorCount: number,
  hasAlly: boolean,
  sectorInStorm: boolean
): GameState {
  const factions = [Faction.BENE_GESSERIT];
  if (hasAlly) {
    factions.push(Faction.ATREIDES);
  }

  let builder = buildTestState(factions)
    .withAdvisorsOnBoard(Faction.BENE_GESSERIT, fromTerritory, 1, advisorCount);

  if (hasAlly) {
    builder = builder
      .withAlliance(Faction.BENE_GESSERIT, Faction.ATREIDES)
      .withForces({
        faction: Faction.ATREIDES,
        territory: toTerritory,
        sector: 1,
        regular: 1,
      });
  }

  if (sectorInStorm) {
    builder = builder.withSectorInStorm(1); // Storm in destination sector
  }

  return builder.build();
}

/**
 * Build state for testing ADAPTIVE FORCE rule.
 */
export function buildADAPTIVEFORCETest(
  territoryId: TerritoryId,
  hasFighters: boolean,
  hasAdvisors: boolean,
  movingAdvisors: boolean,
  hasAlly: boolean,
  sectorInStorm: boolean
): GameState {
  const factions = [Faction.BENE_GESSERIT];
  if (hasAlly) {
    factions.push(Faction.ATREIDES);
  }

  let builder = buildTestState(factions);

  // Set up destination territory
  if (hasFighters) {
    builder = builder.withFightersOnBoard(Faction.BENE_GESSERIT, territoryId, 1, 2, 0);
  }
  if (hasAdvisors) {
    builder = builder.withAdvisorsOnBoard(Faction.BENE_GESSERIT, territoryId, 2, 2);
  }

  // Set up source territory with forces to move
  const sourceTerritory = TerritoryId.ARRAKEEN;
  if (movingAdvisors) {
    builder = builder.withAdvisorsOnBoard(Faction.BENE_GESSERIT, sourceTerritory, 1, 3);
  } else {
    builder = builder.withFightersOnBoard(Faction.BENE_GESSERIT, sourceTerritory, 1, 3, 0);
  }

  if (hasAlly) {
    builder = builder
      .withAlliance(Faction.BENE_GESSERIT, Faction.ATREIDES)
      .withForces({
        faction: Faction.ATREIDES,
        territory: territoryId,
        sector: 3,
        regular: 1,
      });
  }

  if (sectorInStorm) {
    builder = builder.withSectorInStorm(1); // Storm in destination sector
  }

  return builder.build();
}

/**
 * Build state for testing hand size limits.
 */
export function buildHandSizeTest(
  faction: Faction,
  currentHandSize: number,
  maxHandSize: number
): GameState {
  return buildTestState([faction])
    .withHandSize(faction, currentHandSize)
    .build();
}

/**
 * Build state for testing leader protection (ON_BOARD).
 */
export function buildLeaderProtectionTest(
  faction: Faction,
  leaderId: string,
  territoryId: TerritoryId
): GameState {
  return buildTestState([faction])
    .withLeaderOnBoard(faction, leaderId, territoryId)
    .withForces({
      faction,
      territory: territoryId,
      sector: 1,
      regular: 1,
    })
    .build();
}

/**
 * Build state for testing Harkonnen capture mechanics.
 */
export function buildCaptureTest(
  captor: Faction,
  victim: Faction,
  leaderId: string
): GameState {
  return buildTestState([captor, victim])
    .withLeaderInPool(victim, leaderId)
    .build();
}

/**
 * Build state for testing alliance constraint.
 */
export function buildAllianceConstraintTest(
  faction1: Faction,
  faction2: Faction,
  territoryId: TerritoryId
): GameState {
  return buildTestState([faction1, faction2])
    .withAlliance(faction1, faction2)
    .withForces({
      faction: faction1,
      territory: territoryId,
      sector: 1,
      regular: 3,
    })
    .withForces({
      faction: faction2,
      territory: territoryId,
      sector: 2,
      regular: 2,
    })
    .build();
}

