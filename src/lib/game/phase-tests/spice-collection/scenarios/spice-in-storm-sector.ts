/**
 * Scenario 9: Spice in Storm Sector
 * 
 * Goal: Test if forces can collect spice when both forces and spice are in a storm sector.
 * 
 * Edge case: Forces on rock territories are protected from storm, so they can survive
 * in storm sectors. If spice is placed in a storm sector (e.g., after storm moves),
 * can those forces collect it?
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';
import { moveStorm } from '../../../state';

export async function testSpiceInStormSector() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 9: Spice in Storm Sector');
  console.log('='.repeat(80));

  // Create state with storm in a specific sector
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 2,
    forces: [
      // Atreides: Forces in Rock Outcroppings (rock territory - protected from storm)
      // in sector 10, which will be the storm sector
      { faction: Faction.ATREIDES, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, regular: 5 },
      // Harkonnen: Forces in Hagga Basin (sand territory) in sector 8 (not in storm)
      { faction: Faction.HARKONNEN, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 3 },
    ],
    territorySpice: [
      // Spice in Rock Outcroppings sector 10 (same as storm sector)
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, amount: 15 },
      // Spice in Hagga Basin sector 8 (not in storm)
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 10 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
  });

  // Set storm to sector 10 (where Atreides forces and spice are)
  state = moveStorm(state, 10);

  console.log('\nSetup:');
  console.log('- Storm is in sector 10');
  console.log('- Atreides: 5 forces in Rock Outcroppings (sector 10) with 15 spice - both in storm sector');
  console.log('- Harkonnen: 3 forces in Hagga Basin (sector 8) with 10 spice - not in storm');
  console.log('\nExpected:');
  console.log('- Atreides should be able to collect spice even though sector is in storm (rock territory is protected)');
  console.log('- Atreides collects 10 spice (5 forces × 2 spice/force)');
  console.log('- Harkonnen collects 6 spice (3 forces × 2 spice/force)');
  console.log('\nNote: This tests if the implementation correctly handles spice collection in storm sectors.');

  return await runSpiceCollectionScenario(state, 'spice-in-storm-sector');
}





