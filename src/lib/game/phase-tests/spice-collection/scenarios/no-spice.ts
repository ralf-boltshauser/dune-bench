/**
 * Scenario 6: No Spice Scenarios
 * 
 * Goal: Verify no collection events fire when no spice is available.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testNoSpice() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 6: No Spice Scenarios');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Atreides: 5 forces in Tuek's Sietch with 0 spice
      { faction: Faction.ATREIDES, territory: TerritoryId.TUEKS_SIETCH, sector: 15, regular: 5 },
      // Atreides: 2 forces in Hagga Basin with 6 spice (should collect)
      { faction: Faction.ATREIDES, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 2 },
      // Harkonnen: 3 forces in Rock Outcroppings with 0 spice
      { faction: Faction.HARKONNEN, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, regular: 3 },
    ],
    territorySpice: [
      { territory: TerritoryId.TUEKS_SIETCH, sector: 15, amount: 0 },
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 6 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, amount: 0 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
  });

  console.log('\nSetup:');
  console.log('- Atreides: 5 forces in Tuek\'s Sietch (sector 15) with 0 spice');
  console.log('- Atreides: 2 forces in Hagga Basin (sector 8) with 6 spice');
  console.log('- Harkonnen: 3 forces in Rock Outcroppings (sector 10) with 0 spice');
  console.log('\nExpected:');
  console.log('- Only 1 collection event (Hagga Basin)');
  console.log('- Atreides collects 4 spice from Hagga Basin (2 × 2)');
  console.log('- No collection from Tuek\'s Sietch or Rock Outcroppings (0 spice)');

  return await runSpiceCollectionScenario(state, 'no-spice');
}

