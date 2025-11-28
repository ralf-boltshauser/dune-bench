/**
 * Scenario 1: City Bonus Global Application
 * 
 * Goal: Verify that city bonus (Arrakeen/Carthag) applies to ALL collection,
 * not just in those cities.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testCityBonusGlobal() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 1: City Bonus Global Application');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Atreides: 5 forces in Arrakeen (gives city bonus), 3 forces in Hagga Basin
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 16, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 3 },
      // Harkonnen: 4 forces in Rock Outcroppings (no city bonus)
      { faction: Faction.HARKONNEN, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, regular: 4 },
    ],
    territorySpice: [
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 15 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, amount: 12 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
  });

  console.log('\nSetup:');
  console.log('- Atreides: 5 forces in Arrakeen (gives city bonus), 3 forces in Hagga Basin (sector 8) with 15 spice');
  console.log('- Harkonnen: 4 forces in Rock Outcroppings (sector 10) with 12 spice (no city bonus)');
  console.log('\nExpected:');
  console.log('- Atreides collects 9 spice from Hagga Basin (3 forces × 3 spice/force) - city bonus applies globally');
  console.log('- Harkonnen collects 8 spice from Rock Outcroppings (4 forces × 2 spice/force) - base rate');

  return await runSpiceCollectionScenario(state, 'city-bonus-global');
}

