/**
 * Alliance Stronghold Victory Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runMentatPauseScenario } from './base-scenario';

export async function testAllianceVictory4Strongholds() {
  console.log('  Testing: Alliance Victory - 4 Strongholds');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    alliances: [[Faction.ATREIDES, Faction.FREMEN]],
    forces: [
      // Atreides controls 2 strongholds
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      // Fremen controls 2 strongholds
      { faction: Faction.FREMEN, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      { faction: Faction.FREMEN, territory: TerritoryId.HABBANYA_SIETCH, sector: 16, regular: 5 },
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Alliance Victory - 4 Strongholds'
  );
}

export async function testAllianceVictoryMixedControl() {
  console.log('  Testing: Alliance Victory - Mixed Control (3+1)');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    alliances: [[Faction.ATREIDES, Faction.FREMEN]],
    forces: [
      // Atreides controls 3 strongholds
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Fremen controls 1 stronghold
      { faction: Faction.FREMEN, territory: TerritoryId.HABBANYA_SIETCH, sector: 16, regular: 5 },
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Alliance Victory - Mixed Control (3+1)'
  );
}

