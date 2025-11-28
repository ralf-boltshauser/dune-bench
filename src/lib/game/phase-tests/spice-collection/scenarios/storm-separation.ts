/**
 * Scenario 10: Storm Separation
 * 
 * Goal: Test that forces cannot collect spice if separated by a storm sector.
 * 
 * Rule 1.01.04 OBSTRUCTION: Forces cannot interact if separated by a storm sector.
 * This applies to spice collection just like it applies to battles.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';
import { moveStorm } from '../../../state';

export async function testStormSeparation() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 10: Storm Separation');
  console.log('='.repeat(80));

  // Create state with storm separating forces from spice
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 2,
    forces: [
      // Atreides: Forces in Sihaya Ridge (sector 4)
      // Storm is in sector 5
      // Spice is in sector 7
      // Forces and spice are separated by storm sector 5
      { faction: Faction.ATREIDES, territory: TerritoryId.SIHAYA_RIDGE, sector: 4, regular: 5 },
      // Harkonnen: Forces in same sector as spice (sector 8) - should be able to collect
      { faction: Faction.HARKONNEN, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 3 },
    ],
    territorySpice: [
      // Spice in Sihaya Ridge sector 7 (separated from forces in sector 4 by storm in sector 5)
      { territory: TerritoryId.SIHAYA_RIDGE, sector: 7, amount: 15 },
      // Spice in Hagga Basin sector 8 (same as forces - should collect)
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 10 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
  });

  // Set storm to sector 5 (between forces in sector 4 and spice in sector 7)
  state = moveStorm(state, 5);

  console.log('\nSetup:');
  console.log('- Storm is in sector 5');
  console.log('- Atreides: 5 forces in Sihaya Ridge (sector 4)');
  console.log('- Spice: 15 spice in Sihaya Ridge (sector 7)');
  console.log('- Forces and spice are separated by storm sector 5');
  console.log('- Harkonnen: 3 forces in Hagga Basin (sector 8) with 10 spice in same sector');
  console.log('\nExpected:');
  console.log('- Atreides CANNOT collect spice (separated by storm sector 5)');
  console.log('- Harkonnen CAN collect spice (same sector, not separated)');
  console.log('- Harkonnen collects 6 spice (3 forces × 2 spice/force)');
  console.log('\nNote: This tests the obstruction rule - forces cannot interact with spice if separated by storm.');

  return await runSpiceCollectionScenario(state, 'storm-separation');
}

