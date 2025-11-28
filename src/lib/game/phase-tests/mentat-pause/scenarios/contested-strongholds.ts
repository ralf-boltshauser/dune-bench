/**
 * Contested Strongholds Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runMentatPauseScenario } from './base-scenario';

export async function testContestedStrongholdNoVictory() {
  console.log('  Testing: Contested Stronghold - No Victory');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    forces: [
      // Atreides in 3 strongholds, but one is contested
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Harkonnen also in Sietch Tabr (contested - no one controls it)
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 3 },
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Contested Stronghold - No Victory'
  );
}

export async function testAllianceVsSoloContested() {
  console.log('  Testing: Alliance vs Solo - Contested Stronghold');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    alliances: [[Faction.ATREIDES, Faction.FREMEN]],
    forces: [
      // Alliance in 3 strongholds
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.FREMEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Harkonnen also in Sietch Tabr (contested - alliance doesn't control it)
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 3 },
      // Alliance needs 4, but only has 2 uncontested
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Alliance vs Solo - Contested Stronghold'
  );
}

