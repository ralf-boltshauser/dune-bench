/**
 * Scenario 8: City Stronghold Collection
 * 
 * Goal: Test collection from Arrakeen and Carthag themselves.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testCityStrongholdCollection() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 8: City Stronghold Collection');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Atreides: 4 forces in Arrakeen with spice
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 16, regular: 4 },
      // Harkonnen: 3 forces in Carthag with spice
      { faction: Faction.HARKONNEN, territory: TerritoryId.CARTHAG, sector: 5, regular: 3 },
    ],
    territorySpice: [
      { territory: TerritoryId.ARRAKEEN, sector: 16, amount: 15 },
      { territory: TerritoryId.CARTHAG, sector: 5, amount: 12 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
  });

  console.log('\nSetup:');
  console.log('- Atreides: 4 forces in Arrakeen (sector 16) with 15 spice');
  console.log('- Harkonnen: 3 forces in Carthag (sector 5) with 12 spice');
  console.log('\nExpected:');
  console.log('- Atreides collects 12 spice (4 × 3) from Arrakeen - city bonus applies');
  console.log('- Harkonnen collects 9 spice (3 × 3) from Carthag - city bonus applies');
  console.log('- Both get city bonus because they\'re in the cities');

  return await runSpiceCollectionScenario(state, 'city-stronghold-collection');
}

