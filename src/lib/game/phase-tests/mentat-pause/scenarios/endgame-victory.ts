/**
 * Endgame Default Victory Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { createEndgameState, createEndgameStateWithStormOrder } from '../helpers/test-helpers';
import { runMentatPauseScenario } from './base-scenario';

export async function testEndgameMostStrongholds() {
  console.log('  Testing: Endgame Default Victory - Most Strongholds');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.MENTAT_PAUSE,
    turn: 10, // Last turn
    forces: [
      // Atreides controls 2 strongholds (most)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      // Harkonnen controls 1 stronghold
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Emperor controls 0 strongholds
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 15],
      [Faction.EMPEROR, 20],
    ]),
  });

  return await runMentatPauseScenario(
    createEndgameState(state, 10),
    'Endgame Default Victory - Most Strongholds'
  );
}

export async function testEndgameSpiceTiebreaker() {
  console.log('  Testing: Endgame Default Victory - Spice Tiebreaker');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 10, // Last turn
    forces: [
      // Both control 2 strongholds (tied)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.HABBANYA_SIETCH, sector: 16, regular: 5 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 15], // More spice - should win
    ]),
  });

  return await runMentatPauseScenario(
    createEndgameState(state, 10),
    'Endgame Default Victory - Spice Tiebreaker'
  );
}

export async function testEndgameStormOrderTiebreaker() {
  console.log('  Testing: Endgame Default Victory - Storm Order Tiebreaker');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 10, // Last turn
    forces: [
      // Both control 2 strongholds (tied)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.HABBANYA_SIETCH, sector: 16, regular: 5 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10], // Same spice - tied
    ]),
  });

  return await runMentatPauseScenario(
    createEndgameStateWithStormOrder(
      state,
      [Faction.ATREIDES, Faction.HARKONNEN],
      10
    ),
    'Endgame Default Victory - Storm Order Tiebreaker'
  );
}

