/**
 * Multiple Winners Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { setStormOrder } from '../helpers/test-helpers';
import { runMentatPauseScenario } from './base-scenario';

export async function testMultipleWinnersStormOrder() {
  console.log('  Testing: Multiple Winners - Storm Order Resolution');
  
  // Create state with Atreides first in storm order, Harkonnen second
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.MENTAT_PAUSE,
    turn: 2,
    forces: [
      // Atreides controls 3 strongholds
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 9, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.CARTHAG, sector: 10, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SIETCH_TABR, sector: 13, regular: 5 },
      // Harkonnen controls 3 different strongholds (all 5 strongholds are used)
      { faction: Faction.HARKONNEN, territory: TerritoryId.HABBANYA_SIETCH, sector: 16, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.TUEKS_SIETCH, sector: 17, regular: 5 },
      // Emperor is in a non-stronghold territory (doesn't affect victory)
      { faction: Faction.EMPEROR, territory: TerritoryId.THE_GREAT_FLAT, sector: 0, regular: 5 },
    ],
  });

  return await runMentatPauseScenario(
    setStormOrder(state, [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]),
    'Multiple Winners - Storm Order Resolution'
  );
}

