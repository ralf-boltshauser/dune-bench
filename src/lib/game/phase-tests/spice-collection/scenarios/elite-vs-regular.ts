/**
 * Scenario 5: Elite vs Regular Forces
 * 
 * Goal: Verify elite and regular forces count equally for collection.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testEliteVsRegular() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 5: Elite vs Regular Forces');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.HARKONNEN, Faction.FREMEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Harkonnen: 2 regular + 3 elite = 5 total (has city bonus via Carthag)
      { faction: Faction.HARKONNEN, territory: TerritoryId.CARTHAG, sector: 5, regular: 2 }, // Gives city bonus
      { faction: Faction.HARKONNEN, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 2, elite: 3 },
      // Fremen: 4 elite forces (no city bonus)
      { faction: Faction.FREMEN, territory: TerritoryId.SOUTH_MESA, sector: 2, elite: 4 },
    ],
    territorySpice: [
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 20 },
      { territory: TerritoryId.SOUTH_MESA, sector: 2, amount: 12 },
    ],
    spice: new Map([
      [Faction.HARKONNEN, 10],
      [Faction.FREMEN, 5],
    ]),
  });

  console.log('\nSetup:');
  console.log('- Harkonnen: 2 regular + 3 elite = 5 total forces in Hagga Basin (sector 8) with 20 spice (has city bonus)');
  console.log('- Fremen: 4 elite forces in South Mesa (sector 2) with 12 spice (no city bonus)');
  console.log('\nExpected:');
  console.log('- Harkonnen collects 15 spice (5 forces × 3 spice/force) - elite and regular count equally');
  console.log('- Fremen collects 8 spice (4 forces × 2 spice/force) - elite counts same as regular');

  return await runSpiceCollectionScenario(state, 'elite-vs-regular');
}

