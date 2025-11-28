/**
 * Solo Stronghold Victory Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runMentatPauseScenario } from './base-scenario';

export async function testSoloVictory3Strongholds() {
  console.log('  Testing: Solo Victory - 3 Strongholds');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    forces: [
      // Atreides controls 3 strongholds (sole control)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Harkonnen has no forces (or in different territories)
      { faction: Faction.HARKONNEN, territory: TerritoryId.THE_GREAT_FLAT, sector: 0, regular: 5 },
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Solo Victory - 3 Strongholds'
  );
}

export async function testSoloVictoryExactly2Strongholds() {
  console.log('  Testing: Solo Victory - Exactly 2 Strongholds (No Victory)');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    forces: [
      // Atreides controls only 2 strongholds (not enough)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      // Harkonnen is in a non-stronghold territory (doesn't affect victory)
      { faction: Faction.HARKONNEN, territory: TerritoryId.THE_GREAT_FLAT, sector: 0, regular: 5 },
    ],
  });

  return await runMentatPauseScenario(
    state,
    'Solo Victory - Exactly 2 Strongholds (No Victory)'
  );
}

