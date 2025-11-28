/**
 * Bribe Collection Test Scenarios
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runMentatPauseScenario } from './base-scenario';

export async function testBribeCollection() {
  console.log('  Testing: Bribe Collection');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.MENTAT_PAUSE,
    turn: 1,
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 15],
      [Faction.EMPEROR, 20],
    ]),
    bribes: new Map([
      [Faction.ATREIDES, 5],
      [Faction.HARKONNEN, 3],
      [Faction.EMPEROR, 7],
    ]),
  });

  return await runMentatPauseScenario(
    state,
    'Bribe Collection - Multiple Factions'
  );
}

